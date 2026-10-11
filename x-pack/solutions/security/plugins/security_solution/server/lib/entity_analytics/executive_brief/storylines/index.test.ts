/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { BriefTimeRange } from '../../../../../common/entity_analytics/executive_brief/types';
import type { SnapshotContext } from '../snapshot/context';
import { EvidenceRegistry } from '../snapshot/evidence_registry';
import { buildStorylines } from '.';
import { FIXTURE_NOW, day } from './__fixtures__/cluster_scenarios';

jest.mock('../../../../workflows/step_types/get_alert_entities_step/get_alert_entities', () => ({
  getAlertEntities: jest.fn(async ({ alertIds }: { alertIds: string[] }) => ({
    entities: alertIds.includes('s1-alert-1')
      ? [
          { id: 'user:a.rodriguez@LAPTOP-FIN03@local', type: 'user' },
          { id: 'host:LAPTOP-FIN03', type: 'host' },
          { id: 'host:jump-box-01', type: 'host' },
          { id: 'host:docker-host-prod-01', type: 'host' },
        ]
      : [
          { id: 'user:j.chen@LAPTOP-MKT07@local', type: 'user' },
          { id: 'host:LAPTOP-MKT07', type: 'host' },
        ],
    total: 4,
    truncated: false,
  })),
}));

jest.mock('../../lead_generation/lead_data_client', () => ({
  createLeadDataClient: jest.fn(() => ({
    findLeads: jest.fn(async () => ({
      leads: [
        {
          id: 'lead-1',
          title: 'Privileged user with escalating risk',
          priority: 9,
          status: 'active',
          entity: { type: 'user', name: 'a.rodriguez', id: 'user:a.rodriguez@jump-box-01@local' },
          timestamp: day(-1, 6),
          createdAt: day(-1, 6),
          topRelatedEntities: [
            { id: 'host:LAPTOP-FIN03', type: 'host', name: 'x', kinds: ['owns'] },
          ],
        },
      ],
      total: 1,
      page: 1,
      perPage: 10,
    })),
  })),
}));

const R = 'user:a.rodriguez@acme.com@okta';
const RA = [
  'user:a.rodriguez@LAPTOP-FIN03@local',
  'user:a.rodriguez@jump-box-01@local',
  'user:a.rodriguez@docker-host-prod-01@local',
];
const C = 'user:j.chen@acme.com@okta';
const CA = 'user:j.chen@LAPTOP-MKT07@local';
const DC = 'host:DC01';

const entity = (
  id: string,
  extra: Record<string, unknown> = {},
  root: Record<string, unknown> = {}
) => ({
  entity: { id, name: id.split(':')[1].split('@')[0], ...extra },
  ...root,
});
const aliasOf = (golden: string, relationships: Record<string, unknown> = {}) => ({
  resolution: { resolved_to: golden },
  ...relationships,
});

const DOCS: Record<string, object> = {
  [R]: entity(R, {
    risk: { calculated_score_norm: 75 },
    attributes: { watchlists: ['privileged-user-monitoring-watchlist-id-default'] },
  }),
  [RA[0]]: entity(RA[0], {
    relationships: aliasOf(R, { accesses_frequently: { ids: ['host:LAPTOP-FIN03'] } }),
  }),
  [RA[1]]: entity(RA[1], {
    relationships: aliasOf(R, { accesses_infrequently: { ids: ['host:jump-box-01'] } }),
  }),
  [RA[2]]: entity(RA[2], {
    relationships: aliasOf(R, { accesses_infrequently: { ids: ['host:docker-host-prod-01'] } }),
  }),
  'host:LAPTOP-FIN03': entity('host:LAPTOP-FIN03', { risk: { calculated_score_norm: 76 } }),
  'host:jump-box-01': entity('host:jump-box-01'),
  'host:docker-host-prod-01': entity(
    'host:docker-host-prod-01',
    { risk: { calculated_score_norm: 78 } },
    { asset: { criticality: 'extreme_impact' } }
  ),
  [C]: entity(C, { risk: { calculated_score_norm: 64 } }),
  [CA]: entity(CA, { relationships: aliasOf(C) }),
  'host:LAPTOP-MKT07': entity('host:LAPTOP-MKT07', {}, { asset: { criticality: 'low_impact' } }),
  'user:svc-build@build-runner-02@local': entity('user:svc-build@build-runner-02@local'),
  'host:build-runner-02': entity('host:build-runner-02', { risk: { calculated_score_norm: 62 } }),
  [DC]: entity(DC, {}, { asset: { criticality: 'extreme_impact' } }),
  'user:t.nguyen@acme.com@okta': entity('user:t.nguyen@acme.com@okta', {
    risk: { calculated_score_norm: 71 },
  }),
};

const timeRange: BriefTimeRange = { from: day(-7, 12), to: FIXTURE_NOW, range: '7d' };

const rule = (uuid: string, name: string, tactic: string) => ({
  key: uuid,
  doc_count: 2,
  details: {
    hits: {
      hits: [
        {
          fields: {
            'kibana.alert.rule.name': [name],
            'kibana.alert.severity': ['high'],
            'kibana.alert.rule.threat.tactic.id': [tactic],
          },
        },
      ],
    },
  },
});
const pair = (u: string, h: string, count: number, rules = [rule('r1', 'Rule one', 'TA0006')]) => ({
  key: { u, h },
  doc_count: count,
  first: { value_as_string: day(-3) },
  last: { value_as_string: day(-1) },
  sev: { value: 47 },
  rules: { buckets: rules },
});
const firstAlertBucket = (tactic: string, at: string, uuid: string, name: string) => ({
  key: tactic,
  first_rule: {
    buckets: [{ ...rule(uuid, name, tactic), min_ts: { value_as_string: at } }],
  },
});

interface Overrides {
  coAlerts?: () => Promise<never>;
  casesClient?: CasesClient | undefined;
}

const buildContext = (overrides: Overrides = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.security.authenticate.mockResolvedValue({ username: 'alice' } as never);
  const notFound = Object.assign(new Error('no such index'), {
    meta: { body: { error: { type: 'index_not_found_exception' } } },
  });

  esClient.search.mockImplementation(((request: Record<string, unknown>) => {
    const index = String(request.index);
    const body = JSON.stringify(request);
    const aggs = (request.aggs ?? {}) as Record<string, unknown>;

    if (index.startsWith('.adhoc.alerts-security.attack')) return Promise.reject(notFound);
    if (index.startsWith('.alerts-security.attack.discovery')) {
      return Promise.resolve({
        hits: {
          hits: [
            {
              _id: 'ad-1',
              fields: {
                '@timestamp': [day(-1, 11)],
                'kibana.alert.attack_discovery.alert_ids': ['s1-alert-1', 's1-alert-2'],
                'kibana.alert.attack_discovery.title': [
                  'Credential theft leading to production container deployment',
                ],
                'kibana.alert.risk_score': [92],
              },
            },
            {
              _id: 'ad-2',
              fields: {
                '@timestamp': [day(-2, 16)],
                'kibana.alert.attack_discovery.alert_ids': ['s2-alert-1'],
                'kibana.alert.attack_discovery.title': ['MFA bombing to session hijack'],
                'kibana.alert.risk_score': [81],
              },
            },
          ],
        },
      });
    }
    if (index === 'entities-latest-default') {
      if (aggs.accesses_frequently) {
        return Promise.resolve({
          aggregations: {
            accesses_frequently: { buckets: [{ key: DC, doc_count: 37 }] },
            accesses_infrequently: { buckets: [] },
            communicates_with: { buckets: [] },
          },
        });
      }
      if (body.includes('entity.relationships.owns.ids') && body.includes('"size":200')) {
        return Promise.resolve({ hits: { hits: [] } });
      }
      const query = request.query as {
        terms?: Record<string, string[]>;
        bool?: { should: Array<{ terms: Record<string, string[]> }> };
      };
      if (query.terms) {
        const ids = query.terms['entity.id'];
        return Promise.resolve({
          hits: { hits: ids.flatMap((id) => (DOCS[id] ? [{ _source: DOCS[id] }] : [])) },
        });
      }
      const resolvedTo =
        query.bool?.should.find((s) => s.terms['entity.relationships.resolution.resolved_to'])
          ?.terms['entity.relationships.resolution.resolved_to'] ?? [];
      const extra = query.bool?.should.find((s) => s.terms['entity.id'])?.terms['entity.id'] ?? [];
      const aliases = Object.values(DOCS).filter((doc) => {
        const to = (
          doc as { entity: { relationships?: { resolution?: { resolved_to?: string } } } }
        ).entity.relationships?.resolution?.resolved_to;
        return to !== undefined && resolvedTo.includes(to);
      });
      return Promise.resolve({
        hits: {
          hits: [
            ...extra.flatMap((id) => (DOCS[id] ? [{ _source: DOCS[id] }] : [])),
            ...aliases.map((_source) => ({ _source })),
          ],
        },
      });
    }
    if (index.startsWith('risk-score.risk-score')) {
      const days = (values: number[]) => ({
        buckets: values.map((v, i) => ({
          key: i,
          key_as_string: day(-values.length + i + 1, 0),
          score: { value: v },
        })),
      });
      return Promise.resolve({
        aggregations: {
          host: { buckets: [{ key: 'host:docker-host-prod-01', days: days([12, 49, 78]) }] },
          user: { buckets: [{ key: R, days: days([22, 41, 58, 69, 75]) }] },
          service: { buckets: [] },
        },
      });
    }
    if (index === 'entities-metadata-default') {
      return Promise.resolve({
        aggregations: {
          history_accesses_infrequently: { start: { value_as_string: day(-30) } },
          scoped_accesses_infrequently: {
            actors: {
              buckets: [
                {
                  key: RA[1],
                  targets: {
                    buckets: [{ key: 'host:jump-box-01', first: { value_as_string: day(-3, 2) } }],
                  },
                },
                {
                  key: RA[2],
                  targets: {
                    buckets: [
                      { key: 'host:docker-host-prod-01', first: { value_as_string: day(-2, 3) } },
                    ],
                  },
                },
              ],
            },
          },
          history_accesses_frequently: { start: { value_as_string: day(-30) } },
          scoped_accesses_frequently: { actors: { buckets: [] } },
        },
      });
    }
    if (index === '.alerts-security.alerts-default') {
      if (aggs.pairs) {
        return overrides.coAlerts
          ? overrides.coAlerts()
          : Promise.resolve({
              aggregations: {
                pairs: {
                  buckets: [
                    pair(RA[0], 'host:LAPTOP-FIN03', 3),
                    pair(RA[1], 'host:jump-box-01', 4, [rule('r2', 'Outbound RDP', 'TA0008')]),
                    pair(RA[2], 'host:docker-host-prod-01', 2),
                    pair(CA, 'host:LAPTOP-MKT07', 6),
                    pair('user:svc-build@build-runner-02@local', 'host:build-runner-02', 7),
                    pair(RA[2], DC, 2),
                    pair('user:svc-build@build-runner-02@local', DC, 2),
                    pair('user:t.nguyen@acme.com@okta', 'host:noise-host', 1),
                  ],
                },
              },
            });
      }
      if (aggs.by_user) {
        return Promise.resolve({
          aggregations: {
            by_user: {
              buckets: [
                {
                  key: RA[0],
                  tactics: {
                    buckets: [
                      firstAlertBucket('TA0001', day(-5, 9), 'r5', 'Suspicious Email Attachment'),
                    ],
                  },
                },
                {
                  key: RA[1],
                  tactics: {
                    buckets: [firstAlertBucket('TA0008', day(-3, 2), 'r2', 'Outbound RDP')],
                  },
                },
              ],
            },
            by_host: { buckets: [] },
          },
        });
      }
      if (aggs.groups) {
        const filters = (aggs.groups as { filters: { filters: Record<string, unknown> } }).filters
          .filters;
        const buckets = Object.fromEntries(
          Object.entries(filters).map(([key, filter]) => {
            const isChen = JSON.stringify(filter).includes('j.chen');
            return [
              key,
              isChen
                ? {
                    statuses: { buckets: [{ key: 'acknowledged', doc_count: 6 }] },
                    cases: { buckets: [{ key: 'case-s2' }] },
                    closed: {},
                  }
                : {
                    statuses: { buckets: [{ key: 'open', doc_count: 9 }] },
                    cases: { buckets: [] },
                    closed: {},
                  },
            ];
          })
        );
        return Promise.resolve({ aggregations: { groups: { buckets } } });
      }
    }
    return Promise.reject(new Error(`unexpected search: ${index} ${body.slice(0, 200)}`));
  }) as never);

  const casesClient =
    'casesClient' in overrides
      ? overrides.casesClient
      : ({
          cases: {
            bulkGet: jest.fn().mockResolvedValue({
              cases: [
                {
                  id: 'case-s2',
                  title: 'MFA bombing on j.chen',
                  status: 'in-progress',
                  created_at: day(-1, 9),
                  updated_at: day(-1, 12),
                  closed_at: null,
                },
              ],
              errors: [],
            }),
          },
        } as unknown as CasesClient);

  const ctx: SnapshotContext = {
    spaceId: 'default',
    timeRange,
    esClient,
    request: httpServerMock.createKibanaRequest(),
    logger: loggingSystemMock.createLogger(),
    abortSignal: new AbortController().signal,
    registry: new EvidenceRegistry(),
    services: { casesClient },
  };
  return { ctx, esClient };
};

const input = {
  materialRiskEuids: ['host:docker-host-prod-01', 'user:t.nguyen@acme.com@okta'],
  riskMoverEuids: ['host:build-runner-02'],
};

describe('buildStorylines', () => {
  it('builds S1, S2 and S3 from mocked Elasticsearch data, with noise left out', async () => {
    const { ctx } = buildContext();
    const { value, sources } = await buildStorylines(ctx, input);

    const failing = Object.entries(sources).filter(([, s]) => s.status !== 'ok');
    expect(failing).toEqual([]);

    expect(value.storylines).toHaveLength(3);
    const [s1, ...rest] = value.storylines;
    expect(s1.evidenceId).toBe('STORY-1');
    expect(new Set(s1.entityEuids)).toEqual(
      new Set([R, 'host:LAPTOP-FIN03', 'host:jump-box-01', 'host:docker-host-prod-01'])
    );
    expect(s1.linkStrength).toBe('strong');
    expect(s1.response.state).toBe('unaddressed');
    expect(s1.hubEuids).toEqual([DC]);
    expect(s1.seeds.map((s) => s.kind).sort()).toEqual([
      'attack_discovery',
      'lead',
      'material_risk',
    ]);

    const s2 = rest.find((s) => s.entityEuids.includes(C));
    expect(s2?.response.state).toBe('in_progress');
    expect(s2?.response.cases).toEqual([
      {
        evidenceId: 'CASE-1',
        caseId: 'case-s2',
        title: 'MFA bombing on j.chen',
        status: 'in-progress',
      },
    ]);
    expect(s2?.events.map((e) => e.type)).toContain('case_opened');

    const s3 = rest.find((s) => s.entityEuids.includes('host:build-runner-02'));
    expect(s3?.entityEuids).toContain('user:svc-build@build-runner-02@local');
    expect(s3?.seeds.map((s) => s.kind)).toEqual(['risk_mover']);
    // The hub is attached only to storylines whose core it touches through a seed-adjacent pair.
    expect(s3?.hubEuids).toEqual([]);

    expect(s1.entityEuids).not.toContain('user:svc-build@build-runner-02@local');
    expect(value.otherNotableEntities).toEqual(['user:t.nguyen@acme.com@okta']);
  });

  it('builds the S1 timeline with evidence ids registered in rank order', async () => {
    const { ctx } = buildContext();
    const { value } = await buildStorylines(ctx, input);
    const s1 = value.storylines[0];

    const types = s1.events.map((e) => e.type);
    expect(types).toEqual(
      expect.arrayContaining([
        'alert_first',
        'ad_generated',
        'lead_created',
        'risk_jump',
        'relationship_first_seen',
      ])
    );
    expect(s1.events.map((e) => e.evidenceId)).toEqual(s1.events.map((_, i) => `EVT-1-${i + 1}`));
    expect([...s1.events.map((e) => e.at)].sort()).toEqual(s1.events.map((e) => e.at));
    expect(s1.tacticIds).toEqual(['TA0001', 'TA0008']);

    const relationshipEvent = s1.events.find((e) => e.type === 'relationship_first_seen');
    const jumpEdge = s1.edges.find(
      (e) => e.type === 'accesses_infrequently' && e.to === 'host:jump-box-01'
    );
    expect(jumpEdge?.evidenceIds).toContain(relationshipEvent?.evidenceId);

    const coAlert = s1.edges.find(
      (e) => e.type === 'co_alert' && [e.from, e.to].includes('host:jump-box-01')
    );
    expect(coAlert?.evidenceIds.length).toBeGreaterThan(0);
    expect(coAlert?.evidenceIds.every((id) => ctx.registry.has(id))).toBe(true);

    for (const storyline of value.storylines) {
      const ids = [
        storyline.evidenceId,
        ...storyline.seeds.map((s) => s.evidenceId),
        ...storyline.edges.flatMap((e) => e.evidenceIds),
        ...storyline.events.flatMap((e) => [e.evidenceId, ...e.sourceEvidenceIds]),
        ...storyline.response.cases.map((c) => c.evidenceId),
      ];
      expect(ids.filter((id) => !ctx.registry.has(id))).toEqual([]);
    }
  });

  it('is deterministic across runs', async () => {
    const first = await buildStorylines(buildContext().ctx, input);
    const second = await buildStorylines(buildContext().ctx, input);
    expect(second.value).toEqual(first.value);
  });

  it('turns a failing co-alert source into an error status and still returns discovery storylines', async () => {
    const { ctx } = buildContext({ coAlerts: () => Promise.reject(new Error('shard failure')) });
    const { value, sources } = await buildStorylines(ctx, input);
    expect(sources['storylines.coAlerts']).toMatchObject({
      status: 'error',
      message: 'shard failure',
    });
    expect(
      value.storylines.map((s) => s.seeds.some((seed) => seed.kind === 'attack_discovery'))
    ).toContain(true);
    const s1 = value.storylines.find((s) => s.entityEuids.includes(R));
    expect(s1?.edges.some((e) => e.type === 'co_alert')).toBe(false);
    // The S3 mover has no co-alert link any more: it is not a storyline, but it is not dropped.
    expect(value.otherNotableEntities).toContain('host:build-runner-02');
  });

  it('reports the cases source as disabled without a cases client, relying on alert status', async () => {
    const { ctx } = buildContext({ casesClient: undefined });
    const { value, sources } = await buildStorylines(ctx, input);
    expect(sources['storylines.cases']).toMatchObject({ status: 'disabled' });
    const s2 = value.storylines.find((s) => s.entityEuids.includes(C));
    expect(s2?.response.cases).toEqual([]);
    expect(s2?.response.state).toBe('in_progress'); // acknowledged alerts
  });

  it('degrades to empty output with explicit statuses when everything is missing', async () => {
    const { ctx, esClient } = buildContext();
    const missing = Object.assign(new Error('no such index'), {
      meta: { body: { error: { type: 'index_not_found_exception' } } },
    });
    esClient.search.mockReset();
    esClient.search.mockRejectedValue(missing);
    esClient.security.authenticate.mockRejectedValue(new Error('no'));
    const { value, sources } = await buildStorylines(ctx, {
      materialRiskEuids: [],
      riskMoverEuids: [],
    });
    // Only the (mocked) lead remains, and it has no links: listed, not dropped.
    expect(value.storylines).toEqual([]);
    expect(value.otherNotableEntities).toEqual(['user:a.rodriguez@jump-box-01@local']);
    expect(sources['storylines.attackDiscoveries']).toMatchObject({ status: 'missing_index' });
  });
});
