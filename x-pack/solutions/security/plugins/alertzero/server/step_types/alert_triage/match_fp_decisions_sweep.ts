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
import { closeChunk } from './match_fp_decisions/close_chunk';
import { readDecisionStatus, type DecisionStatus } from './match_fp_decisions/decision_status';
import { findDecisionsWithConflictingVerdicts } from './match_fp_decisions/decisions_with_verdicts';
import { createNoteQueue } from './match_fp_decisions/note_queue';
import { tagSkippedChunk } from './match_fp_decisions/skip_chunk';
import { countClosedByDecision, tagAlerts } from './ports';

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

/** Splits a list into the chunks one tag, search or close call takes. */
const chunked = <T>(list: readonly T[], size: number = TAG_CHUNK_SIZE): T[][] =>
  Array.from({ length: Math.ceil(list.length / size) }, (_unused, index) =>
    list.slice(index * size, (index + 1) * size)
  );

/** What the closes of one decision have done so far. */
interface CloseProgress {
  /** Alerts a close confirmed as closed, and that the sweep has reconciled. */
  closedIds: string[];
  /**
   * Alerts of a close whose outcome is not known: it threw, or its follow-up read did, before the
   * sweep could tell which of them it closed. Empty once the sweep has reconciled the chunk.
   */
  unknownIds: string[];
  /** How many closes this decision added to the totals. */
  counted: number;
}

const closedTag = (id: string) => `${TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX}${id}`;

/**
 * The state and the writes of one match sweep: the totals, the decisions read so far, the daily
 * allowance left for each decision, and the note queue. The step handler reads the pages and the
 * matches, and hands each page's matches to `tag`, `tagSkipped` and `close`. Each of those goes
 * decision by decision.
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
  const adjustRoom = (id: string, by: number) => room.set(id, (room.get(id) ?? 0) + by);
  const decisionsById = new Map<string, StoredDecision>();
  const notes = createNoteQueue({
    limit: DECISION_NOTES_PER_SWEEP,
    decisionOf: (id) => decisionsById.get(id),
  });

  const outOfTime = () => {
    if (Date.now() <= workDeadline) return false;
    totals.out_of_time = true;
    return true;
  };

  /** Runs `handle` for each decision, and counts the ones the work budget has no time left for. */
  const eachDecision = async (
    byDecision: Map<string, string[]>,
    handle: (id: string, alertIds: string[]) => Promise<void>
  ) => {
    for (const [id, alertIds] of byDecision) {
      if (outOfTime()) {
        totals.deferred++;
        continue;
      }
      await handle(id, alertIds);
    }
  };

  /**
   * The alerts of the list that the note allowance has room for. A decision closes or skips only
   * as many alerts as there are notes left for: the rest stay untagged and take the normal path,
   * so this sweep's planner may send them to analysis, and a later sweep matches those it did not.
   */
  const withinNotes = (alertIds: string[]): string[] => {
    const allowed = notes.take(alertIds);
    totals.left_for_notes += alertIds.length - allowed.length;
    return allowed;
  };

  const queueNotes = (id: string, alertIds: string[], action: 'closed' | 'skipped') => {
    totals.notes_missing += notes.add(id, alertIds, action);
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
  const tag = (prefix: string, byDecision: Map<string, string[]>) =>
    eachDecision(byDecision, async (id, alertIds) => {
      try {
        await tagInChunks(write, { alertIds, add: [`${prefix}${id}`], remove: [] });
      } catch (error) {
        totals.tag_failures++;
        warn(`Could not tag the alerts of decision ${id}`, error);
      }
    });

  // --- Approved decisions: close the alerts ---

  /**
   * The decisions whose key has a true positive or inconclusive verdict. A verdict can be recorded
   * at any time, so only a positive answer is kept for the sweep: a decision that had none is read
   * again for each page, one search for all the decisions of the page that are not known to have
   * one. A decision that has one stays blocked for the sweep. The search stops at the work
   * deadline: the decisions it did not reach are deferred by the check that starts each decision.
   */
  const conflicting = new Set<string>();
  const loadConflicts = async (ids: string[]) => {
    const unknown = ids.filter((id) => !conflicting.has(id));
    const found = await findDecisionsWithConflictingVerdicts(contextManager, unknown, outOfTime);
    found.forEach((id) => conflicting.add(id));
  };

  /** A decision with a conflicting verdict closes nothing: its matches are tagged, as in shadow. */
  const blockByVerdict = async (id: string, alertIds: string[]) => {
    totals.blocked_by_verdict += alertIds.length;
    logger.info(`Decision ${id} has a conflicting verdict on its key: its matches go to analysis`);
    await tag(TRIAGE_WOULD_CLOSE_TAG_PREFIX, new Map([[id, alertIds]]));
  };

  /**
   * The alerts the decision may close now: the ones within what is left of today's cap (read once
   * per decision, from the alerts it closed in the last 24 hours) and within the note allowance.
   * When the count cannot be read this throws, because the cap could not be applied.
   */
  const closeAllowance = async (id: string, alertIds: string[]): Promise<string[]> => {
    if (!room.has(id)) {
      const closedToday = await countClosedByDecision(
        contextManager,
        id,
        now - DECISION_CAP_WINDOW_MS
      );
      room.set(id, Math.max(0, DECISION_DAILY_CLOSE_CAP - closedToday));
    }
    const withinCap = alertIds.slice(0, room.get(id));
    totals.capped += alertIds.length - withinCap.length;
    return withinNotes(withinCap);
  };

  /**
   * Closes the tagged alerts chunk by chunk, and records in `progress` what it did, as it goes, so
   * a chunk that fails does not lose the ones before it. Before each close the chunk's alerts go
   * to `unknownIds`, and they leave it once the chunk is reconciled: the ones that were closed move
   * to `closedIds`, and the ones an analyst moved on are released. A close that throws leaves them
   * in `unknownIds`. Returns whether a close timed out part way.
   */
  const closeAlerts = async (id: string, allowed: string[], progress: CloseProgress) => {
    let timedOut = false;
    for (const chunk of chunked(allowed)) {
      // The attempt counts against today's allowance before it is made: a close that fails half
      // way may have closed alerts, and the next page must not close another full allowance of the
      // same decision. A close that skipped alerts gives them back, unless it timed out, because
      // then it may have written more than it reports.
      const {
        attempted,
        updated,
        timedOut: chunkTimedOut,
      } = await closeChunk({
        api: contextManager,
        write,
        id,
        chunk,
        chargeAttempt: (alertIds) => {
          progress.unknownIds = alertIds;
          adjustRoom(id, -alertIds.length);
        },
      });
      totals.closed += updated;
      progress.counted += updated;
      if (chunkTimedOut) timedOut = true;
      else adjustRoom(id, attempted.length - updated);
      // The alerts a timed-out close did not reach are released like the ones an analyst moved on,
      // so the next sweep tries them again and only closed alerts get a note.
      const moved =
        updated < attempted.length
          ? await releaseMovedOn({ api: contextManager, write, id, alertIds: attempted })
          : [];
      progress.closedIds.push(...attempted.filter((alertId) => !moved.includes(alertId)));
      progress.unknownIds = [];
    }
    return timedOut;
  };

  /**
   * Takes the decision's tag off the alerts a failed close left open, so the next sweep tries them
   * again. Best effort: when this fails too, the alerts stay with analysis.
   */
  const untagAfterFailedClose = async (id: string, tagged: string[]) => {
    try {
      await untagStillOpen({ api: contextManager, write, id, alertIds: tagged });
    } catch (error) {
      warn(`Could not take the tag of decision ${id} off alerts that stayed open`, error);
    }
  };

  /**
   * Called after the closes: reads the decision again. If a revoke landed meanwhile, the closes
   * are undone: the alerts the sweep confirmed as closed, and the ones whose close is unknown. A
   * close that threw part way may have closed alerts it did not report, and when a revoke already
   * took the tags off, nothing else can find them. An alert the sweep reconciled as not closed by
   * it, because an analyst moved it on, is left alone. Only alerts that are still closed as a
   * false positive are reopened. Otherwise the closed alerts get their notes.
   */
  const settleClosed = async (id: string, tagged: string[], progress: CloseProgress) => {
    const { closedIds, unknownIds, counted } = progress;
    if ((await statusAfterWrite(id, 'closed its alerts')) !== 'gone') {
      if (closedIds.length > 0) queueNotes(id, closedIds, 'closed');
      return;
    }
    try {
      const reopened = await undoClosedAlerts({
        api: contextManager,
        write,
        id,
        tagged,
        closedIds: [...closedIds, ...unknownIds],
      });
      // The totals hold the closes of every decision. Take back at most what this decision added:
      // a close that threw may have closed alerts that were never counted.
      totals.closed -= Math.min(reopened, counted);
    } catch (error) {
      totals.close_failures++;
      warn(`Could not put back the alerts of decision ${id}; run the revoke again`, error);
    }
  };

  /**
   * Closes what one decision may still close today. The decision's tag goes on first, so a close
   * that lands is always findable by revoke. A failure takes the tag off the alerts that stayed
   * open. When the verdicts or the daily count cannot be read nothing is closed.
   */
  const closeDecision = async (id: string, alertIds: string[]) => {
    const progress: CloseProgress = { closedIds: [], unknownIds: [], counted: 0 };
    let tagged: string[] = [];
    try {
      if ((await statusOf(id)) !== 'active') {
        logger.info(`Decision ${id} was revoked or expired during the sweep: it closes nothing`);
        return;
      }
      if (conflicting.has(id)) return await blockByVerdict(id, alertIds);
      const allowed = await closeAllowance(id, alertIds);
      if (allowed.length === 0) return;
      tagged = allowed;
      await tagInChunks(write, { alertIds: allowed, add: [closedTag(id)], remove: [] });
      if (await closeAlerts(id, allowed, progress)) {
        totals.close_failures++;
        logger.warn(`Closing the alerts of decision ${id} timed out part way`);
      }
    } catch (error) {
      totals.close_failures++;
      warn(`Could not close the alerts of decision ${id}`, error);
      await untagAfterFailedClose(id, tagged);
    }
    // What a failed chunk had closed before it keeps its tag and gets its note.
    if (progress.closedIds.length + progress.unknownIds.length > 0) {
      await settleClosed(id, tagged, progress);
    }
  };

  /** Closes the alerts of each approved decision. Without the verdicts nothing is closed. */
  const close = async (byDecision: Map<string, string[]>) => {
    try {
      await loadConflicts([...byDecision.keys()]);
    } catch (error) {
      totals.close_failures++;
      warn('Could not read the verdicts of the decision keys; nothing is closed', error);
      return;
    }
    await eachDecision(byDecision, closeDecision);
  };

  // --- Dismissed decisions: keep the alerts out of analysis ---

  /**
   * Called after the skip tags were written: reads the decision again. If a revoke landed
   * meanwhile, the tags are taken off. Otherwise the alerts are counted and get their notes.
   */
  const settleSkipped = async (id: string, kept: string[], skipTags: string[]) => {
    if ((await statusAfterWrite(id, 'tagged its alerts')) !== 'gone') {
      totals.skipped += kept.length;
      queueNotes(id, kept, 'skipped');
      return;
    }
    try {
      await tagInChunks(write, { alertIds: kept, add: [], remove: skipTags });
    } catch (error) {
      totals.tag_failures++;
      warn(`Could not put back the alerts of decision ${id}; run the revoke again`, error);
    }
  };

  /** Keeps the open alerts of one dismissed pattern out of analysis, chunk by chunk. */
  const skipDecision = async (id: string, alertIds: string[]) => {
    const allowed = withinNotes(alertIds);
    if (allowed.length === 0) return;
    const skipTag = `${TRIAGE_SKIPPED_BY_DECISION_TAG_PREFIX}${id}`;
    const skipTags = [VERDICT_INCONCLUSIVE_TAG, skipTag];
    const kept: string[] = [];
    try {
      if ((await statusOf(id)) !== 'active') {
        logger.info(`Decision ${id} was revoked or expired during the sweep: it skips nothing`);
        return;
      }
      for (const chunk of chunked(allowed)) {
        kept.push(
          ...(await tagSkippedChunk({ api: contextManager, write, chunk, skipTags, skipTag, warn }))
        );
      }
    } catch (error) {
      totals.tag_failures++;
      warn(`Could not tag the alerts of decision ${id}`, error);
    }
    // What a failed chunk had tagged before it stays out of analysis and gets its note.
    if (kept.length > 0) await settleSkipped(id, kept, skipTags);
  };

  const tagSkipped = (byDecision: Map<string, string[]>) => eachDecision(byDecision, skipDecision);

  /** Writes the queued notes, and counts the ones that could not be written. */
  const flushNotes = async () => {
    totals.notes_missing += await notes.flush(contextManager, {
      concurrency: noteConcurrency,
      deadline: totalDeadline,
    });
  };

  return { totals, decisionsById, outOfTime, tag, tagSkipped, close, flushNotes };
};
