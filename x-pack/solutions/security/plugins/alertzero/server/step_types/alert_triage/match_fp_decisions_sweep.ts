/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  DECISION_CAP_WINDOW_MS,
  DECISION_DAILY_CLOSE_CAP,
  DECISION_NOTES_PER_SWEEP,
  VERDICT_INCONCLUSIVE_TAG,
  TAG_CHUNK_SIZE,
  TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX,
  TRIAGE_SKIPPED_BY_DECISION_TAG_PREFIX,
  TRIAGE_WOULD_CLOSE_TAG_PREFIX,
} from '../../alert_triage/constants';
import type { StoredDecision } from '../../alert_triage/fp_decisions';
import { tagInChunks } from '../../alert_triage/plan_sweep';
import {
  releaseMovedOn,
  undoClosedAlerts,
  untagStillOpen,
} from './match_fp_decisions/alert_releases';
import { readDecisionStatus, type DecisionStatus } from './match_fp_decisions/decision_status';
import { findDecisionsWithConflictingVerdicts } from './match_fp_decisions/decisions_with_verdicts';
import { noteText } from './match_fp_decisions/note_text';
import {
  closeStillOpenAlertsAsFalsePositive,
  countClosedByDecision,
  findAlertIdsWithTag,
  findStillOpenAlertIds,
  tagAlerts,
  writeAlertNotes,
} from './ports';

export const NOTHING = {
  candidates: 0,
  decisions_matched: 0,
  would_close: 0,
  would_skip: 0,
  closed: 0,
  skipped: 0,
  capped: 0,
  close_failures: 0,
  excluded_by_severity: 0,
  held_in_shadow: 0,
  tag_failures: 0,
  notes_missing: 0,
  left_for_notes: 0,
  blocked_by_verdict: 0,
  deferred: 0,
  out_of_time: false,
};

export type MatchTotals = typeof NOTHING;

type ContextManager = StepHandlerContext['contextManager'];
type StepLogger = StepHandlerContext['logger'];

interface DecisionSweepParams {
  contextManager: ContextManager;
  logger: StepLogger;
  now: number;
  /** After this no new decision is started and no new page is read. */
  workDeadline: number;
  /** After this no new note is started. */
  totalDeadline: number;
  noteConcurrency: number;
}

const warnWith = (logger: StepLogger) => (what: string, error: unknown) =>
  logger.warn(`${what}: ${error instanceof Error ? error.message : error}`);

/**
 * The state and the writes of one match sweep: the totals, the decisions read so far, the daily
 * allowance left for each decision, the note allowance, and the queue of notes. The step handler
 * reads the pages and the matches, and hands each page's matches to `tag`, `tagSkipped` and
 * `close`.
 */
export const createDecisionSweep = ({
  contextManager,
  logger,
  now,
  workDeadline,
  totalDeadline,
  noteConcurrency,
}: DecisionSweepParams) => {
  const write = tagAlerts(contextManager);
  const warn = warnWith(logger);
  const totals: MatchTotals = { ...NOTHING };
  /** Alerts each decision may still close today. Read once per decision, then counted down. */
  const room = new Map<string, number>();
  const decisionsById = new Map<string, StoredDecision>();
  let notesLeft = DECISION_NOTES_PER_SWEEP;

  const outOfTime = () => {
    if (Date.now() <= workDeadline) return false;
    totals.out_of_time = true;
    return true;
  };

  /**
   * Notes say on each alert why it was closed or kept out of analysis, so an analyst reading
   * the alert does not have to look the decision up. They are queued here and written once
   * for the whole step, in one pool: the notes route takes one note per call, so a pool per
   * decision would leave most decisions waiting on one call each. A decision closes or skips
   * only as many alerts as the sweep has notes left for: the rest stay untagged and take the
   * normal path, so this sweep's planner may send them to analysis, and a later sweep matches
   * those it did not. They are counted in `left_for_notes`. A note that cannot be
   * written never undoes the close: it is counted in `notes_missing`.
   */
  const noteJobs: Array<{ alertId: string; note: string }> = [];
  const queueNotes = (id: string, alertIds: string[], action: 'closed' | 'skipped') => {
    const decision = decisionsById.get(id);
    const allowed = decision === undefined ? [] : alertIds.slice(0, notesLeft);
    notesLeft -= allowed.length;
    if (decision !== undefined) {
      const note = noteText(decision, action);
      allowed.forEach((alertId) => noteJobs.push({ alertId, note }));
    }
    totals.notes_missing += alertIds.length - allowed.length;
  };

  /** The decision's status right now. A read that fails throws, so the caller acts on nothing. */
  const statusOf = (id: string): Promise<DecisionStatus> =>
    readDecisionStatus({ es: contextManager.getScopedEsClient(), id, now: Date.now() });

  /**
   * The status of the decision after the sweep wrote to its alerts, to learn whether a revoke
   * landed in between. Revoke deletes the decision first and then puts back the alerts that carry
   * its tag, so a write made after revoke looked for them would stay. Checking after the write
   * closes that gap: either the decision is still in force, and then the revoke has not deleted it
   * yet and will find these alerts, or it is gone, and the caller puts back what it wrote. A
   * decision that only lapsed (expired) keeps what it did while it was in force. A read that fails
   * counts as `active`: the tags stay, so running the revoke finds the alerts.
   */
  const statusAfterWrite = async (id: string, what: string): Promise<DecisionStatus> => {
    try {
      const status = await statusOf(id);
      if (status === 'gone') {
        logger.info(`Decision ${id} was revoked while the sweep ${what}: it is undone`);
      }
      return status;
    } catch (error) {
      warn(`Could not read decision ${id} again after the sweep ${what}`, error);
      return 'active';
    }
  };

  /** Tags the alerts of each decision. A decision that cannot be tagged is counted and skipped. */
  const tag = async (prefix: string, byDecision: Map<string, string[]>) => {
    for (const [id, alertIds] of byDecision) {
      if (outOfTime()) {
        totals.deferred++;
        continue;
      }
      try {
        await tagInChunks(write, { alertIds, add: [`${prefix}${id}`], remove: [] });
      } catch (error) {
        totals.tag_failures++;
        warn(`Could not tag the alerts of decision ${id}`, error);
      }
    }
  };

  /**
   * Whether the key of each decision has a true positive or inconclusive verdict. One search per
   * call covers every decision not read before, and the answer is kept for the rest of the sweep.
   */
  const conflicts = new Map<string, boolean>();
  const loadConflicts = async (ids: string[]) => {
    const unread = ids.filter((id) => !conflicts.has(id));
    if (unread.length === 0) return;
    const conflicting = await findDecisionsWithConflictingVerdicts(contextManager, unread);
    unread.forEach((id) => conflicts.set(id, conflicting.has(id)));
  };

  /**
   * Closes what each decision may still close today. The decision's tag goes on first, so a
   * close that lands is always findable by revoke. A failure takes the tag off the alerts that
   * stayed open, so the next sweep tries them again. When the daily count cannot be read nothing is
   * closed, because the cap could not be applied. When the verdicts cannot be read nothing is
   * closed either.
   *
   * A decision whose key has a true positive or inconclusive verdict closes nothing: its matches
   * are only tagged, as in shadow, and counted in `blocked_by_verdict`.
   *
   * Each chunk is narrowed to the alerts that are `open` just before the close, and the others lose
   * the tag, so a note and a count are only given to alerts the close itself closed. After the last
   * chunk the decision is read again: if a revoke landed meanwhile, the closes are undone.
   */
  const close = async (byDecision: Map<string, string[]>) => {
    try {
      await loadConflicts([...byDecision.keys()]);
    } catch (error) {
      totals.close_failures++;
      warn('Could not read the verdicts of the decision keys; nothing is closed', error);
      return;
    }
    for (const [id, alertIds] of byDecision) {
      if (outOfTime()) {
        totals.deferred++;
        continue;
      }
      let tagged: string[] = [];
      const closedIds: string[] = [];
      try {
        if ((await statusOf(id)) !== 'active') {
          logger.info(`Decision ${id} was revoked or expired during the sweep: it closes nothing`);
          continue;
        }
        if (conflicts.get(id) === true) {
          totals.blocked_by_verdict += alertIds.length;
          logger.info(
            `Decision ${id} has a conflicting verdict on its key: its matches go to analysis`
          );
          await tag(TRIAGE_WOULD_CLOSE_TAG_PREFIX, new Map([[id, alertIds]]));
          continue;
        }
        if (!room.has(id)) {
          room.set(
            id,
            Math.max(
              0,
              DECISION_DAILY_CLOSE_CAP -
                (await countClosedByDecision(contextManager, id, now - DECISION_CAP_WINDOW_MS))
            )
          );
        }
        const withinCap = alertIds.slice(0, room.get(id));
        totals.capped += alertIds.length - withinCap.length;
        const allowed = withinCap.slice(0, notesLeft);
        totals.left_for_notes += withinCap.length - allowed.length;
        if (allowed.length === 0) continue;
        tagged = allowed;
        await tagInChunks(write, {
          alertIds: allowed,
          add: [`${TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX}${id}`],
          remove: [],
        });
        let timedOut = false;
        for (let from = 0; from < allowed.length; from += TAG_CHUNK_SIZE) {
          const chunk = allowed.slice(from, from + TAG_CHUNK_SIZE);
          // An alert an analyst moved on before the close is let go here, and is not part of the
          // attempt: the close would leave it alone, and it must get neither a note nor a count.
          const closing = await findStillOpenAlertIds(contextManager, chunk);
          const movedEarly = chunk.filter((alertId) => !closing.includes(alertId));
          if (movedEarly.length > 0) {
            await tagInChunks(write, {
              alertIds: movedEarly,
              add: [],
              remove: [`${TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX}${id}`],
            });
          }
          if (closing.length === 0) continue;
          // The attempt counts against today's allowance before it is made: a close that
          // fails half way may have closed alerts, and the next page must not close another
          // full allowance of the same decision. A close that skipped alerts gives them back,
          // unless it timed out, because then it may have written more than it reports.
          room.set(id, (room.get(id) ?? 0) - closing.length);
          const { updated, timedOut: chunkTimedOut } = await closeStillOpenAlertsAsFalsePositive(
            contextManager,
            closing
          );
          totals.closed += updated;
          if (chunkTimedOut) timedOut = true;
          else room.set(id, (room.get(id) ?? 0) + closing.length - updated);
          // The alerts a timed-out close did not reach are released like the ones an analyst
          // moved on, so the next sweep tries them again and only closed alerts get a note.
          const moved =
            updated < closing.length
              ? await releaseMovedOn({ api: contextManager, write, id, alertIds: closing })
              : [];
          closedIds.push(...closing.filter((alertId) => !moved.includes(alertId)));
        }
        if (timedOut) {
          totals.close_failures++;
          logger.warn(`Closing the alerts of decision ${id} timed out part way`);
        }
      } catch (error) {
        totals.close_failures++;
        warn(`Could not close the alerts of decision ${id}`, error);
        try {
          await untagStillOpen({ api: contextManager, write, id, alertIds: tagged });
        } catch (untagError) {
          warn(`Could not take the tag of decision ${id} off alerts that stayed open`, untagError);
        }
      }
      if (closedIds.length === 0) continue;
      // What a failed chunk had closed before it keeps its tag and gets its note.
      if ((await statusAfterWrite(id, 'closed its alerts')) === 'gone') {
        try {
          totals.closed -= await undoClosedAlerts({
            api: contextManager,
            write,
            id,
            tagged,
            closedIds,
          });
        } catch (error) {
          totals.close_failures++;
          warn(`Could not put back the alerts of decision ${id}; run the revoke again`, error);
        }
        continue;
      }
      queueNotes(id, closedIds, 'closed');
    }
  };

  /**
   * Keeps the alerts of each dismissed pattern out of analysis. The tags route takes ids only, so
   * the open-status guard of the close cannot be part of the write: each chunk is narrowed to the
   * alerts that are `open` just before the write, and the alerts that an analyst moved on within
   * the window lose the tags again just after it. After the last chunk the decision is read again:
   * if a revoke landed meanwhile, the tags are taken off.
   */
  const tagSkipped = async (byDecision: Map<string, string[]>) => {
    for (const [id, alertIds] of byDecision) {
      if (outOfTime()) {
        totals.deferred++;
        continue;
      }
      const allowed = alertIds.slice(0, notesLeft);
      totals.left_for_notes += alertIds.length - allowed.length;
      if (allowed.length === 0) continue;
      const skipTag = `${TRIAGE_SKIPPED_BY_DECISION_TAG_PREFIX}${id}`;
      const skipTags = [VERDICT_INCONCLUSIVE_TAG, skipTag];
      let skipping: string[] = [];
      const skippedIds: string[] = [];
      try {
        if ((await statusOf(id)) !== 'active') {
          logger.info(`Decision ${id} was revoked or expired during the sweep: it skips nothing`);
          continue;
        }
        for (let from = 0; from < allowed.length; from += TAG_CHUNK_SIZE) {
          skipping = await findStillOpenAlertIds(
            contextManager,
            allowed.slice(from, from + TAG_CHUNK_SIZE)
          );
          if (skipping.length === 0) continue;
          await write({ alertIds: skipping, add: skipTags, remove: [] });
          // An analyst may have moved an alert on between the check and the write: it must not
          // stay out of analysis, so it loses the tags again and is not counted.
          const stillOpen = new Set(await findStillOpenAlertIds(contextManager, skipping));
          const movedOn = skipping.filter((alertId) => !stillOpen.has(alertId));
          if (movedOn.length > 0) await write({ alertIds: movedOn, add: [], remove: skipTags });
          skippedIds.push(...skipping.filter((alertId) => stillOpen.has(alertId)));
          skipping = [];
        }
      } catch (error) {
        totals.tag_failures++;
        warn(`Could not tag the alerts of decision ${id}`, error);
        // The failed chunk may be tagged in part. Only alerts that carry this decision's skip
        // tag lose the tags, so a verdict another writer gave in the meantime stays. They go
        // back to analysis, and the next sweep tries them again.
        if (skipping.length > 0) {
          try {
            const tagged = await findAlertIdsWithTag(contextManager, skipping, skipTag);
            if (tagged.length > 0) await write({ alertIds: tagged, add: [], remove: skipTags });
          } catch (untagError) {
            warn(`Could not take the tags of decision ${id} off a failed chunk`, untagError);
          }
        }
      }
      if (skippedIds.length === 0) continue;
      // What a failed chunk had tagged before it stays out of analysis and gets its note.
      if ((await statusAfterWrite(id, 'tagged its alerts')) === 'gone') {
        try {
          await tagInChunks(write, { alertIds: skippedIds, add: [], remove: skipTags });
        } catch (error) {
          totals.tag_failures++;
          warn(`Could not put back the alerts of decision ${id}; run the revoke again`, error);
        }
        continue;
      }
      totals.skipped += skippedIds.length;
      queueNotes(id, skippedIds, 'skipped');
    }
  };

  /** Writes the queued notes, and counts the ones that could not be written. */
  const flushNotes = async () => {
    totals.notes_missing += await writeAlertNotes(contextManager, noteJobs, {
      concurrency: noteConcurrency,
      deadline: totalDeadline,
    });
  };

  return { totals, decisionsById, outOfTime, tag, tagSkipped, close, flushNotes };
};
