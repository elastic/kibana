/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalVerdict } from '@kbn/significant-events-schema';
import { classifyBatch, type ClassifyBatchParams } from './classify_batch';
import type { ClassifyDetectionsOutput } from './classify_output';
import type { LiveRuleMembership } from '../lib/significant_events/events/rule_events_client';

export const COLUMNS = [
  'rule_uuid',
  '_source',
  'score',
  'recent_detection_count',
  'flaky_probe',
  'held_back',
  'last_reviewed_at',
  'oldest_unprocessed',
];
export const STORED_QUERY = 'FROM $.a | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';

export const NOW = Date.parse('2026-10-19T12:00:00.000Z');
export const HOUR_MS = 3_600_000;
export const hoursAgo = (hours: number) => new Date(NOW - hours * HOUR_MS).toISOString();

export const detectionRow = (
  ruleUuid: string,
  {
    sourceId,
    flaky = false,
    heldBack = false,
    reviewedAt = null,
    detectedAt = new Date(NOW - 10_000).toISOString(),
    oldestUnprocessed = detectedAt,
  }: {
    sourceId?: string;
    /** The flaky-rule probe flagged the rule. */
    flaky?: boolean;
    heldBack?: boolean;
    reviewedAt?: string | null;
    /** When the detection fired: a moment ago, after any review. */
    detectedAt?: string;
    /** When the rule's oldest unprocessed detection fired; the detection's own time by default, null for an unreadable cell. */
    oldestUnprocessed?: string | null;
  } = {}
) => [
  ruleUuid,
  {
    '@timestamp': detectedAt,
    detection_id: `${ruleUuid}-detection`,
    rule_uuid: ruleUuid,
    ...(sourceId ? { source_id: sourceId } : {}),
  },
  70,
  1,
  flaky,
  heldBack,
  reviewedAt,
  oldestUnprocessed,
];

/** A detection the flaky-rule gate held back. */
export const heldRow = (
  ruleUuid: string,
  options: { sourceId?: string; reviewedAt?: string } = {}
) => detectionRow(ruleUuid, { ...options, heldBack: true });

export const membership = (
  verdict: SignalVerdict,
  esqlQuery: string | undefined = STORED_QUERY
): LiveRuleMembership => ({
  eventId: 'event-1',
  status: 'active',
  verdict,
  esqlQuery,
  evidenceFound: verdict === 'confirms',
  createdAt: new Date(NOW - HOUR_MS).toISOString(),
  verifiedAt: undefined,
  sourceIds: ['logs.checkout'],
  eventTitle: 'Checkout — request failures',
});

/** A live series with a verdict made at `verifiedAt`, on a series opened two days ago. */
export const verdictBy = (
  verdict: SignalVerdict,
  verifiedAt: string | undefined,
  eventId = 'event-1'
): LiveRuleMembership => ({
  ...membership(verdict),
  eventId,
  verifiedAt,
  createdAt: hoursAgo(48),
});

/** A rule that recorded its newest breach `minutes` ago. */
export const breachedMinutesAgo =
  (minutes: number) =>
  async (ruleUuids: string[]): Promise<Map<string, number>> =>
    new Map(ruleUuids.map((ruleUuid) => [ruleUuid, NOW - minutes * 60_000]));

/** Rules that recorded no breach: they matched nothing, or did not run. */
export const noBreaches = async (): Promise<Map<string, number>> => new Map();

export const membersOf = (entries: Record<string, LiveRuleMembership[]>) =>
  new Map(Object.entries(entries));

export type BatchOverrides = Partial<ClassifyBatchParams> & {
  findLiveMembers?: (ruleUuids: string[]) => Promise<Map<string, LiveRuleMembership[]>>;
};

export const batchParams = ({
  findLiveMembers = async () => new Map(),
  ...overrides
}: BatchOverrides = {}): ClassifyBatchParams => ({
  rows: [],
  columns: COLUMNS,
  maxSkipAgeMs: 24 * HOUR_MS,
  reviewFreshMs: 4 * HOUR_MS,
  batchMax: 100,
  now: NOW,
  findLiveMemberships: findLiveMembers,
  // By default every rule is breaching now; a test about a quiet rule passes `noBreaches`.
  findRecentBreaches: async (ruleUuids) => breachedMinutesAgo(1)(ruleUuids),
  ...overrides,
});

/** What the classifier decided per rule, read from what it skips and what it hands the agent. */
export const decided = (output: ClassifyDetectionsOutput) => ({
  ...Object.fromEntries(
    output.skips.map(({ rule_uuid: id, skip }) => [id, { decision: 'skip', ...skip }])
  ),
  ...Object.fromEntries(
    output.batch.flatMap(({ rule_uuid: id, classifier }) =>
      id && classifier ? [[id, { decision: 'needs_agent', ...classifier }]] : []
    )
  ),
});

export const agentBatchOf = (output: ClassifyDetectionsOutput) =>
  output.batch.map(({ rule_uuid: id }) => id);

/**
 * Classifies one detection of `rule-A`: in the given live series (one confirming series by
 * default), and with the agent's last review.
 */
export const classifyRule = async ({
  memberships = [membership('confirms')],
  reviewedAt,
  detectedAt,
  heldBack = false,
  ...overrides
}: Omit<BatchOverrides, 'findLiveMembers' | 'rows'> & {
  memberships?: LiveRuleMembership[];
  reviewedAt?: string;
  detectedAt?: string;
  heldBack?: boolean;
} = {}) => {
  const output = await classifyBatch(
    batchParams({
      rows: [detectionRow('rule-A', { reviewedAt, heldBack, detectedAt })],
      findLiveMembers: async () => membersOf({ 'rule-A': memberships }),
      // A lone detection is not held for waiting: the decision itself is what these tests read. The
      // hold has its own tests, and a held-back row keeps the window its tests rely on.
      ...(heldBack ? {} : { reviewFreshMs: 0 }),
      ...overrides,
    })
  );
  return { output, decision: decided(output)['rule-A'] };
};
