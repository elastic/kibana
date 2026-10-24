/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { detectionSkipSchema, type SignalVerdict } from '@kbn/significant-events-schema';
import {
  MAX_CLASSIFIED_ROWS,
  classifyBatch,
  classifyDetectionsStepDefinition,
  probeSpanInBuckets,
  type ClassifyBatchParams,
  type ClassifyDetectionsOutput,
} from './classify_detections';
import type { LiveRuleMembership } from '../lib/significant_events/events/rule_events_client';
import { checkBaseline } from '../lib/significant_events/rules/baseline';
import type { ProbeResult } from '../lib/significant_events/rules/run_probe';

const COLUMNS = [
  'rule_uuid',
  '_source',
  'score',
  'recent_detection_count',
  'flaky_probe',
  'held_back',
  'last_reviewed_at',
];
const STORED_QUERY = 'FROM $.a | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';

const NOW = Date.parse('2026-10-19T12:00:00.000Z');
const HOUR_MS = 3_600_000;
/** The default series bucket, as the step input gives it. */
const BUCKET_MS = 5 * 60_000;
/** The latest complete bucket when the classifier runs at NOW. */
const LATEST_START = NOW - BUCKET_MS;

const hoursAgo = (hours: number) => new Date(NOW - hours * HOUR_MS).toISOString();
const repeat = (length: number, value: number): number[] => Array<number>(length).fill(value);
const FLAT = repeat(61, 5);

const detectionRow = (
  ruleUuid: string,
  {
    sourceId,
    heldBack = false,
    reviewedAt = null,
    detectedAt = new Date(NOW - 10_000).toISOString(),
  }: {
    sourceId?: string;
    heldBack?: boolean;
    reviewedAt?: string | null;
    /** When the detection fired: a moment ago, after any review. */
    detectedAt?: string;
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
  false,
  heldBack,
  reviewedAt,
];

/** A detection the flaky-rule gate held back. */
const heldRow = (ruleUuid: string, options: { sourceId?: string; reviewedAt?: string } = {}) =>
  detectionRow(ruleUuid, { ...options, heldBack: true });

/** A rule's match series ending at the latest complete bucket, observed as the step observes it. */
const observedSeries = (counts: number[]) => ({
  observation: checkBaseline({ value: counts[counts.length - 1], history: counts.slice(0, -1) }),
  series: {
    firstStart: LATEST_START - (counts.length - 1) * BUCKET_MS,
    bucketMs: BUCKET_MS,
    counts,
  },
});
/** A time inside bucket `index` of a series of `length` buckets. */
const isoOfBucket = (length: number, index: number) =>
  new Date(LATEST_START - (length - 1 - index) * BUCKET_MS + 60_000).toISOString();

const membership = (
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
const verdictBy = (
  verdict: SignalVerdict,
  verifiedAt: string | undefined,
  eventId = 'event-1'
): LiveRuleMembership => ({
  ...membership(verdict),
  eventId,
  verifiedAt,
  createdAt: hoursAgo(48),
});

const probeResult = (status: ProbeResult['status'], hasRows: boolean): ProbeResult => ({
  status,
  hasRows,
  durationMs: 7,
});

const membersOf = (entries: Record<string, LiveRuleMembership[]>) =>
  new Map(Object.entries(entries));

type BatchOverrides = Partial<ClassifyBatchParams> & {
  findLiveMembers?: (ruleUuids: string[]) => Promise<Map<string, LiveRuleMembership[]>>;
};

const batchParams = ({
  findLiveMembers = async () => new Map(),
  ...overrides
}: BatchOverrides = {}): ClassifyBatchParams => ({
  rows: [],
  columns: COLUMNS,
  maxSkipAgeMs: 24 * HOUR_MS,
  probeWindowMinutes: 20,
  probeSpanBuckets: 4,
  reviewFreshMs: 4 * HOUR_MS,
  now: NOW,
  probeConcurrency: 5,
  findLiveMemberships: findLiveMembers,
  probe: jest.fn(async () => probeResult('ok', true)),
  observe: jest.fn(async () => undefined),
  ...overrides,
});

/** What the classifier decided per rule, read from what it skips and what it hands the agent. */
const decided = (output: ClassifyDetectionsOutput) => ({
  ...Object.fromEntries(
    output.skips.map(({ rule_uuid: id, skip }) => [id, { decision: 'skip', ...skip }])
  ),
  ...Object.fromEntries(
    output.batch.flatMap(({ rule_uuid: id, classifier }) =>
      id && classifier ? [[id, { decision: 'needs_agent', ...classifier }]] : []
    )
  ),
});

const agentBatchOf = (output: ClassifyDetectionsOutput) =>
  output.batch.map(({ rule_uuid: id }) => id);

/**
 * Classifies one detection of `rule-A`: in the given live series (one confirming series by
 * default), with the given match counts observed (none by default), and the agent's last review.
 */
const classifyRule = async ({
  memberships = [membership('confirms')],
  counts,
  reviewedAt,
  detectedAt,
  heldBack = false,
  ...overrides
}: Omit<BatchOverrides, 'findLiveMembers' | 'rows'> & {
  memberships?: LiveRuleMembership[];
  counts?: number[];
  reviewedAt?: string;
  detectedAt?: string;
  heldBack?: boolean;
} = {}) => {
  const output = await classifyBatch(
    batchParams({
      rows: [detectionRow('rule-A', { reviewedAt, heldBack, detectedAt })],
      findLiveMembers: async () => membersOf({ 'rule-A': memberships }),
      observe: jest.fn(async () => (counts ? observedSeries(counts) : undefined)),
      ...overrides,
    })
  );
  return { output, decision: decided(output)['rule-A'] };
};

describe('classifyBatch', () => {
  it('drops skipped rows and lists their rules in enforce mode', async () => {
    const rows = [detectionRow('rule-A'), detectionRow('rule-B'), detectionRow('rule-C')];
    const probe = jest.fn(async (query?: string) => probeResult('ok', query === STORED_QUERY));
    const findLiveMembers = jest.fn(async () =>
      membersOf({ 'rule-A': [membership('confirms')], 'rule-B': [membership('refutes')] })
    );

    const output = await classifyBatch(batchParams({ rows, probe, findLiveMembers }));

    expect(decided(output)).toMatchObject({
      'rule-A': { decision: 'skip', reason: 'still_breaching' },
      'rule-B': {
        decision: 'needs_agent',
        reason: 'state_changed',
        probe_status: 'ok',
        live_events: [{ event_id: 'event-1', status: 'active', stored_verdict: 'refutes' }],
      },
      'rule-C': { decision: 'needs_agent', reason: 'not_live_member', live_events: [] },
    });
    expect(agentBatchOf(output)).toEqual(['rule-B', 'rule-C']);
    expect(output.row_count).toBe(2);
    expect(output.skipped_rule_uuids).toEqual(['rule-A']);
    expect(output.skipped_count).toBe(1);
    expect(output.needs_agent_count).toBe(2);
    expect(output.reason_counts).toEqual({
      still_breaching: 1,
      state_changed: 1,
      not_live_member: 1,
    });
    expect(output.probe_status_counts).toEqual({ ok: 2 });
  });

  describe('what withdraws a skip', () => {
    const old = (overrides: Partial<LiveRuleMembership>) => [
      { ...membership('confirms'), ...overrides },
    ];

    it.each([
      ['its series is older than the limit', old({ createdAt: hoursAgo(25) }), 'series_too_old'],
      [
        'its series names no event, which a skip needs',
        old({ eventId: undefined }),
        'not_live_member',
      ],
      [
        'an old verdict sits on a new series',
        old({ createdAt: hoursAgo(1), verifiedAt: hoursAgo(48) }),
        'series_too_old',
      ],
      [
        'its verdict time is in the future: the series age decides',
        old({ createdAt: hoursAgo(48), verifiedAt: hoursAgo(-48) }),
        'series_too_old',
      ],
      [
        'its verdict time is unreadable: the series age decides',
        old({ createdAt: hoursAgo(48), verifiedAt: 'not a date' }),
        'series_too_old',
      ],
    ])('sends a skippable detection to the agent when %s', async (_name, memberships, reason) => {
      const { output, decision } = await classifyRule({ memberships });

      expect(output.skips).toEqual([]);
      expect(decision).toMatchObject({ decision: 'needs_agent', reason });
    });

    it('keeps the skip when a fresh verdict sits on an old series', async () => {
      const { decision } = await classifyRule({
        memberships: old({ createdAt: hoursAgo(72), verifiedAt: hoursAgo(1) }),
      });

      expect(decision).toMatchObject({ decision: 'skip', reason: 'still_breaching' });
    });

    it('sends a member to the agent when another rule joins its series for the same source', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [
            detectionRow('rule-A', { sourceId: 'logs.checkout' }),
            detectionRow('rule-B', { sourceId: 'logs.checkout' }),
          ],
          findLiveMembers: async () =>
            membersOf({ 'rule-A': [membership('confirms')], 'rule-B': [] }),
        })
      );

      expect(decided(output)).toMatchObject({
        'rule-A': { reason: 'member_joining' },
        'rule-B': { reason: 'not_live_member' },
      });
      expect(output.skipped_count).toBe(0);
    });

    it('does not treat members of different live series on one source as joining each other', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [
            detectionRow('rule-A', { sourceId: 'logs.checkout' }),
            detectionRow('rule-B', { sourceId: 'logs.checkout' }),
          ],
          findLiveMembers: async () =>
            membersOf({
              'rule-A': [{ ...membership('confirms'), eventId: 'event-1' }],
              'rule-B': [{ ...membership('confirms'), eventId: 'event-2' }],
            }),
        })
      );

      expect(decided(output)).toMatchObject({
        'rule-A': { decision: 'skip' },
        'rule-B': { decision: 'skip' },
      });
    });
  });

  describe('the match count against the level of the verdict, read from the series', () => {
    // Quiet at 5, then a plateau at 200 from bucket 45.
    const plateau = (latest: number) => [...repeat(45, 5), ...repeat(15, 200), latest];
    const cycle = Array.from({ length: 61 }, (_, i) => (i % 2 === 0 ? 620 : 230));

    it('records what it observed on the decision', async () => {
      const observe = jest.fn(async () => observedSeries(FLAT));

      const { decision } = await classifyRule({ observe });

      expect(observe).toHaveBeenCalledWith(STORED_QUERY);
      expect(decision).toMatchObject({ decision: 'skip', baseline: { decision: 'background' } });
    });

    it.each([
      [
        'above its own normal, with no level judged',
        [...repeat(60, 5), 50],
        undefined,
        { decision: 'needs_agent', reason: 'above_normal', baseline: { value: 50 } },
      ],
      [
        'back within the normal of when an abnormal level was judged',
        [...repeat(30, 5), ...repeat(20, 200), ...repeat(11, 5)],
        isoOfBucket(61, 35),
        { decision: 'needs_agent', reason: 'below_judged' },
      ],
      [
        'in the low phase of a rule that cycles: it was judged at a normal level',
        cycle,
        isoOfBucket(61, 50),
        { decision: 'skip' },
      ],
      [
        'a spike on a rule judged at a normal level, however small next to that level',
        [...repeat(60, 100), 180],
        isoOfBucket(61, 50),
        { decision: 'needs_agent', reason: 'above_normal' },
      ],
      [
        // The spike began inside the verdict's own bucket, after the verdict: it was never judged.
        "a spike that began inside the verdict's own bucket, which the verdict never saw",
        [...repeat(55, 5), ...repeat(6, 200)],
        isoOfBucket(61, 55),
        { decision: 'needs_agent', reason: 'above_normal' },
      ],
      [
        // The verdict may have been made in the spike or before it: either way the recovery goes on.
        "a recovery after a spike that began inside the verdict's own bucket",
        [...repeat(55, 5), ...repeat(5, 200), 5],
        isoOfBucket(61, 55),
        { decision: 'needs_agent', reason: 'below_judged' },
      ],
      [
        // The count fell inside the verdict's own bucket: the bucket before is the abnormal level.
        "a recovery after the count fell inside the verdict's own bucket",
        [...repeat(50, 5), ...repeat(5, 200), ...repeat(6, 5)],
        isoOfBucket(61, 55),
        { decision: 'needs_agent', reason: 'below_judged' },
      ],
      [
        'a verdict older than the series, so any rise above normal escalates',
        plateau(210),
        hoursAgo(6),
        { decision: 'needs_agent', reason: 'above_normal' },
      ],
    ])('decides %s', async (_name, counts, verifiedAt, expected) => {
      const { decision } = await classifyRule({
        memberships: [{ ...membership('confirms'), verifiedAt }],
        counts,
      });

      expect(decision).toMatchObject(expected);
    });

    it('does not observe a rule it does not probe and that has no review', async () => {
      const observe = jest.fn(async () => observedSeries(FLAT));

      await classifyRule({ memberships: [], observe });

      expect(observe).not.toHaveBeenCalled();
    });
  });

  describe("the agent's last review", () => {
    const review = (overrides: Parameters<typeof classifyRule>[0] = {}) =>
      classifyRule({
        memberships: [verdictBy('confirms', hoursAgo(30))],
        counts: FLAT,
        reviewedAt: hoursAgo(1),
        ...overrides,
      });
    const unjudged = (verifiedAt: string | undefined) => [verdictBy('off_topic', verifiedAt)];

    it('stands in for a stale verdict while the series is unchanged since, and says so', async () => {
      const { output, decision } = await review();

      expect(decision).toMatchObject({
        decision: 'skip',
        reason: 'already_reviewed',
        absorbed_reason: 'series_too_old',
        reviewed_at: hoursAgo(1),
      });
      expect(detectionSkipSchema.safeParse(output.skips[0].skip).success).toBe(true);
    });

    it.each([
      [
        'an unjudged verdict, whose series it observes to tell',
        { memberships: unjudged(hoursAgo(2)) },
        'unjudged_member',
      ],
      [
        'a rise the verdict has no level for: it is older than the series',
        {
          memberships: [verdictBy('confirms', hoursAgo(6))],
          reviewedAt: isoOfBucket(61, 55),
          counts: [...repeat(50, 5), ...repeat(11, 50)],
        },
        'above_normal',
      ],
    ])('stands in for %s', async (_name, overrides, absorbed) => {
      const { decision } = await review(overrides);

      expect(decision).toMatchObject({ decision: 'skip', absorbed_reason: absorbed });
    });

    it.each([
      ['it is older than the review window', { reviewedAt: hoursAgo(5) }],
      ['it sits in the latest bucket', { reviewedAt: new Date(NOW - 60_000).toISOString() }],
      [
        'the series has no matches over the probe span now',
        { reviewedAt: isoOfBucket(61, 50), counts: [...repeat(56, 5), ...repeat(5, 0)] },
      ],
      [
        'the count shifted since',
        { reviewedAt: isoOfBucket(61, 50), counts: [...repeat(60, 5), 40] },
      ],
      [
        // The spike rose and fell between the review and now: only the buckets in between tell.
        'a spike rose and fell since',
        {
          reviewedAt: isoOfBucket(61, 50),
          counts: [...repeat(52, 5), ...repeat(4, 400), ...repeat(5, 5)],
        },
      ],
      [
        // A fall the baseline still calls normal, with matches throughout: only the shift tells.
        'the count fell by more than half since, still within normal',
        { reviewedAt: isoOfBucket(61, 55), counts: [...repeat(10, 5), ...repeat(50, 200), 90] },
      ],
      ['there is no series', { counts: undefined }],
    ])('does not stand in for the verdict when %s', async (_name, overrides) => {
      const { output, decision } = await review(overrides);

      // Without the review the stale verdict, or the change itself, sends it to the agent.
      expect(decision).toMatchObject({ decision: 'needs_agent' });
      expect(output.skips).toEqual([]);
    });

    it.each([
      ['it came before the verdict', hoursAgo(1), hoursAgo(2)],
      ['the verdict time is in the future', hoursAgo(-1), hoursAgo(1)],
      ['the verdict time is missing', undefined, hoursAgo(1)],
    ])(
      'does not stand in for an unjudged verdict when %s',
      async (_name, verifiedAt, reviewedAt) => {
        const { decision } = await review({ memberships: unjudged(verifiedAt), reviewedAt });

        expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'unjudged_member' });
      }
    );

    it.each([
      [
        'matches the series cannot see yet: the probe finds rows where the review saw none',
        jest.fn(async () => probeResult('ok', true)),
        repeat(61, 0),
      ],
      ['a probe that failed', jest.fn(async () => probeResult('timeout', false)), FLAT],
    ])('does not stand in for an unjudged verdict with %s', async (_name, probe, counts) => {
      const { decision } = await review({ memberships: unjudged(hoursAgo(2)), probe, counts });

      expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'unjudged_member' });
    });

    it("does not stand in for a verdict when the matches began inside the review's own bucket", async () => {
      const { decision } = await review({
        memberships: unjudged(hoursAgo(2)),
        reviewedAt: isoOfBucket(61, 55),
        counts: [...repeat(55, 5), ...repeat(6, 200)],
      });

      expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'unjudged_member' });
    });

    it('does not stand in for a detection that was already in the index when the review was recorded', async () => {
      // The agent's run could have started before it fired: it was never in its batch.
      const { decision } = await review({ detectedAt: hoursAgo(2) });

      expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'series_too_old' });
    });

    it('lasts as long as the review window says', async () => {
      const at3h = { reviewedAt: hoursAgo(3) };

      expect((await review(at3h)).decision).toMatchObject({ reason: 'already_reviewed' });
      expect((await review({ ...at3h, reviewFreshMs: 2 * HOUR_MS })).decision).toMatchObject({
        reason: 'series_too_old',
      });
    });

    it('still sends the rise an unjudged member shows, when the review had not seen it', async () => {
      const { decision } = await review({
        memberships: unjudged(hoursAgo(2)),
        reviewedAt: isoOfBucket(61, 50),
        counts: [...repeat(60, 5), 11],
      });

      expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'above_normal' });
    });

    it.each([
      ['never skips a rule in no live event', { memberships: [] }, 'not_live_member'],
      [
        'never skips a probe that contradicts the verdict',
        {
          memberships: [verdictBy('confirms', hoursAgo(2))],
          probe: jest.fn(async () => probeResult('ok', false)),
        },
        'state_changed',
      ],
    ])('%s, however recently reviewed', async (_name, overrides, reason) => {
      const { decision } = await review(overrides);

      expect(decision).toMatchObject({ decision: 'needs_agent', reason });
    });
  });

  describe('a rule in more than one live series', () => {
    const untrustedNewest = (verifiedAt: string | undefined) => [
      verdictBy('off_topic', hoursAgo(3), 'event-old'),
      verdictBy('confirms', verifiedAt, 'event-new'),
    ];

    it.each([
      [
        'skips on the newest verdict when an older series is still unjudged',
        [
          verdictBy('off_topic', hoursAgo(3), 'event-old'),
          verdictBy('confirms', hoursAgo(1), 'event-new'),
        ],
        { decision: 'skip', reason: 'still_breaching', event_id: 'event-new' },
      ],
      [
        'sends it to the agent when the newest verdict is the one that cannot be judged',
        [
          verdictBy('confirms', hoursAgo(3), 'event-old'),
          verdictBy('off_topic', hoursAgo(1), 'event-new'),
        ],
        { decision: 'needs_agent', reason: 'unjudged_member' },
      ],
      [
        'still checks every series that holds the newest verdict',
        [
          verdictBy('off_topic', hoursAgo(1), 'event-a'),
          verdictBy('confirms', hoursAgo(1), 'event-b'),
        ],
        { decision: 'needs_agent', reason: 'unjudged_member' },
      ],
      [
        'supersedes nothing when the newer series has no verdict time',
        untrustedNewest(undefined),
        { decision: 'needs_agent', reason: 'unjudged_member' },
      ],
      [
        'supersedes nothing when the newer series has an unreadable verdict time',
        untrustedNewest('not-a-date'),
        { decision: 'needs_agent', reason: 'unjudged_member' },
      ],
      [
        'supersedes nothing when the newer series has a verdict time in the future',
        untrustedNewest(hoursAgo(-1)),
        { decision: 'needs_agent', reason: 'unjudged_member' },
      ],
    ])('%s', async (_name, memberships, expected) => {
      const { decision } = await classifyRule({ memberships });

      expect(decision).toMatchObject(expected);
    });
  });

  describe('detections the flaky-rule gate held back', () => {
    it('skips a held-back rule whose live event still holds, so its backlog is stamped', async () => {
      const { output, decision } = await classifyRule({ heldBack: true });

      expect(decision).toMatchObject({ decision: 'skip', reason: 'still_breaching' });
      expect(output.skipped_rule_uuids).toEqual(['rule-A']);
      expect(output.skipped_detection_ids).toEqual(['rule-A-detection']);
      expect(output.held_back_count).toBe(0);
    });

    it('lets a held-back change through once per review window, and holds the rest', async () => {
      const findLiveMembers = async () =>
        membersOf({ 'rule-A': [membership('refutes')], 'rule-B': [membership('confirms')] });

      // rule-A contradicts its verdict (a change); rule-C is in no live event (uncertain).
      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-B'), heldRow('rule-A'), heldRow('rule-C')],
          findLiveMembers,
        })
      );
      // The same change, but the agent reviewed rule-A an hour ago: it is flapping, so held.
      const reviewed = await classifyBatch(
        batchParams({ rows: [heldRow('rule-A', { reviewedAt: hoursAgo(1) })], findLiveMembers })
      );

      expect(agentBatchOf(output)).toEqual(['rule-A']);
      expect(decided(output)['rule-A']).toMatchObject({ reason: 'state_changed' });
      expect(output.held_back_count).toBe(1);
      expect(output.skipped_rule_uuids).toEqual(['rule-B']);
      expect(reviewed.batch).toEqual([]);
      expect(reviewed.held_back_count).toBe(1);
    });

    it('does not hold a change back on a review dated in the future', async () => {
      const { output } = await classifyRule({
        memberships: [membership('refutes')],
        heldBack: true,
        reviewedAt: hoursAgo(-1),
      });

      expect(agentBatchOf(output)).toEqual(['rule-A']);
    });

    it('holds back a row it cannot read instead of sending it to the agent', async () => {
      const output = await classifyBatch(batchParams({ rows: [[null, {}, 70, 1, false, true]] }));

      expect(output.batch).toEqual([]);
      expect(output.held_back_count).toBe(1);
    });

    it('does not let a held-back detection withdraw the skip of a rule in the series it would join', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A'), heldRow('rule-B', { sourceId: 'logs.checkout' })],
          findLiveMembers: async () => membersOf({ 'rule-A': [membership('confirms')] }),
        })
      );

      expect(decided(output)['rule-A']).toMatchObject({ decision: 'skip' });
      expect(output.held_back_count).toBe(1);
    });

    it('probes the rules the agent may read before the held-back ones', async () => {
      const heldQuery = 'FROM $.b | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';
      const probe = jest.fn(async (_query?: string) => probeResult('ok', true));

      await classifyBatch(
        batchParams({
          rows: [heldRow('rule-B'), detectionRow('rule-A')],
          probeConcurrency: 1,
          probe,
          // The lookup returns the held-back rule first.
          findLiveMembers: async () =>
            membersOf({
              'rule-B': [membership('confirms', heldQuery)],
              'rule-A': [membership('confirms', STORED_QUERY)],
            }),
        })
      );

      expect(probe.mock.calls.map(([query]) => query)).toEqual([STORED_QUERY, heldQuery]);
    });
  });

  describe('probes', () => {
    it('fails open when live series use different stored queries', async () => {
      const probe = jest.fn(async () => probeResult('ok', true));

      const { decision } = await classifyRule({
        memberships: [
          { ...membership('confirms'), esqlQuery: undefined },
          membership('confirms', 'FROM $.second'),
        ],
        probe,
      });

      expect(probe).not.toHaveBeenCalled();
      expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'probe_unavailable' });
    });

    it('sends the detection to the agent when the probe fails, and reports the status', async () => {
      const { output, decision } = await classifyRule({
        probe: jest.fn(async () => probeResult('timeout', false)),
      });

      expect(decision).toMatchObject({
        decision: 'needs_agent',
        reason: 'probe_unavailable',
        probe_status: 'timeout',
      });
      expect(output.probe_status_counts).toEqual({ timeout: 1 });
    });

    it('never runs more probes at once than the concurrency cap', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      const probe = jest.fn(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return probeResult('ok', true);
      });
      const ruleIds = ['A', 'B', 'C', 'D', 'E', 'F'].map((id) => `rule-${id}`);

      await classifyBatch(
        batchParams({
          rows: ruleIds.map((id) => detectionRow(id)),
          probe,
          probeConcurrency: 2,
          findLiveMembers: async () =>
            membersOf(Object.fromEntries(ruleIds.map((id) => [id, [membership('confirms')]]))),
        })
      );

      expect(probe).toHaveBeenCalledTimes(6);
      expect(maxInFlight).toBe(2);
    });
  });

  it('classifies at most MAX_CLASSIFIED_ROWS rows and keeps the rest for the agent', async () => {
    const ruleIds = Array.from({ length: MAX_CLASSIFIED_ROWS + 1 }, (_, i) => `rule-${i}`);
    const probe = jest.fn(async () => probeResult('ok', true));
    const findLiveMembers = jest.fn(async (requested: string[]) =>
      membersOf(Object.fromEntries(requested.map((id) => [id, [membership('confirms')]])))
    );

    const output = await classifyBatch(
      batchParams({ rows: ruleIds.map((id) => detectionRow(id)), probe, findLiveMembers })
    );

    expect(findLiveMembers.mock.calls[0][0]).toHaveLength(MAX_CLASSIFIED_ROWS);
    expect(probe).toHaveBeenCalledTimes(MAX_CLASSIFIED_ROWS);
    expect(decided(output)[`rule-${MAX_CLASSIFIED_ROWS}`]).toMatchObject({
      decision: 'needs_agent',
      reason: 'over_cap',
    });
    expect(agentBatchOf(output)).toEqual([`rule-${MAX_CLASSIFIED_ROWS}`]);
  });

  it('sends a flaky probe to the agent instead of skipping it', async () => {
    const flakyRow = [...detectionRow('rule-A').slice(0, 4), true];

    const output = await classifyBatch(
      batchParams({
        rows: [flakyRow],
        findLiveMembers: async () => membersOf({ 'rule-A': [membership('confirms')] }),
      })
    );

    expect(output.batch[0]).toMatchObject({
      flaky_probe: true,
      classifier: { reason: 'flaky_probe' },
    });
    expect(output.skipped_count).toBe(0);
  });

  it('stamps a skipped rule only up to the detection it judged, with what it saw in the marker', async () => {
    const output = await classifyBatch(
      batchParams({
        rows: [detectionRow('rule-A'), detectionRow('rule-B')],
        findLiveMembers: async () => membersOf({ 'rule-A': [membership('confirms')] }),
      })
    );

    expect(output.skipped_detection_ids).toEqual(['rule-A-detection']);
    expect(output.skips).toEqual([
      {
        rule_uuid: 'rule-A',
        skip: {
          reason: 'still_breaching',
          probe_status: 'ok',
          probe_has_rows: true,
          probe_window_minutes: 20,
          event_id: 'event-1',
          event_title: 'Checkout — request failures',
          stored_verdict: 'confirms',
        },
      },
    ]);
    const route = detectionSkipSchema.omit({ checked_at: true }).strict();
    expect(route.safeParse(output.skips[0].skip).success).toBe(true);
  });

  it('keeps a row it cannot read, without a decision', async () => {
    const output = await classifyBatch(batchParams({ rows: [[null, {}], detectionRow('rule-A')] }));

    expect(output.batch).toHaveLength(2);
    expect(Object.keys(decided(output))).toEqual(['rule-A']);
  });
});

describe('classifyDetectionsStepDefinition', () => {
  const settings = {
    columns: COLUMNS,
    space_id: 'default',
    probe_window_minutes: 60,
    probe_timeout_ms: 8_000,
    probe_concurrency: 5,
    budget_ms: 20_000,
    max_skip_age_hours: 24,
    review_fresh_minutes: 240,
    baseline_bucket_minutes: 5,
    baseline_window_minutes: 300,
  };

  const createDefinition = () => {
    const logger = loggerMock.create();
    return { definition: classifyDetectionsStepDefinition({ logger }), logger };
  };

  const membersResponse = {
    columns: [
      { name: '_source', type: 'object' },
      { name: 'data_json', type: 'keyword' },
    ],
    values: [
      [
        { group_hash: 'group-1', alert: { status: 'active' }, severity: 'high' },
        JSON.stringify({
          event_id: 'event-1',
          title: 'Checkout errors',
          summary: 'Checkout is failing',
          source_ids: ['logs.checkout'],
          confidence: 0.8,
          signals: [
            {
              type: 'detection',
              source_id: 'logs.checkout',
              description: 'Observed rows',
              verdict: 'confirms',
              metadata: { rule_uuid: 'rule-A' },
              evidence: { esql_query: STORED_QUERY, result: 'found' },
            },
          ],
        }),
      ],
    ],
  };
  /** An ES client that answers the live-series lookup, and any other query with `rows`. */
  const esClientWith = (rows: unknown[][]) => {
    const query = jest.fn(async (request: { query: string }) =>
      request.query.includes('.rule-events')
        ? membersResponse
        : { columns: [{ name: 'x', type: 'keyword' }], values: rows }
    );
    return { query, esClient: { esql: { query } } };
  };

  const runHandler = async (
    definition: ReturnType<typeof createDefinition>['definition'],
    input: unknown,
    esClient: unknown
  ) => {
    const { output } = await definition.handler({
      input,
      rawInput: input,
      contextManager: { getScopedEsClient: jest.fn(() => esClient) },
      abortSignal: new AbortController().signal,
    } as never);
    if (!output) throw new Error('The step returned no output');
    return output;
  };

  it('bounds every input, and defaults the series and review inputs for an older workflow', () => {
    const { definition } = createDefinition();
    const parse = (override: object) =>
      definition.inputSchema.safeParse({ ...settings, rows: [], ...override }).success;
    const bounds = {
      probe_concurrency: [1, 10],
      probe_window_minutes: [15, 360],
      probe_timeout_ms: [1_000, 30_000],
      budget_ms: [2_000, 60_000],
      max_skip_age_hours: [1, 720],
      review_fresh_minutes: [15, 1_440],
      baseline_bucket_minutes: [1, 60],
      baseline_window_minutes: [60, 1_440],
    };

    for (const [field, [min, max]] of Object.entries(bounds)) {
      expect([field, parse({ [field]: min - 1 }), parse({ [field]: max + 1 })]).toEqual([
        field,
        false,
        false,
      ]);
      expect([field, parse({ [field]: min }), parse({ [field]: max })]).toEqual([
        field,
        true,
        true,
      ]);
    }
    const {
      review_fresh_minutes: _fresh,
      baseline_bucket_minutes: _bucket,
      baseline_window_minutes: _window,
      ...older
    } = settings;
    expect(definition.inputSchema.parse({ ...older, rows: [] })).toMatchObject({
      review_fresh_minutes: 240,
      baseline_bucket_minutes: 5,
      baseline_window_minutes: 300,
    });
  });

  it('classifies through the scoped ES client, probes the stored query and logs once', async () => {
    const { definition, logger } = createDefinition();
    const { query, esClient } = esClientWith([['row']]);

    const output = await runHandler(
      definition,
      { ...settings, rows: [detectionRow('rule-A')] },
      esClient
    );

    expect(definition.outputSchema.safeParse(output).success).toBe(true);
    expect(decided(output)).toMatchObject({
      'rule-A': { decision: 'skip', reason: 'still_breaching', probe_status: 'ok' },
    });
    expect(output).toMatchObject({ batch: [], skipped_rule_uuids: ['rule-A'], failed: false });
    const probeRequest = query.mock.calls.find(([request]) => request.query.includes('LIMIT 1'));
    expect(probeRequest?.[0].query).toBe(`${STORED_QUERY}\n| LIMIT 1`);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('classifyDetections'));
  });

  it('reads the series once, at the bucket size and window it is given', async () => {
    const { definition } = createDefinition();
    const { query, esClient } = esClientWith([]);

    await runHandler(
      definition,
      {
        ...settings,
        baseline_bucket_minutes: 15,
        baseline_window_minutes: 600,
        rows: [detectionRow('rule-A')],
      },
      esClient
    );

    const series = query.mock.calls.filter(([request]) => request.query.includes('BUCKET'));
    expect(series).toHaveLength(1);
    expect(series[0][0].query).toContain('BUCKET(@timestamp, 15 minute)');
    expect(series[0][0].query).toContain('LIMIT 41');
  });

  describe('when it cannot judge', () => {
    it('fails open on an error while classifying: the rows the agent may read go on unjudged', async () => {
      const { definition, logger } = createDefinition();
      const esClient = {
        esql: {
          query: jest.fn(async () => {
            throw new Error('the cluster is down');
          }),
        },
      };

      const output = await runHandler(
        definition,
        { ...settings, rows: [detectionRow('rule-A'), heldRow('rule-B'), detectionRow('rule-C')] },
        esClient
      );

      expect(definition.outputSchema.safeParse(output).success).toBe(true);
      expect(output).toMatchObject({
        failed: true,
        row_count: 2,
        held_back_count: 1,
        needs_agent_count: 2,
        skips: [],
        skipped_detection_ids: [],
      });
      expect(agentBatchOf(output)).toEqual(['rule-A', 'rule-C']);
      expect(output.batch.every((entry) => entry.classifier === undefined)).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('the cluster is down'));
    });

    it.each([
      ['too few buckets to judge', { baseline_bucket_minutes: 60, baseline_window_minutes: 300 }],
      [
        'more buckets than one read allows',
        { baseline_bucket_minutes: 1, baseline_window_minutes: 1_440 },
      ],
      [
        'a bucket wider than the probe window',
        { baseline_bucket_minutes: 30, baseline_window_minutes: 1_440, probe_window_minutes: 20 },
      ],
    ])('fails open when the series inputs give %s', async (_name, override) => {
      const { definition, logger } = createDefinition();
      const { query, esClient } = esClientWith([]);

      const output = await runHandler(
        definition,
        { ...settings, ...override, rows: [detectionRow('rule-A')] },
        esClient
      );

      expect(output.failed).toBe(true);
      expect(agentBatchOf(output)).toEqual(['rule-A']);
      expect(query).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('treats missing rows and columns as an empty batch', async () => {
      const { definition } = createDefinition();
      const { query, esClient } = esClientWith([]);
      const { columns: _columns, ...withoutColumns } = settings;

      for (const input of [settings, withoutColumns]) {
        expect(definition.inputSchema.safeParse(input).success).toBe(true);
        expect(await runHandler(definition, input, esClient)).toMatchObject({
          batch: [],
          row_count: 0,
        });
      }
      expect(query).not.toHaveBeenCalled();
    });
  });
});

describe('probeSpanInBuckets', () => {
  it('covers the probe window with whole buckets, rounding up, and at least one', () => {
    expect(probeSpanInBuckets({ probeWindowMinutes: 20, bucketMinutes: 5 })).toBe(4);
    expect(probeSpanInBuckets({ probeWindowMinutes: 22, bucketMinutes: 5 })).toBe(5);
    expect(probeSpanInBuckets({ probeWindowMinutes: 15, bucketMinutes: 15 })).toBe(1);
  });
});
