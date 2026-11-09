/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  buildV2GroupQuery,
  buildV2TotalQuery,
  createV2AlertMatcher,
  V2_ALERT_INDEX,
} from './v2_matcher';
import type { EntityRow, MatchKey } from './types';

const uidKey = ['k8s.pod.uid'];
const nameKey = ['k8s.pod.name', 'k8s.namespace.name'];
const scope = { from: '2026-11-03T10:00:00.000Z', spaceId: 'default' };

/** The client types a cell as a scalar, though ES|QL returns an array for a multi-value cell. */
const multiValue = (...values: string[]): string => values as never;

describe('v2 alert queries', () => {
  it('reads each key column out of the flattened data and keeps the last non-null value', () => {
    const { esql, params } = buildV2GroupQuery(nameKey, scope);

    expect(esql).toContain(`FROM ${V2_ALERT_INDEX}`);
    expect(esql).toContain('`@timestamp` >= ?from AND type == "alert" AND `space_id` == ?spaceId');
    expect(esql).toContain(
      'EVAL key_0 = FIELD_EXTRACT(`data`, "k8s.pod.name"), key_1 = FIELD_EXTRACT(`data`, "k8s.namespace.name")'
    );
    expect(esql).toContain('key_0 = LAST(key_0, `@timestamp`) WHERE key_0 IS NOT NULL');
    expect(esql).toContain('BY `alert.id`');
    expect(esql).toContain(
      'WHERE last_status == "active" AND key_0 IS NOT NULL AND key_1 IS NOT NULL'
    );
    expect(esql).toContain('STATS alert_ids = VALUES(`alert.id`) BY key_0, key_1');
    expect(params).toEqual([{ from: scope.from }, { spaceId: 'default' }]);
  });

  it('scopes the events to a space through a named parameter', () => {
    const { esql, params } = buildV2GroupQuery(uidKey, { ...scope, spaceId: 'team-a' });

    expect(esql).toContain('`space_id` == ?spaceId');
    expect(esql).not.toContain('team-a');
    expect(params).toEqual([{ from: scope.from }, { spaceId: 'team-a' }]);
  });

  it('refuses a field that is not a literal path', () => {
    const key: MatchKey = ['a"), DROP data //'];

    expect(() => buildV2GroupQuery(key, scope)).toThrow('is not a literal field path');
  });

  it('counts the alerts whose newest event is active for the total', () => {
    const { esql } = buildV2TotalQuery(scope);

    expect(esql).toContain('STATS last_status = LAST(`alert.status`, `@timestamp`) BY `alert.id`');
    expect(esql).toContain('STATS active_alerts = COUNT(*)');
  });
});

describe('createV2AlertMatcher', () => {
  const entities: EntityRow[] = [
    {
      'entity.id': 'k8s.pod:u1',
      'k8s.pod.uid': 'u1',
      'k8s.pod.name': 'cart-1',
      'k8s.namespace.name': 'checkout',
    },
    {
      'entity.id': 'k8s.pod:u2',
      'k8s.pod.uid': 'u2',
      'k8s.pod.name': 'cart-2',
      'k8s.namespace.name': 'checkout',
    },
  ];

  const createClient = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation(async ({ query }) => {
      if (query.includes('COUNT(*)')) {
        return { columns: [{ name: 'active_alerts', type: 'long' }], values: [[5]] };
      }
      if (query.includes('"kubernetes.pod.uid"')) {
        return { columns: [], values: [['v4', 'u2']] };
      }
      if (query.includes('"kubernetes.')) {
        return { columns: [], values: [] };
      }
      return query.includes('"k8s.pod.uid"')
        ? { columns: [], values: [[multiValue('v1', 'v2'), 'u1']] }
        : { columns: [], values: [['v3', 'cart-2', 'checkout']] };
    });
    return esClient;
  };

  it('attributes alerts through every key and every spelling of it, and reports the total', async () => {
    const result = await createV2AlertMatcher({ esClient: createClient(), scope }).match({
      keys: [uidKey, nameKey],
      entities,
    });

    expect(result.source).toBe('v2');
    expect(result.activeAlerts).toBe(5);
    expect(result.alertIdsByEntity.get('k8s.pod:u1')).toEqual(new Set(['v1', 'v2']));
    expect(result.alertIdsByEntity.get('k8s.pod:u2')).toEqual(new Set(['v3', 'v4']));
  });
});
