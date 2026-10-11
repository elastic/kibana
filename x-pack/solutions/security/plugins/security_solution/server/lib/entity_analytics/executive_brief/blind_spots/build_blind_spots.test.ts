/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { buildBlindSpots } from './build_blind_spots';
import { createTestContext } from './test_helpers';

const searchResponse = (aggregations: Record<string, unknown>, total = 0, shards = 1) => ({
  took: 1,
  timed_out: false,
  _shards: { total: shards, successful: shards, skipped: 0, failed: 0 },
  hits: { total: { value: total, relation: 'eq' as const }, hits: [] },
  aggregations,
});

const indexOf = (request: SearchRequest): string =>
  Array.isArray(request.index) ? request.index.join(',') : String(request.index);

describe('buildBlindSpots', () => {
  const setup = () => {
    const rulesClient = rulesClientMock.create();
    const lateralRule = (id: string, relatedIntegrations: Array<{ package: string }>) => ({
      id,
      name: id,
      enabled: true,
      params: {
        relatedIntegrations,
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: { id: 'TA0008', name: 'Lateral Movement' },
            technique: [{ id: 'T1021', name: 'Remote Services' }],
          },
        ],
      },
    });
    rulesClient.find.mockImplementation((async ({ options }: { options?: { filter?: string } }) =>
      options?.filter?.includes('attack-discovery')
        ? { page: 1, perPage: 1, total: 0, data: [] }
        : {
            page: 1,
            perPage: 10000,
            total: 2,
            data: [
              lateralRule('rule-rdp', [{ package: 'endpoint' }]),
              lateralRule('rule-no-integration', [{ package: 'okta' }]),
            ],
          }) as never);
    const getPackages = jest.fn().mockResolvedValue([{ name: 'endpoint', status: 'installed' }]);
    const ctx = createTestContext({
      services: {
        rulesClient,
        fleetPackageService: {
          asScoped: jest.fn().mockReturnValue({ getPackages }),
          asInternalUser: { getPackages },
        } as never,
      },
    });

    ctx.esClient.search.mockImplementation((async (request: SearchRequest) => {
      const index = indexOf(request);
      if (index === '.alerts-security.alerts-default' && request.aggs?.all_rules) {
        return searchResponse(
          {
            all_rules: {
              buckets: [
                {
                  key: 'rule-rdp',
                  doc_count: 5,
                  name: { buckets: [{ key: 'Outbound RDP' }] },
                  severity: { buckets: [{ key: 'high' }] },
                },
                {
                  key: 'rule-edr',
                  doc_count: 5,
                  name: { buckets: [{ key: 'Endpoint Security' }] },
                  severity: { buckets: [{ key: 'critical' }] },
                },
              ],
            },
            rule_tactics: {
              buckets: [
                {
                  key: 'TA0008',
                  doc_count: 5,
                  rules: { buckets: [{ key: 'rule-rdp', doc_count: 5 }] },
                },
              ],
            },
            ecs_fallback: {
              doc_count: 5,
              tactics: { buckets: [] },
              unmapped: { doc_count: 5, rules: { buckets: [{ key: 'rule-edr', doc_count: 5 }] } },
            },
          },
          10
        );
      }
      if (index.includes('attack.discovery')) {
        return searchResponse({ tactics: { buckets: [] }, latest: { value: null } }, 0, 0);
      }
      if (index === '.alerts-security.alerts-default') {
        // B8 and B17 queries.
        return searchResponse(
          {
            unattributed: { doc_count: 0 },
            critical: { doc_count: 0 },
            entities: { buckets: [] },
          },
          0
        );
      }
      if (index === 'entities-latest-default') {
        return {
          ...searchResponse({ types: { buckets: [] }, in_storylines: { ids: { buckets: [] } } }, 0),
          hits: {
            total: { value: 1, relation: 'eq' as const },
            hits: [{ _index: 'i', _id: '1', _source: { entity: { id: 'host:laptop' } } }],
          },
        };
      }
      return searchResponse({ indices: { buckets: [] } }, 0, 0);
    }) as never);
    return { ctx, rulesClient };
  };

  it('builds Lateral Movement as limited coverage with the EDR alert in Unmapped', async () => {
    const { ctx } = setup();
    const { value, sources } = await buildBlindSpots(ctx, {
      storylineEuids: ['host:laptop'],
      materialRiskEuids: ['host:laptop'],
    });

    expect(value.attackStages.stages).toHaveLength(1);
    expect(value.attackStages.stages[0]).toMatchObject({
      tacticId: 'TA0008',
      tacticName: 'Lateral Movement',
      observed: { alerts: 5, attackDiscoveries: 0, mlAnomalies: 0 },
      coverage: { enabled: 2, effective: 1 },
      flag: 'limited_coverage',
      topTechnique: { id: 'T1021', name: 'Remote Services' },
    });
    expect(value.attackStages.unmapped).toMatchObject({ alerts: 5, share: 0.5 });
    expect(ctx.registry.has('TAC-TA0008')).toBe(true);

    const signals = value.gaps.map(({ signal }) => signal);
    expect(signals).toEqual(expect.arrayContaining(['B6', 'B12', 'B16', 'B1', 'B10']));
    expect(value.gaps.find(({ signal }) => signal === 'B6')).toMatchObject({
      entityEuids: ['host:laptop'],
    });

    expect(sources.alerts_by_tactic.status).toBe('ok');
    expect(sources.detection_coverage.status).toBe('ok');
    expect(sources.attack_discovery_tactics.status).toBe('missing_index');
    expect(sources.anomalies.status).toBe('disabled');
  });

  it('turns failing sources into statuses instead of throwing', async () => {
    const { ctx } = setup();
    ctx.esClient.search.mockRejectedValue(new Error('boom'));
    const { value, sources } = await buildBlindSpots(ctx, {
      storylineEuids: [],
      materialRiskEuids: [],
    });
    expect(sources.alerts_by_tactic).toMatchObject({ status: 'error', message: 'boom' });
    expect(sources.detection_coverage.status).toBe('ok');
    // Rules still produce a stage even when alerts failed.
    expect(value.attackStages.stages.map(({ tacticId }) => tacticId)).toEqual(['TA0008']);
    // No B16 / B8 / B6 on failed or empty inputs.
    expect(value.gaps.map(({ signal }) => signal)).not.toEqual(
      expect.arrayContaining(['B16', 'B8', 'B6'])
    );
  });

  it('reports detection coverage as disabled without a rules client', async () => {
    const { ctx } = setup();
    ctx.services.rulesClient = undefined;
    const { sources } = await buildBlindSpots(ctx, { storylineEuids: [], materialRiskEuids: [] });
    expect(sources.detection_coverage.status).toBe('disabled');
  });
});
