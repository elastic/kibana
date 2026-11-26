/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Classifies a batch of detection rows: reads the live events and the recorded breaches of their
 * rules, decides each row into an outcome and sums the outcomes up.
 */

import {
  isHeldBack,
  lastReviewedAt,
  oldestUnprocessedAt,
  toBatchEntry,
  type BatchEntry,
} from './detection_batch';
import { METRIC_SERIES_CADENCE_MINUTES } from '../lib/significant_events/rules/metric_series_contract';
import type { LiveRuleMembership } from '../lib/significant_events/events/rule_events_client';
import {
  MAX_CLASSIFIED_ROWS,
  canWait,
  decideRow,
  isInLiveEvent,
  staysHeldBack,
  type RowContext,
} from './classify_decide_row';
import { dropSupersededMemberships, findJoinedSeries } from './classify_memberships';
import {
  summarizeOutcomes,
  toAgentEntry,
  toSkipMarker,
  type ClassifyDetectionsOutput,
  type RowOutcome,
} from './classify_output';

/**
 * How far back a recorded breach says a rule's query returns rows now. A rule runs its query every
 * cadence and records a breach when it matches: two cadences back, one missed run does not read as a
 * change.
 */
export const BREACH_WINDOW_MINUTES = 2 * METRIC_SERIES_CADENCE_MINUTES;

export interface ClassifyBatchParams {
  /** A row with `held_back` set is classified like any other, but never handed to the agent. */
  rows: ReadonlyArray<readonly unknown[]>;
  /** The names of the row columns, in order. */
  columns: readonly string[];
  /** A skip is withdrawn when the last look at its rule (verdict or review) is older than this. */
  maxSkipAgeMs: number;
  /** The clock the ages are read against. */
  now: number;
  /**
   * How long the gate keeps a detection from the agent: a held-back rule's change after a review that
   * covers it, and a detection that shows no change until a run has one.
   */
  reviewFreshMs: number;
  /** The most rows handed to the agent in one run: the rest of the rows wait for a later run. */
  batchMax: number;
  /** The live series each rule is in. Called once. */
  findLiveMemberships: (ruleUuids: string[]) => Promise<Map<string, LiveRuleMembership[]>>;
  /**
   * When each rule last recorded a breach at or after `from`, as epoch milliseconds: the rule's
   * own run found rows. A rule it does not name matched nothing, or did not run — the two are the
   * same input, so a stopped rule reads as quiet. Called once.
   */
  findRecentBreaches: (ruleUuids: string[], from: string) => Promise<Map<string, number>>;
}

/** One detection row with what `classifyBatch` knows of it before it decides. */
interface ClassifiableRow {
  entry: BatchEntry;
  /** Where the row sits in the original rows, which the row cap counts. */
  index: number;
  heldBack: boolean;
  /** The agent's last review of the row's rule, read from the last row of that rule. */
  reviewedAt: number | undefined;
  /** When the rule's oldest unprocessed detection fired: the clock a waiting row is held on. */
  waitingSince: number | undefined;
}

/** Decides one row into its outcome: the agent, a skip, or still held back. */
const decideOutcome = ({
  row,
  memberships,
  breachedRuleUuids,
  context,
}: {
  row: ClassifiableRow;
  memberships: ReadonlyMap<string, readonly LiveRuleMembership[]>;
  breachedRuleUuids: ReadonlySet<string>;
  context: RowContext;
}): RowOutcome => {
  const { entry, index, heldBack, reviewedAt, waitingSince } = row;
  const { rule_uuid: ruleUuid, detection_id: detectionId } = entry;
  if (!ruleUuid) {
    return heldBack ? { kind: 'held', reason: 'flaky_rule' } : { kind: 'passthrough', entry };
  }
  const breached = breachedRuleUuids.has(ruleUuid);
  const series = memberships.get(ruleUuid) ?? [];
  const decision = decideRow({
    entry,
    index,
    memberships: series,
    breached,
    reviewedAt,
    context,
  });
  if (heldBack && staysHeldBack({ decision, entry, reviewedAt, ...context })) {
    return { kind: 'held', reason: 'flaky_rule' };
  }
  const isFlakyLive = entry.flaky_probe === true && isInLiveEvent(series);
  if (decision.decision === 'needs_agent') {
    return {
      kind: 'agent',
      entry: toAgentEntry({ entry, reason: decision.reason, breached, series }),
      reason: decision.reason,
      isFlakyLive,
      waitingSince,
    };
  }
  return {
    kind: 'skip',
    ruleUuid,
    detectionId,
    skip: toSkipMarker({
      decision,
      member: series[0],
      breached,
      windowMinutes: BREACH_WINDOW_MINUTES,
    }),
    reason: decision.reason,
    isFlakyLive,
  };
};

const isWaiting = (outcome: RowOutcome): outcome is Extract<RowOutcome, { kind: 'agent' }> =>
  outcome.kind === 'agent' && canWait(outcome.reason);

const isForAgent = (outcome: RowOutcome): boolean =>
  outcome.kind === 'agent' || outcome.kind === 'passthrough';

/**
 * Whether a waiting row has waited out the hold. The wait runs from the rule's oldest unprocessed
 * detection. A missing or unreadable time is not young: the row goes to the agent, rather than
 * restarting the wait from the rule's newest detection, which a rule that keeps firing renews every run.
 */
const hasWaitedHold = ({
  outcome: { waitingSince },
  now,
  holdMs,
}: {
  outcome: Extract<RowOutcome, { kind: 'agent' }>;
  now: number;
  holdMs: number;
}): boolean => {
  const since = waitingSince ?? Number.NaN;
  return !Number.isFinite(since) || since > now || now - since >= holdMs;
};

/**
 * At most `batchMax` rows go to the agent; the rest stay pending, unstamped, for a later run. Rows that
 * show a change, and waiting rows that have waited out the hold, come before waiting rows that have
 * not, so waiting rows released with a change cannot take its place, and a waiting row cannot be
 * passed over for ever. Within a group the rows keep their order, which is their score.
 */
const capBatch = ({
  outcomes,
  batchMax,
  now,
  holdMs,
}: {
  outcomes: readonly RowOutcome[];
  batchMax: number;
  now: number;
  holdMs: number;
}): readonly RowOutcome[] => {
  const forAgent = outcomes.filter(isForAgent);
  const isYoungWaiting = (outcome: RowOutcome) =>
    isWaiting(outcome) && !hasWaitedHold({ outcome, now, holdMs });
  const kept = new Set(
    [
      ...forAgent.filter((outcome) => !isYoungWaiting(outcome)),
      ...forAgent.filter(isYoungWaiting),
    ].slice(0, batchMax)
  );
  return outcomes.map((outcome) =>
    isForAgent(outcome) && !kept.has(outcome) ? { kind: 'held', reason: 'batch_cap' } : outcome
  );
};

/**
 * A run with nothing but waiting detections is not worth an agent call: they stay pending, unstamped,
 * until a run has a detection that shows a change, or one of them has waited `holdMs`. A row that
 * cannot be read counts as a change, so the agent still sees it.
 */
const holdWaiting = ({
  outcomes,
  now,
  holdMs,
}: {
  outcomes: readonly RowOutcome[];
  now: number;
  holdMs: number;
}): readonly RowOutcome[] => {
  const waiting = outcomes.filter(isWaiting);
  const hasChange = outcomes.some((outcome) => isForAgent(outcome) && !isWaiting(outcome));
  if (hasChange || waiting.some((outcome) => hasWaitedHold({ outcome, now, holdMs }))) {
    return outcomes;
  }
  return outcomes.map((outcome) =>
    isWaiting(outcome) ? { kind: 'held', reason: outcome.reason } : outcome
  );
};

/**
 * Decides, per detection row, whether the discovery agent needs to see it: rows classified `skip`
 * are dropped. Rows that cannot be read, or fall beyond `MAX_CLASSIFIED_ROWS`, are kept for the agent,
 * unless the batch limit holds them for a later run.
 */
export const classifyBatch = async ({
  rows,
  columns,
  maxSkipAgeMs,
  now,
  reviewFreshMs,
  batchMax,
  findLiveMemberships,
  findRecentBreaches,
}: ClassifyBatchParams): Promise<ClassifyDetectionsOutput> => {
  const entries = rows.map((row) => toBatchEntry({ columns, row }));
  // One review per rule: the last row of the rule wins.
  const reviews = new Map<string, number | undefined>();
  entries.forEach(({ rule_uuid: ruleUuid }, index) => {
    if (ruleUuid) {
      const reviewedAt = lastReviewedAt({ columns, row: rows[index] });
      reviews.set(ruleUuid, reviewedAt);
    }
  });
  const classifiableRows: ClassifiableRow[] = entries.map((entry, index) => ({
    entry,
    index,
    heldBack: isHeldBack({ columns, row: rows[index] }),
    reviewedAt: entry.rule_uuid ? reviews.get(entry.rule_uuid) : undefined,
    waitingSince: oldestUnprocessedAt({ columns, row: rows[index] }),
  }));
  const classifiable = classifiableRows.flatMap((row) =>
    row.entry.rule_uuid && row.index < MAX_CLASSIFIED_ROWS
      ? [{ ruleUuid: row.entry.rule_uuid, sourceId: row.entry.source_id, row }]
      : []
  );
  const ruleUuids = [...new Set(classifiable.map(({ ruleUuid }) => ruleUuid))];
  const memberships = new Map(
    [...(await findLiveMemberships(ruleUuids)).entries()].map(([ruleUuid, series]) => [
      ruleUuid,
      dropSupersededMemberships({ memberships: series, now }),
    ])
  );
  const breachSince = now - BREACH_WINDOW_MINUTES * 60_000;
  const breachedRuleUuids = new Set(
    [
      ...(await findRecentBreaches(ruleUuids, new Date(breachSince).toISOString())).entries(),
    ].flatMap(([ruleUuid, breachedAt]) => (breachedAt >= breachSince ? [ruleUuid] : []))
  );
  const context: RowContext = {
    maxSkipAgeMs,
    now,
    reviewFreshMs,
    // A held-back detection does not withdraw anyone's skip: it is not on its way to the agent.
    joiningEventIds: findJoinedSeries({
      detections: classifiable.filter(({ row }) => !row.heldBack),
      memberships,
    }),
  };

  const held = holdWaiting({
    outcomes: classifiableRows.map((row) =>
      decideOutcome({ row, memberships, breachedRuleUuids, context })
    ),
    now,
    holdMs: reviewFreshMs,
  });
  return summarizeOutcomes(capBatch({ outcomes: held, batchMax, now, holdMs: reviewFreshMs }));
};
