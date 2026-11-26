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
  TRIAGE_WOULD_CLOSE_TAG_PREFIX,
  closedByDecisionTag,
  skippedByDecisionTag,
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
import { countClosedByDecision, findAlertsClosedAsFalsePositive, tagAlerts } from './ports';

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
  unsettled_decisions: 0,
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
  /**
   * How many of the `unknownIds` the close route said it closed. It is `undefined` when the close
   * itself threw, because then nothing is known about them.
   */
  unknownReported: number | undefined;
  /** How many closes this decision added to the totals. */
  counted: number;
}

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
  /**
   * Counts that are about decisions count each decision once for the whole sweep, whatever the
   * number of pages, phases or steps in which it fails.
   */
  const countOncePerDecision = (
    counter: 'close_failures' | 'tag_failures' | 'unsettled_decisions' | 'deferred'
  ) => {
    const seen = new Set<string>();
    return (id: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      totals[counter]++;
    };
  };
  const countCloseFailure = countOncePerDecision('close_failures');
  const countTagFailure = countOncePerDecision('tag_failures');
  const countUnsettled = countOncePerDecision('unsettled_decisions');
  const countDeferred = countOncePerDecision('deferred');
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
        countDeferred(id);
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
   * answers `unknown` and the decision is counted in `unsettled_decisions`: the sweep leaves the
   * alerts as they are, and nothing checks again. A revoke that already ran would find only the
   * alerts that still carry the tag.
   */
  const statusAfterWrite = async (
    id: string,
    what: string
  ): Promise<DecisionStatus | 'unknown'> => {
    try {
      const status = await statusOf(id);
      if (status === 'gone') {
        logger.info(`Decision ${id} was revoked while the sweep ${what}: it is undone`);
      }
      return status;
    } catch (error) {
      warn(
        `Could not read decision ${id} again after the sweep ${what}; if it was revoked, run the revoke again. An alert that no longer carries the decision tag needs a manual review`,
        error
      );
      countUnsettled(id);
      return 'unknown';
    }
  };

  /** Tags the alerts of one decision. A decision that cannot be tagged is counted. */
  const tagDecision = async (prefix: string, id: string, alertIds: string[]) => {
    try {
      await tagInChunks(write, { alertIds, add: [`${prefix}${id}`], remove: [] });
    } catch (error) {
      countTagFailure(id);
      warn(`Could not tag the alerts of decision ${id}`, error);
    }
  };

  /** Tags the alerts of each decision, as far as the work deadline allows. */
  const tag = (prefix: string, byDecision: Map<string, string[]>) =>
    eachDecision(byDecision, (id, alertIds) => tagDecision(prefix, id, alertIds));

  // --- Approved decisions: close the alerts ---

  /**
   * The decisions whose key has a verdict against a false positive (`findKeyTagsWithVerdicts`
   * says which verdicts count). A verdict can be recorded at any time, so the decision's key is
   * read right before its close, and only a positive answer is kept: a decision that had none is
   * read again the next time it would close. A decision that has one stays blocked for the sweep.
   * A read that fails throws, so the caller closes nothing.
   */
  const conflicting = new Set<string>();
  const hasConflictingVerdict = async (id: string): Promise<boolean> => {
    if (!conflicting.has(id)) {
      // No deadline here: a lookup cut short finds nothing, which would read as "no verdict".
      const found = await findDecisionsWithConflictingVerdicts(contextManager, [id]);
      found.forEach((foundId) => conflicting.add(foundId));
    }
    return conflicting.has(id);
  };

  /** A decision with a conflicting verdict closes nothing: its matches are tagged, as in shadow. */
  const blockByVerdict = async (id: string, alertIds: string[]) => {
    totals.blocked_by_verdict += alertIds.length;
    // At debug: a blocked decision is seen again by every sweep until its verdict goes away, and
    // `blocked_by_verdict` already counts it.
    logger.debug(`Decision ${id} has a conflicting verdict on its key: its matches go to analysis`);
    // Not through `tag`: the decision passed the deadline check that started it, and a second check
    // here would count a decision that is already counted as blocked as deferred, with no tag.
    await tagDecision(TRIAGE_WOULD_CLOSE_TAG_PREFIX, id, alertIds);
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
    // shortcut: after a chunk times out, the next chunks are still closed, although more closes
    // against a slow cluster may not help. The daily cap equals the chunk size, so a decision has
    // one chunk per page and this does not happen. If the cap grows past the chunk size, stop
    // after a timed-out chunk and take the tag off the chunks not reached: they are tagged but
    // still open.
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
          progress.unknownReported = undefined;
          adjustRoom(id, -alertIds.length);
        },
      });
      progress.unknownReported = updated;
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
      progress.unknownReported = undefined;
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
   * Which of the alerts of a close whose outcome is unknown were closed by this sweep, so that they
   * get their notes. Only alerts that still carry the decision's tag count: the cleanup after a
   * failed close took it off the alerts that stayed open, so an alert that an analyst closed since
   * is not credited to the sweep. When that cannot be read, the alerts with no note are the ones
   * the close route said it closed, which is known when the close returned. Only when the close
   * itself threw, all the alerts of the chunk count. `closed` is not changed: it counts what the
   * close route reported.
   */
  const closedAmong = async (id: string, progress: CloseProgress): Promise<string[]> => {
    const { unknownIds, unknownReported } = progress;
    if (unknownIds.length === 0) return [];
    try {
      const found = await findAlertsClosedAsFalsePositive(
        contextManager,
        unknownIds,
        closedByDecisionTag(id)
      );
      // A closed alert that lost the decision tag is not found, but the route counted its close.
      totals.notes_missing += Math.max(0, (unknownReported ?? 0) - found.length);
      return found;
    } catch (error) {
      totals.notes_missing += unknownReported ?? unknownIds.length;
      warn('Could not read which alerts of a failed close were closed; they get no note', error);
      return [];
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
      const noted = [...closedIds, ...(await closedAmong(id, progress))];
      if (noted.length > 0) queueNotes(id, noted, 'closed');
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
      countUnsettled(id);
      warn(
        `Could not put back the alerts of decision ${id}; run the revoke again. An alert that no longer carries the decision tag needs a manual review`,
        error
      );
    }
  };

  /**
   * Closes what one decision may still close today. The decision's tag goes on first, so a close
   * that lands is always findable by revoke. A failure takes the tag off the alerts that stayed
   * open. When the verdicts or the daily count cannot be read nothing is closed.
   */
  const closeDecision = async (id: string, alertIds: string[]) => {
    // shortcut: with no note left nothing can be closed, so the decision is not read, and a
    // decision revoked or newly blocked during the sweep is then counted in `left_for_notes` too.
    // A decision known to be blocked needs no note, so its matches are still tagged.
    if (!conflicting.has(id) && notes.take(alertIds).length === 0) {
      totals.left_for_notes += alertIds.length;
      return;
    }
    const progress: CloseProgress = {
      closedIds: [],
      unknownIds: [],
      unknownReported: undefined,
      counted: 0,
    };
    let tagged: string[] = [];
    try {
      if ((await statusOf(id)) !== 'active') {
        logger.debug(`Decision ${id} was revoked or expired during the sweep: it closes nothing`);
        return;
      }
      if (await hasConflictingVerdict(id)) return await blockByVerdict(id, alertIds);
      // The reads can pass the work deadline, and the notes are written in what is left of the
      // total budget, so no close starts after it.
      if (outOfTime()) return countDeferred(id);
      const allowed = await closeAllowance(id, alertIds);
      if (allowed.length === 0) return;
      tagged = allowed;
      await tagInChunks(write, { alertIds: allowed, add: [closedByDecisionTag(id)], remove: [] });
      if (await closeAlerts(id, allowed, progress)) {
        countCloseFailure(id);
        logger.warn(`Closing the alerts of decision ${id} timed out part way`);
      }
    } catch (error) {
      countCloseFailure(id);
      warn(`Could not close the alerts of decision ${id}`, error);
      await untagAfterFailedClose(id, tagged);
    }
    // What a failed chunk had closed before it keeps its tag and gets its note.
    if (progress.closedIds.length + progress.unknownIds.length > 0) {
      await settleClosed(id, tagged, progress);
    }
  };

  /** Closes the alerts of each approved decision, as far as the work deadline allows. */
  const close = (byDecision: Map<string, string[]>) => eachDecision(byDecision, closeDecision);

  /**
   * Shadow: tags the matches of each approved decision, and counts in `blocked_by_verdict` the ones
   * that `on` would not close because of a verdict, so shadow shows what `on` would do. Nothing is
   * closed, so one lookup per page is fresh enough. A lookup that fails throws, so the page fails
   * and the step reports it, instead of a count that looks like no verdicts.
   */
  const tagWouldClose = async (byDecision: Map<string, string[]>) => {
    const unread = [...byDecision.keys()].filter((id) => !conflicting.has(id));
    if (unread.length > 0 && !outOfTime()) {
      const found = await findDecisionsWithConflictingVerdicts(contextManager, unread);
      found.forEach((id) => conflicting.add(id));
    }
    await eachDecision(byDecision, async (id, alertIds) => {
      if (conflicting.has(id)) totals.blocked_by_verdict += alertIds.length;
      await tagDecision(TRIAGE_WOULD_CLOSE_TAG_PREFIX, id, alertIds);
    });
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
      countUnsettled(id);
      warn(
        `Could not put back the alerts of decision ${id}; run the revoke again. An alert that no longer carries the decision tag needs a manual review`,
        error
      );
    }
  };

  /** Keeps the open alerts of one dismissed pattern out of analysis, chunk by chunk. */
  const skipDecision = async (id: string, alertIds: string[]) => {
    // shortcut: with no note left nothing can be skipped, so the status is not read, and a
    // dismissal revoked during the sweep is then counted in `left_for_notes` too. Read the statuses
    // in one batch if that count must be exact.
    if (notes.take(alertIds).length === 0) {
      totals.left_for_notes += alertIds.length;
      return;
    }
    const skipTag = skippedByDecisionTag(id);
    const skipTags = [VERDICT_INCONCLUSIVE_TAG, skipTag];
    const kept: string[] = [];
    try {
      if ((await statusOf(id)) !== 'active') {
        logger.debug(`Decision ${id} was revoked or expired during the sweep: it skips nothing`);
        return;
      }
      const allowed = withinNotes(alertIds);
      for (const chunk of chunked(allowed)) {
        kept.push(
          ...(await tagSkippedChunk({ api: contextManager, write, chunk, skipTags, skipTag, warn }))
        );
      }
    } catch (error) {
      countTagFailure(id);
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

  return { totals, decisionsById, outOfTime, tag, tagWouldClose, tagSkipped, close, flushNotes };
};
