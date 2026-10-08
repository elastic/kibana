/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { MAX_STORYLINE_EVENTS } from '../../../../../common/entity_analytics/executive_brief/constants';
import type { BriefTimeRange } from '../../../../../common/entity_analytics/executive_brief/types';
import { buildEntityRefs } from './alert_queries';
import {
  buildDraftEvents,
  detectRiskJumps,
  fetchFirstAlertsPerTactic,
  fetchRelationshipFirstSeen,
  findMaxPositiveDelta,
  getTacticName,
  guardRelationshipFirstSeen,
  orderAndCapEvents,
  relationshipKey,
  sortTacticIds,
} from './timeline';
import type { DraftEvent, TimelineInput } from './timeline';
import { FIXTURE_NOW, day } from './__fixtures__/cluster_scenarios';

const series = (...values: number[]) =>
  values.map((v, i) => ({ t: day(-values.length + i + 1, 0), v }));

describe('risk jumps', () => {
  it('finds the largest day-over-day rise', () => {
    expect(findMaxPositiveDelta(series(10, 12, 30, 31))).toBe(18);
    expect(findMaxPositiveDelta(series(50, 40, 30))).toBe(0);
    expect(findMaxPositiveDelta([])).toBe(0);
  });

  it('emits nothing for flat, falling, empty or single-point series', () => {
    expect(detectRiskJumps([])).toEqual([]);
    expect(detectRiskJumps(series(40))).toEqual([]);
    expect(detectRiskJumps(series(40, 40, 40))).toEqual([]);
    expect(detectRiskJumps(series(80, 60, 40))).toEqual([]);
  });

  it('ignores rises below the 10 point threshold unless they cross into High', () => {
    expect(detectRiskJumps(series(20, 25, 31))).toEqual([]);
  });

  it('emits the largest rise (>= 10)', () => {
    const jumps = detectRiskJumps(series(12, 49, 55));
    expect(jumps).toEqual([{ at: day(-1, 0), from: 12, to: 49, reason: 'largest_rise' }]);
  });

  it('adds the first crossing into High as a second jump on a different day', () => {
    const points = series(22, 41, 58, 69, 75);
    // largest rise is 41 -> 58? no: deltas 19, 17, 11, 6 -> largest is 22 -> 41 (day 2)
    const jumps = detectRiskJumps(points);
    expect(jumps.map((j) => [j.from, j.to, j.reason])).toEqual([
      [22, 41, 'largest_rise'],
      [69, 75, 'crossed_high'],
    ]);
  });

  it('collapses the two reasons when they fall on the same day', () => {
    expect(detectRiskJumps(series(40, 85))).toEqual([
      { at: day(0, 0), from: 40, to: 85, reason: 'largest_rise' },
    ]);
  });

  it('does not report a crossing when the series starts above High', () => {
    expect(detectRiskJumps(series(75, 76, 80))).toEqual([]);
  });

  it('sorts unordered input and rounds scores', () => {
    const [jump] = detectRiskJumps([
      { t: day(-1, 0), v: 70.4 },
      { t: day(-2, 0), v: 20.2 },
    ]);
    expect(jump).toMatchObject({ from: 20, to: 70, reason: 'largest_rise' });
  });
});

describe('relationship first-seen backfill guard', () => {
  const observation = (firstSeenAt: string, kind: 'owns' | 'accesses_infrequently' = 'owns') => ({
    kind,
    from: 'user:a',
    to: 'host:b',
    firstSeenAt,
  });

  it('reports no history explicitly', () => {
    expect(
      guardRelationshipFirstSeen({
        observations: [observation(day(-1))],
        historyStartByKind: {},
        now: FIXTURE_NOW,
      })
    ).toEqual({ observations: [], suppressed: 'no_history', droppedBackfill: 0 });
  });

  it('suppresses everything when the history is shorter than 3 days', () => {
    const result = guardRelationshipFirstSeen({
      observations: [observation(day(-1))],
      historyStartByKind: { owns: day(-2) },
      now: FIXTURE_NOW,
    });
    expect(result.suppressed).toBe('history_too_short');
    expect(result.observations).toEqual([]);
  });

  it('drops observations from the first (backfilling) run and keeps later ones', () => {
    const result = guardRelationshipFirstSeen({
      observations: [
        observation(day(-30, 1)), // first run
        observation(day(-29, 1)), // exactly first run + 1 day
        observation(day(-3, 2)),
      ],
      historyStartByKind: { owns: day(-30, 1) },
      now: FIXTURE_NOW,
    });
    expect(result.suppressed).toBe('none');
    expect(result.observations.map((o) => o.firstSeenAt)).toEqual([day(-3, 2)]);
    expect(result.droppedBackfill).toBe(2);
  });

  it('is per kind: a kind with a short history yields nothing even if another is long', () => {
    const result = guardRelationshipFirstSeen({
      observations: [
        observation(day(-1), 'accesses_infrequently'),
        observation(day(-3, 5), 'owns'),
      ],
      historyStartByKind: { owns: day(-20), accesses_infrequently: day(-1, 0) },
      now: FIXTURE_NOW,
    });
    expect(result.observations.map((o) => o.kind)).toEqual(['owns']);
  });

  it('drops observations of a kind with no history start', () => {
    const result = guardRelationshipFirstSeen({
      observations: [observation(day(-2), 'accesses_infrequently')],
      historyStartByKind: { owns: day(-20) },
      now: FIXTURE_NOW,
    });
    expect(result.observations).toEqual([]);
    expect(result.droppedBackfill).toBe(1);
  });
});

const emptyInput = (): TimelineInput => ({
  firstAlerts: [],
  discoveries: [],
  leads: [],
  riskJumps: [],
  relationships: [],
  cases: [],
});

describe('event building', () => {
  it('builds deterministic summaries for every event type', () => {
    const drafts = buildDraftEvents({
      firstAlerts: [
        {
          tacticId: 'TA0008',
          at: day(-3),
          entityEuids: ['host:jump'],
          subjectName: 'jump-box-01',
          ruleName: 'Outbound RDP to Internal Jump Host',
          ruleEvidenceId: 'RULE-2',
        },
      ],
      discoveries: [
        { at: day(-1), title: 'Credential theft', evidenceId: 'AD-1', entityEuids: ['user:a'] },
      ],
      leads: [
        { at: day(-1), title: 'Privileged user', evidenceId: 'LEAD-1', entityEuids: ['user:a'] },
      ],
      riskJumps: [
        {
          at: day(-2),
          entityEuid: 'host:p',
          entityName: 'prod',
          from: 12,
          to: 49,
          evidenceId: 'ENT-4',
        },
      ],
      relationships: [
        {
          at: day(-3, 2),
          kind: 'accesses_infrequently',
          from: 'user:a',
          to: 'host:jump',
          fromName: 'a.rodriguez',
          toName: 'jump-box-01',
        },
      ],
      cases: [
        {
          evidenceId: 'CASE-1',
          title: 'MFA bombing',
          status: 'in-progress',
          createdAt: day(-1),
          updatedAt: day(0),
          entityEuids: ['user:a'],
        },
      ],
      closedAlerts: { at: day(0), count: 1, entityEuids: ['user:a'] },
    });
    expect(drafts.map((d) => d.summary)).toEqual([
      'First Lateral Movement alert: "Outbound RDP to Internal Jump Host" on jump-box-01',
      'Attack Discovery: "Credential theft"',
      'Hunting lead created: "Privileged user"',
      'prod risk 12 → 49 (Moderate)',
      `New relationship: a.rodriguez logged on to (rarely) jump-box-01 (first observed on or around ${day(
        -3,
        2
      ).slice(0, 10)})`,
      'Case opened: "MFA bombing"',
      'Case "MFA bombing" is in progress',
      '1 alert closed',
    ]);
    expect(drafts[0]).toMatchObject({
      type: 'alert_first',
      tacticId: 'TA0008',
      sourceEvidenceIds: ['RULE-2'],
    });
    expect(drafts[4].edge).toEqual({
      type: 'accesses_infrequently',
      from: 'user:a',
      to: 'host:jump',
    });
  });

  it('does not emit a status event for an open case, nor an empty closed-alert event', () => {
    const drafts = buildDraftEvents({
      ...emptyInput(),
      cases: [
        {
          evidenceId: 'CASE-1',
          title: 't',
          status: 'open',
          createdAt: day(-1),
          updatedAt: day(0),
          entityEuids: [],
        },
      ],
      closedAlerts: { at: day(0), count: 0, entityEuids: [] },
    });
    expect(drafts.map((d) => d.type)).toEqual(['case_opened']);
  });

  it('pluralises closed alerts', () => {
    expect(
      buildDraftEvents({
        ...emptyInput(),
        closedAlerts: { at: day(0), count: 4, entityEuids: [] },
      })[0].summary
    ).toBe('4 alerts closed');
  });

  it('returns nothing for empty input', () => {
    expect(buildDraftEvents(emptyInput())).toEqual([]);
    expect(orderAndCapEvents([])).toEqual({ events: [], truncated: 0 });
  });
});

describe('event ordering and caps', () => {
  const draft = (type: DraftEvent['type'], at: string, summary = type): DraftEvent => ({
    type,
    at,
    entityEuids: [],
    summary,
    sourceEvidenceIds: [],
  });

  it('orders by time, ties by type order then summary', () => {
    const { events } = orderAndCapEvents([
      draft('ad_generated', day(-1)),
      draft('alert_first', day(-1), 'b'),
      draft('alert_first', day(-1), 'a'),
      draft('relationship_first_seen', day(-1)),
      draft('alert_first', day(-5)),
    ]);
    expect(
      events.map((e) => `${e.at === day(-5) ? 'early' : 'tie'}:${e.type}:${e.summary}`)
    ).toEqual([
      'early:alert_first:alert_first',
      'tie:relationship_first_seen:relationship_first_seen',
      'tie:alert_first:a',
      'tie:alert_first:b',
      'tie:ad_generated:ad_generated',
    ]);
  });

  it('removes exact duplicates', () => {
    const { events, truncated } = orderAndCapEvents([
      draft('alert_first', day(-1)),
      draft('alert_first', day(-1)),
    ]);
    expect(events).toHaveLength(1);
    expect(truncated).toBe(0);
  });

  it('caps at MAX_STORYLINE_EVENTS keeping important types, and reports the drop count', () => {
    const drafts = [
      draft('ad_generated', day(0)),
      draft('case_opened', day(0)),
      ...Array.from({ length: 14 }, (_, i) => draft('alert_first', day(-14 + i), `alert ${i}`)),
      draft('alerts_closed', day(0)),
    ];
    const { events, truncated } = orderAndCapEvents(drafts);
    expect(events).toHaveLength(MAX_STORYLINE_EVENTS);
    expect(truncated).toBe(drafts.length - MAX_STORYLINE_EVENTS);
    expect(events.some((e) => e.type === 'ad_generated')).toBe(true);
    expect(events.some((e) => e.type === 'case_opened')).toBe(true);
    expect(events.some((e) => e.type === 'alerts_closed')).toBe(false);
    // Within a type the earliest survive.
    const alertSummaries = events.filter((e) => e.type === 'alert_first').map((e) => e.summary);
    expect(alertSummaries).toContain('alert 0');
    expect(alertSummaries).not.toContain('alert 13');
    // And the result is time-ordered.
    const times = events.map((e) => e.at);
    expect([...times].sort()).toEqual(times);
  });
});

describe('tactics', () => {
  it('names known tactics and falls back to the id', () => {
    expect(getTacticName('TA0008')).toBe('Lateral Movement');
    expect(getTacticName('TA9999')).toBe('TA9999');
  });

  it('sorts in managed MITRE order, unknown ids last', () => {
    expect(
      sortTacticIds(['TA0010', 'TA0001', 'TA0008', 'TA0006', 'TA0004', 'TA0001', 'TAX'])
    ).toEqual(['TA0001', 'TA0004', 'TA0006', 'TA0008', 'TA0010', 'TAX']);
  });
});

describe('first alert per tactic query', () => {
  const timeRange: BriefTimeRange = { from: day(-7), to: FIXTURE_NOW, range: '7d' };
  const refs = buildEntityRefs([
    { euid: 'user:a.rodriguez@acme.com@okta', name: 'a.rodriguez' },
    { euid: 'host:jump-box-01', name: 'jump-box-01' },
  ]);

  it('returns no rows without querying when there are no entities', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    await expect(
      fetchFirstAlertsPerTactic({
        esClient: es,
        spaceId: 'default',
        timeRange,
        refs: buildEntityRefs([]),
      })
    ).resolves.toEqual([]);
    expect(es.search).not.toHaveBeenCalled();
  });

  it('parses the per-entity tactic buckets into rows sorted by time', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    const ruleBucket = (
      uuid: string,
      at: string,
      name: string,
      severity: string,
      count: number
    ) => ({
      key: uuid,
      doc_count: count,
      min_ts: { value_as_string: at },
      details: {
        hits: {
          hits: [
            {
              fields: {
                'kibana.alert.rule.name': [name],
                'kibana.alert.severity': [severity],
                'kibana.alert.rule.threat.tactic.id': ['TA0008'],
                'kibana.alert.rule.threat.technique.id': ['T1021'],
              },
            },
          ],
        },
      },
    });
    es.search.mockResolvedValue({
      aggregations: {
        by_user: {
          buckets: [
            {
              key: 'user:a.rodriguez@acme.com@okta',
              tactics: {
                buckets: [
                  {
                    key: 'TA0008',
                    first_rule: {
                      buckets: [ruleBucket('r2', day(-3, 2), 'Outbound RDP', 'high', 4)],
                    },
                  },
                  { key: 'TA0001', first_rule: { buckets: [] } },
                ],
              },
            },
          ],
        },
        by_host: {
          buckets: [
            {
              key: 'host:jump-box-01',
              tactics: {
                buckets: [
                  {
                    key: 'TA0004',
                    first_rule: { buckets: [ruleBucket('r3', day(-2, 3), 'sudo', 'weird', 2)] },
                  },
                ],
              },
            },
          ],
        },
      },
    } as never);

    const rows = await fetchFirstAlertsPerTactic({
      esClient: es,
      spaceId: 'default',
      timeRange,
      refs,
    });
    expect(rows).toEqual([
      {
        entityEuid: 'user:a.rodriguez@acme.com@okta',
        tacticId: 'TA0008',
        at: day(-3, 2),
        alertCount: 4,
        rule: {
          uuid: 'r2',
          name: 'Outbound RDP',
          severity: 'high',
          tacticIds: ['TA0008'],
          techniqueIds: ['T1021'],
        },
      },
      {
        entityEuid: 'host:jump-box-01',
        tacticId: 'TA0004',
        at: day(-2, 3),
        alertCount: 2,
        rule: {
          uuid: 'r3',
          name: 'sudo',
          severity: 'medium',
          tacticIds: ['TA0008'],
          techniqueIds: ['T1021'],
        },
      },
    ]);
    const [request] = es.search.mock.calls[0];
    expect(request).toMatchObject({
      index: '.alerts-security.alerts-default',
      size: 0,
      allow_partial_search_results: false,
    });
    expect(JSON.stringify(request)).toContain('kibana.alert.building_block_type');
    expect(JSON.stringify(request)).toContain(
      '"include":["host:jump-box-01","user:a.rodriguez@acme.com@okta"]'
    );
  });

  it('lets errors propagate (they become source statuses upstream)', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search.mockRejectedValue(new Error('boom'));
    await expect(
      fetchFirstAlertsPerTactic({ esClient: es, spaceId: 'default', timeRange, refs })
    ).rejects.toThrow('boom');
  });
});

describe('relationship first-seen query', () => {
  const request = {
    kind: 'accesses_infrequently' as const,
    actorEuids: ['user:a', 'user:a@laptop@local'],
    targetEuids: ['host:jump'],
  };

  it('does not query without requests', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    await expect(
      fetchRelationshipFirstSeen({ esClient: es, spaceId: 'default', requests: [] })
    ).resolves.toEqual({ firstSeen: new Map(), historyStartByKind: {} });
    expect(es.search).not.toHaveBeenCalled();
  });

  it('takes the earliest observation across the actor group and returns the history start', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search.mockResolvedValue({
      aggregations: {
        history_accesses_infrequently: { start: { value_as_string: day(-30) } },
        scoped_accesses_infrequently: {
          actors: {
            buckets: [
              {
                key: 'user:a',
                targets: {
                  buckets: [{ key: 'host:jump', first: { value_as_string: day(-3, 2) } }],
                },
              },
              {
                key: 'user:a@laptop@local',
                targets: {
                  buckets: [{ key: 'host:jump', first: { value_as_string: day(-4, 1) } }],
                },
              },
            ],
          },
        },
      },
    } as never);
    const result = await fetchRelationshipFirstSeen({
      esClient: es,
      spaceId: 'default',
      requests: [request],
    });
    expect(result.historyStartByKind).toEqual({ accesses_infrequently: day(-30) });
    expect(result.firstSeen.get(relationshipKey(request))).toBe(day(-4, 1));
    expect(es.search.mock.calls[0][0]).toMatchObject({
      index: 'entities-metadata-default',
      size: 0,
      query: { term: { 'event.action': 'relationship_observed' } },
    });
  });

  it('reports a kind with no metadata as having no history', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search.mockResolvedValue({
      aggregations: {
        history_accesses_infrequently: { start: { value_as_string: undefined } },
        scoped_accesses_infrequently: { actors: { buckets: [] } },
      },
    } as never);
    const result = await fetchRelationshipFirstSeen({
      esClient: es,
      spaceId: 'default',
      requests: [request],
    });
    expect(result.historyStartByKind).toEqual({});
    expect(result.firstSeen.size).toBe(0);
  });
});
