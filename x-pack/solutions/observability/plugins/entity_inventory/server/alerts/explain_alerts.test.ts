/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { buildExplainQuery } from './classic_matcher';
import { buildCountQueries, explainEntity, explainKeys } from './explain_alerts';
import type { EntityRow } from './types';
import { buildV2ExplainQuery } from './v2_matcher';

const uidKey = ['k8s.pod.uid'];
const nameKey = ['k8s.pod.name', 'k8s.namespace.name'];

const pod: EntityRow = {
  'entity.id': 'k8s.pod:u1',
  'k8s.pod.uid': 'u1',
  'k8s.pod.name': 'cart-1',
  'k8s.namespace.name': 'checkout',
};

describe('explain queries', () => {
  it('filters classic alerts on the entity values through named parameters', () => {
    const { esql, params } = buildExplainQuery(nameKey, ['cart-1', 'checkout'], 'default');

    expect(esql).toContain('`kibana.alert.grouping.k8s.pod.name` == ?value0');
    expect(esql).toContain('`kibana.alert.grouping.k8s.namespace.name` == ?value1');
    expect(esql).toContain(
      'KEEP `kibana.alert.uuid`, `kibana.alert.rule.name`, `kibana.alert.rule.uuid`'
    );
    expect(esql).not.toContain('cart-1');
    expect(params).toEqual([{ spaceId: 'default' }, { value0: 'cart-1' }, { value1: 'checkout' }]);
  });

  it('filters v2 alerts on the entity values after taking the last non-null key values', () => {
    const { esql, params } = buildV2ExplainQuery(uidKey, ['u1'], {
      from: '2026-11-05T10:00:00.000Z',
      spaceId: 'default',
    });

    expect(esql).toContain('key_0 = LAST(key_0, `@timestamp`) WHERE key_0 IS NOT NULL');
    expect(esql).toContain('rule_id = LAST(`rule.id`, `@timestamp`) BY `alert.id`');
    expect(esql).toContain('WHERE last_status == "active" AND key_0 == ?value0');
    expect(params).toEqual([
      { from: '2026-11-05T10:00:00.000Z' },
      { spaceId: 'default' },
      { value0: 'u1' },
    ]);
  });
});

describe('explainKeys', () => {
  const entries = [
    { columns: uidKey, source: { kind: 'identity', rank: 1 } as const },
    { columns: nameKey, source: { kind: 'extra' } as const },
  ];

  it('gives each key its source, the entity values and both spellings', () => {
    expect(explainKeys(entries, pod)).toEqual([
      {
        columns: uidKey,
        source: { kind: 'identity', rank: 1 },
        values: ['u1'],
        variants: [
          { columns: ['k8s.pod.uid'], origin: 'key' },
          { columns: ['kubernetes.pod.uid'], origin: 'alias' },
        ],
      },
      {
        columns: nameKey,
        source: { kind: 'extra' },
        values: ['cart-1', 'checkout'],
        variants: [
          { columns: nameKey, origin: 'key' },
          { columns: ['kubernetes.pod.name', 'kubernetes.namespace'], origin: 'alias' },
        ],
      },
    ]);
  });

  it('gives no values for a key the entity cannot supply', () => {
    expect(explainKeys([entries[1]], { ...pod, 'k8s.pod.name': null })[0].values).toBeNull();
  });
});

describe('explainEntity', () => {
  const run = (esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>) =>
    explainEntity({
      esClient,
      keys: [uidKey, nameKey],
      entity: pod,
      spaceId: 'default',
      from: '2026-11-05T10:00:00.000Z',
    });

  it('lists the alerts of both sources with the key, spelling and rule that matched them', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation(async ({ query }) => {
      const classic = query.includes('.alerts-stack');
      if (classic && query.includes('grouping.k8s.pod.uid')) {
        return { columns: [], values: [['a1', 'Pod rule', 'r1']] };
      }
      if (classic && query.includes('grouping.kubernetes.pod.uid')) {
        return { columns: [], values: [['a2', 'ECS pod rule', 'r2']] };
      }
      if (!classic && query.includes('"k8s.pod.uid"')) {
        return { columns: [], values: [['v1', 'rule-v2']] };
      }
      return { columns: [], values: [] };
    });

    const { alerts, errors } = await run(esClient);

    expect(errors).toEqual([]);
    expect(
      alerts.map(({ source, alertId, ruleName, ruleId, origin }) => ({
        source,
        alertId,
        ruleName,
        ruleId,
        origin,
      }))
    ).toEqual(
      expect.arrayContaining([
        {
          source: 'classic',
          alertId: 'a1',
          ruleName: 'Pod rule',
          ruleId: 'r1',
          origin: 'key',
        },
        {
          source: 'classic',
          alertId: 'a2',
          ruleName: 'ECS pod rule',
          ruleId: 'r2',
          origin: 'alias',
        },
        { source: 'v2', alertId: 'v1', ruleName: null, ruleId: 'rule-v2', origin: 'key' },
      ])
    );
    expect(alerts).toHaveLength(3);
    expect(alerts[0].groupValues).toEqual(['u1']);
  });

  it('runs every key in every spelling for both sources', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] });

    await run(esClient);

    // Two keys, two spellings each, two sources.
    expect(esClient.esql.query).toHaveBeenCalledTimes(8);
  });

  it('skips a key the entity has no values for', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] });

    await explainEntity({
      esClient,
      keys: [uidKey, nameKey],
      entity: { ...pod, 'k8s.pod.name': null },
      spaceId: 'default',
      from: '2026-11-05T10:00:00.000Z',
    });

    expect(esClient.esql.query).toHaveBeenCalledTimes(4);
  });

  it('reports a failing source and keeps the alerts of the other', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation(async ({ query }) => {
      if (!query.includes('.alerts-stack')) {
        throw new Error('index_not_found_exception: no such index [.rule-events]');
      }
      return query.includes('grouping.k8s.pod.uid')
        ? { columns: [], values: [['a1', 'Pod rule', 'r1']] }
        : { columns: [], values: [] };
    });

    const { alerts, errors } = await run(esClient);

    expect(alerts.map(({ alertId }) => alertId)).toEqual(['a1']);
    expect(errors).toEqual([
      { source: 'v2', message: 'index_not_found_exception: no such index [.rule-events]' },
    ]);
  });
});

describe('queries reported with the explanation', () => {
  it('returns every query it ran, labeled with its source, key and spelling', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] });

    const { queries } = await explainEntity({
      esClient,
      keys: [uidKey],
      entity: pod,
      spaceId: 'default',
      from: '2026-11-05T10:00:00.000Z',
    });

    expect(
      queries.map(({ source, origin, variant }) => [source, origin, variant.join('+')])
    ).toEqual([
      ['classic', 'key', 'k8s.pod.uid'],
      ['v2', 'key', 'k8s.pod.uid'],
      ['classic', 'alias', 'kubernetes.pod.uid'],
      ['v2', 'alias', 'kubernetes.pod.uid'],
    ]);
    expect(queries[0].esql).toContain('`kibana.alert.grouping.k8s.pod.uid` == ?value0');
    expect(queries[0].params).toEqual([{ spaceId: 'default' }, { value0: 'u1' }]);
    expect(queries[3].esql).toContain('FIELD_EXTRACT(`data`, "kubernetes.pod.uid")');
  });
});

describe('buildCountQueries', () => {
  it('has a group query per key, spelling and source, as the counts run them', () => {
    const queries = buildCountQueries({
      keys: [uidKey, nameKey],
      spaceId: 'default',
      from: '2026-11-05T10:00:00.000Z',
    });

    // Two keys, two spellings each, two sources.
    expect(queries).toHaveLength(8);
    expect(queries.filter(({ source }) => source === 'classic')[0].esql).toContain(
      'STATS alert_ids = VALUES(`kibana.alert.uuid`) BY `kibana.alert.grouping.k8s.pod.uid`'
    );
    expect(queries.filter(({ source }) => source === 'v2')[0].esql).toContain(
      'STATS alert_ids = VALUES(`alert.id`) BY key_0'
    );
  });
});

describe('a definition that ranks both spellings', () => {
  const ranked = [
    ['k8s.cluster.name', 'k8s.namespace.name', 'k8s.deployment.name'],
    ['orchestrator.cluster.name', 'kubernetes.namespace', 'kubernetes.deployment.name'],
  ];
  const deployment: EntityRow = {
    'entity.id': 'k8s.deployment:c1/checkout/cart',
    'k8s.cluster.name': 'c1',
    'k8s.namespace.name': 'checkout',
    'k8s.deployment.name': 'cart',
    'orchestrator.cluster.name': 'c1',
    'kubernetes.namespace': 'checkout',
    'kubernetes.deployment.name': 'cart',
  };

  it('does not repeat the alias of the first key, because the second key is that spelling', () => {
    const explained = explainKeys(
      ranked.map((columns, index) => ({
        columns,
        source: { kind: 'identity' as const, rank: index + 1 },
      })),
      deployment
    );

    expect(explained[0].variants.map(({ columns }) => columns)).toEqual([ranked[0]]);
    expect(explained[1].variants.map(({ columns }) => columns)).toEqual([ranked[1]]);
  });

  it('builds each query once', () => {
    const queries = buildCountQueries({
      keys: ranked,
      spaceId: 'default',
      from: '2026-11-06T10:00:00.000Z',
    });

    // Two keys, one spelling each, two sources.
    expect(queries).toHaveLength(4);
  });
});
