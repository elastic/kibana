/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * What the classifier hands on: the output schema, the outcome of each row and how the outcomes sum
 * up into the step's output (the agent's entries, the skip markers, the counts).
 */

import { countBy } from 'lodash';
import {
  MAX_ID_LENGTH,
  skipMarkerSchema,
  type NeedsAgentReason,
  type SkipMarker,
  type SkipReason,
} from '@kbn/significant-events-schema';
import { lazySchema, z } from '@kbn/zod/v4';
import { batchEntrySchema, isHeldBack, toBatchEntry, type BatchEntry } from './detection_batch';
import type { LiveRuleMembership } from '../lib/significant_events/events/rule_events_client';
import type { RowDecision } from './classify_decide_row';

export const MAX_INPUT_ROWS = 1_000;

const countsSchema = lazySchema(() => z.record(z.string().max(64), z.number().int().min(0)));

export const outputSchema = lazySchema(() =>
  z.object({
    /** The detections the agent reads, by field name: only the `needs_agent` ones. */
    batch: z.array(batchEntrySchema).max(MAX_INPUT_ROWS),
    /** Rules whose detections are stamped processed. */
    skipped_rule_uuids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_INPUT_ROWS),
    /** Why each skipped rule was skipped, in the shape a processed marker stores. */
    skips: z
      .array(z.object({ rule_uuid: z.string().max(MAX_ID_LENGTH), skip: skipMarkerSchema }))
      .max(MAX_INPUT_ROWS),
    /** Number of detections in `batch`; a numeric field so workflows can tell an empty batch from a missing output. */
    row_count: z.number().int().min(0),
    skipped_count: z.number().int().min(0),
    /**
     * Detections the classifier would have sent to the agent but holds: a flaky rule's change, or a
     * detection that waits for a run with a change. They stay pending.
     */
    held_back_count: z.number().int().min(0),
    needs_agent_count: z.number().int().min(0),
    reason_counts: countsSchema,
    /** The decisions on `flaky_probe` rows of rules already in a live event, skips included. */
    flaky_live_reason_counts: countsSchema,
    /**
     * The skipped detections the classifier judged. A rule's older unprocessed detections are
     * stamped with them; a newer one, which the classifier never saw, is not.
     */
    skipped_detection_ids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_INPUT_ROWS),
    /** The classification itself failed: `batch` holds every row the agent may read, unjudged. */
    failed: z.boolean(),
  })
);

export type ClassifyDetectionsOutput = z.infer<typeof outputSchema>;

/**
 * The detection as the agent reads it, with why it reached the agent and where its rule sits. Nothing
 * is measured here (no match counts, trend or baseline): the agent measures those itself, in grounding.
 */
export const toAgentEntry = ({
  entry,
  reason,
  breached,
  series,
}: {
  entry: BatchEntry;
  reason: NeedsAgentReason;
  /** Whether the rule recorded a breach in its last runs. */
  breached: boolean;
  series: readonly LiveRuleMembership[];
}): BatchEntry => ({
  ...entry,
  classifier: {
    reason,
    rule_breached: breached,
    live_events: series.map(({ eventId, status, verdict, evidenceFound }) => ({
      ...(eventId ? { event_id: eventId } : {}),
      status,
      stored_verdict: verdict,
      ...(verdict === 'refutes' ? { evidence_found: evidenceFound } : {}),
    })),
  },
});

/** Why the classifier skipped the rule, in the shape a processed marker stores. */
export const toSkipMarker = ({
  decision,
  member,
  breached,
  windowMinutes,
}: {
  decision: Extract<RowDecision, { decision: 'skip' }>;
  member: LiveRuleMembership;
  /** Whether the rule recorded a breach in the last `windowMinutes`. */
  breached: boolean;
  windowMinutes: number;
}): SkipMarker => {
  if (member.eventId === undefined) {
    // `reconcileSkip` sends a skip to the agent unless its live series names the event it rests on.
    throw new Error('The skip names no live event.');
  }
  return {
    reason: decision.reason,
    rule_breached: breached,
    breach_window_minutes: windowMinutes,
    event_id: member.eventId,
    ...(member.eventTitle ? { event_title: member.eventTitle } : {}),
    stored_verdict: member.verdict,
  };
};

/**
 * What became of one row. A row with no rule goes on untouched (`passthrough`) or stays pending
 * (`held`); every other row either reaches the agent or is skipped, with the reason it was decided on.
 */
export type RowOutcome =
  | { kind: 'held' }
  | { kind: 'passthrough'; entry: BatchEntry }
  | {
      kind: 'agent';
      entry: BatchEntry;
      reason: NeedsAgentReason;
      isFlakyLive: boolean;
      /** When the rule's oldest unprocessed detection fired, if known: how long a waiting row has waited. */
      waitingSince?: number;
    }
  | {
      kind: 'skip';
      ruleUuid: string;
      detectionId: string | undefined;
      skip: SkipMarker;
      reason: SkipReason;
      isFlakyLive: boolean;
    };

/** The step's output from the outcomes of its rows, in the order of the rows. */
export const summarizeOutcomes = (outcomes: readonly RowOutcome[]): ClassifyDetectionsOutput => {
  const decided = outcomes.flatMap((outcome) =>
    outcome.kind === 'agent' || outcome.kind === 'skip' ? [outcome] : []
  );
  const skips = decided.flatMap((outcome) => (outcome.kind === 'skip' ? [outcome] : []));
  const batch = outcomes.flatMap((outcome) =>
    outcome.kind === 'agent' || outcome.kind === 'passthrough' ? [outcome.entry] : []
  );
  return {
    batch,
    row_count: batch.length,
    skipped_rule_uuids: [...new Set(skips.map(({ ruleUuid }) => ruleUuid))],
    skips: skips.map(({ ruleUuid, skip }) => ({ rule_uuid: ruleUuid, skip })),
    skipped_count: skips.length,
    held_back_count: outcomes.filter(({ kind }) => kind === 'held').length,
    needs_agent_count: decided.length - skips.length,
    reason_counts: countBy(decided.map(({ reason }) => reason)),
    // The decisions on flaky rules already in a live event, which used to go to the agent unjudged.
    flaky_live_reason_counts: countBy(
      decided.filter(({ isFlakyLive }) => isFlakyLive).map(({ reason }) => reason)
    ),
    skipped_detection_ids: skips.flatMap(({ detectionId }) =>
      detectionId === undefined ? [] : [detectionId]
    ),
    failed: false,
  };
};

/**
 * What a failed classification hands on: every row the agent may read, unjudged, exactly as it would
 * have read them without a classifier, up to `batchMax`. The rows the flaky-rule gate held back, and
 * the rows past the cap, stay pending.
 */
export const failOpen = ({
  rows,
  columns,
  batchMax,
}: {
  rows: ReadonlyArray<readonly unknown[]>;
  columns: readonly string[];
  batchMax: number;
}): ClassifyDetectionsOutput => {
  const open = rows.filter((row) => !isHeldBack({ columns, row })).slice(0, batchMax);
  return {
    batch: open.map((row) => toBatchEntry({ columns, row })),
    skipped_rule_uuids: [],
    skips: [],
    row_count: open.length,
    skipped_count: 0,
    held_back_count: rows.length - open.length,
    needs_agent_count: open.length,
    reason_counts: {},
    flaky_live_reason_counts: {},
    skipped_detection_ids: [],
    failed: true,
  };
};
