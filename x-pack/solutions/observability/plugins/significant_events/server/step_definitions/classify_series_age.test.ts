/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { classifyBatch } from './classify_batch';
import {
  RuleEventsClient,
  type LiveRuleMembership,
} from '../lib/significant_events/events/rule_events_client';
import {
  STORED_QUERY,
  NOW,
  hoursAgo,
  detectionRow,
  membership,
  verdictBy,
  membersOf,
  batchParams,
  decided,
  classifyRule,
  noBreaches,
} from './classify_test_helpers';

describe('classifyBatch', () => {
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

  describe('stored signal collection times', () => {
    const classifyStoredSignal = async ({
      evidenceTo,
      collectedAt,
      reviewedAt,
    }: {
      evidenceTo: string;
      collectedAt?: string;
      reviewedAt?: string;
    }) => {
      const data = {
        event_id: 'event-1',
        title: 'Checkout errors',
        source_ids: ['logs.checkout'],
        signals: [
          {
            type: 'detection',
            source_id: 'logs.checkout',
            description: 'Observed rows',
            verdict: 'confirms',
            metadata: { rule_uuid: 'rule-A' },
            collected_at: collectedAt,
            evidence: {
              esql_query: STORED_QUERY,
              result: 'found',
              time_range: { from: '2026-10-18T05:00:00.000Z', to: evidenceTo },
            },
          },
        ],
      };
      const source = {
        '@timestamp': hoursAgo(2),
        group_hash: 'group-hash-1',
        space_id: 'default',
        type: 'alert',
        source: 'elastic.significant_events',
        severity: 'medium',
        alert: { status: 'active' },
        data,
      };
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.esql.query.mockResolvedValue({
        columns: [
          { name: '_source', type: 'object' },
          { name: 'data_json', type: 'keyword' },
          { name: 'created_at', type: 'date' },
        ],
        // ES client types do not include object-valued _source cells.
        values: [[source as never, JSON.stringify(data), hoursAgo(48)]],
      });
      const client = new RuleEventsClient({ esClient, space: 'default' });

      return classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A', { reviewedAt })],
          findLiveMembers: (ruleUuids) => client.findLiveMemberships({ ruleUuids }),
          // The decision itself is what these tests read, not the hold.
          reviewFreshMs: 0,
        })
      );
    };

    it.each([
      [
        'ages an unstamped signal from its evidence time',
        '2026-10-19T10:00:00.000Z',
        undefined,
        'still_breaching',
      ],
      [
        'counts an old unstamped signal from a later review',
        '2026-10-18T06:00:00.000Z',
        '2026-10-19T11:00:00.000Z',
        'still_breaching',
      ],
    ])('%s', async (_name, evidenceTo, reviewedAt, reason) => {
      const output = await classifyStoredSignal({ evidenceTo, reviewedAt });

      expect(output.batch).toEqual([]);
      expect(output.skips).toEqual([
        {
          rule_uuid: 'rule-A',
          skip: expect.objectContaining({
            reason,
          }),
        },
      ]);
    });

    it.each([
      ['the evidence time is malformed', 'not-a-date', undefined, undefined],
      ['the evidence time is in the future', '2026-10-20T10:00:00.000Z', undefined, undefined],
      [
        'a stale explicit timestamp takes precedence over fresh evidence',
        '2026-10-19T10:00:00.000Z',
        '2026-10-18T06:00:00.000Z',
        undefined,
      ],
    ])('routes to the agent when %s', async (_name, evidenceTo, collectedAt, reviewedAt) => {
      const output = await classifyStoredSignal({ evidenceTo, collectedAt, reviewedAt });

      expect(output.skips).toEqual([]);
      expect(output.batch).toMatchObject([{ classifier: { reason: 'series_too_old' } }]);
    });

    it.each([
      ['the evidence time is malformed', 'not-a-date'],
      ['the evidence time is in the future', '2026-10-20T10:00:00.000Z'],
    ])('counts the series age from a later review when %s', async (_name, evidenceTo) => {
      const output = await classifyStoredSignal({
        evidenceTo,
        reviewedAt: '2026-10-19T11:00:00.000Z',
      });

      expect(output.batch).toEqual([]);
      expect(output.skips).toEqual([
        { rule_uuid: 'rule-A', skip: expect.objectContaining({ reason: 'still_breaching' }) },
      ]);
    });
  });

  describe("the agent's last review counts toward the age of the series", () => {
    const staleVerdict = [verdictBy('confirms', hoursAgo(30))];
    const review = (overrides: Parameters<typeof classifyRule>[0] = {}) =>
      classifyRule({ memberships: staleVerdict, reviewedAt: hoursAgo(1), ...overrides });
    const unjudged = (verifiedAt: string | undefined) => [verdictBy('off_topic', verifiedAt)];

    it.each([
      ['10 minutes old', new Date(NOW - 10 * 60_000).toISOString()],
      ['10 hours old', hoursAgo(10)],
    ])('keeps a stale verdict from reading old for a review %s', async (_name, reviewedAt) => {
      const { output, decision } = await review({ reviewedAt });

      expect(decision).toMatchObject({ decision: 'skip', reason: 'still_breaching' });
      expect(output.skipped_rule_uuids).toEqual(['rule-A']);
    });

    it('counts a review that came 1 ms before the detection', async () => {
      const reviewedAt = hoursAgo(10);
      const detectedAt = new Date(Date.parse(reviewedAt) + 1).toISOString();

      const { decision } = await review({ reviewedAt, detectedAt });

      expect(decision).toMatchObject({ decision: 'skip', reason: 'still_breaching' });
    });

    it.each([
      ['older than the age limit', hoursAgo(26), undefined],
      ['in the future', hoursAgo(-1), undefined],
      ['missing', undefined, undefined],
      ['at the time of the detection', hoursAgo(10), hoursAgo(10)],
      ['after the detection, which arrived while the agent ran', hoursAgo(10), hoursAgo(11)],
    ])(
      'ignores a review that is %s and routes the stale series',
      async (_name, reviewedAt, detectedAt) => {
        const { decision } = await review({
          memberships: [verdictBy('confirms', hoursAgo(40))],
          reviewedAt,
          detectedAt,
        });

        expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'series_too_old' });
      }
    );

    it.each([
      ['is missing', undefined],
      ['cannot be read', 'not a time'],
      ['lies in the future', hoursAgo(-1)],
    ])(
      'routes a series whose verdict time cannot be trusted and whose creation time %s',
      async (_name, createdAt) => {
        const { decision } = await classifyRule({
          memberships: [{ ...membership('confirms'), verifiedAt: undefined, createdAt }],
        });

        expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'series_too_old' });
      }
    );

    it('anchors every membership of the rule on the one review, trusted or not', async () => {
      const memberships = [
        verdictBy('confirms', hoursAgo(30)),
        verdictBy('confirms', undefined, 'event-2'),
      ];

      const reviewed = await review({ memberships, reviewedAt: hoursAgo(10) });
      const unreviewed = await review({ memberships, reviewedAt: undefined });

      expect(reviewed.decision).toMatchObject({ decision: 'skip', reason: 'still_breaching' });
      expect(unreviewed.decision).toMatchObject({
        decision: 'needs_agent',
        reason: 'series_too_old',
      });
    });

    it('never absorbs an unjudged member: a review does not give it a verdict', async () => {
      const { decision } = await review({ memberships: unjudged(hoursAgo(2)) });

      expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'unjudged_member' });
    });

    it.each([
      ['never skips a rule in no live event', { memberships: [] }, 'not_live_member'],
      [
        'never skips a rule whose breach record contradicts the verdict',
        {
          memberships: [verdictBy('confirms', hoursAgo(2))],
          findRecentBreaches: noBreaches,
        },
        'state_changed',
      ],
      [
        'routes a change against the verdict whatever the age of the review',
        { memberships: [verdictBy('refutes', hoursAgo(30))], reviewedAt: hoursAgo(10) },
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
});
