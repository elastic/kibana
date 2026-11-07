/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  buildGroupQuery,
  buildTotalQuery,
  CLASSIC_ALERT_INDICES,
  createClassicAlertMatcher,
} from './classic_matcher';
import type { EntityRow } from './types';

const uidKey = ['k8s.pod.uid'];
const nameKey = ['k8s.pod.name', 'k8s.namespace.name'];

/** The client types a cell as a scalar, though ES|QL returns an array for a multi-value cell. */
const multiValue = (...values: string[]): string => values as never;

describe('classic alert queries', () => {
  it('groups active alerts by the key fields over both classic alert index families', () => {
    const { esql, params } = buildGroupQuery(nameKey, 'default');

    expect(esql).toContain('SET unmapped_fields="nullify";');
    expect(esql).toContain(`FROM ${CLASSIC_ALERT_INDICES}`);
    expect(esql).toContain('`kibana.alert.status` == "active"');
    expect(esql).toContain('`kibana.alert.grouping.k8s.pod.name` IS NOT NULL');
    expect(esql).toContain('`kibana.alert.grouping.k8s.namespace.name` IS NOT NULL');
    expect(esql).toContain(
      'STATS alert_ids = VALUES(`kibana.alert.uuid`) BY `kibana.alert.grouping.k8s.pod.name`, `kibana.alert.grouping.k8s.namespace.name`'
    );
    expect(params).toEqual([{ spaceId: 'default' }]);
  });

  it('scopes the alerts to a space through a named parameter', () => {
    const { esql, params } = buildGroupQuery(nameKey, 'team-a');

    expect(esql).toContain('MV_CONTAINS(`kibana.space_ids`, ?spaceId)');
    expect(esql).not.toContain('team-a');
    expect(params).toEqual([{ spaceId: 'team-a' }]);
  });

  it('counts the distinct active alerts for the total', () => {
    expect(buildTotalQuery('default').esql).toContain(
      'STATS active_alerts = COUNT_DISTINCT(`kibana.alert.uuid`)'
    );
  });
});

describe('createClassicAlertMatcher', () => {
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
      if (query.includes('COUNT_DISTINCT')) {
        return { columns: [{ name: 'active_alerts', type: 'long' }], values: [[7]] };
      }
      if (query.includes('grouping.kubernetes.pod.uid')) {
        return { columns: [], values: [['e1', 'u2']] };
      }
      if (query.includes('grouping.kubernetes.')) {
        return { columns: [], values: [] };
      }
      return query.includes('grouping.k8s.pod.uid')
        ? { columns: [], values: [[multiValue('a1', 'a2'), 'u1']] }
        : {
            columns: [],
            values: [
              ['a2', 'cart-2', 'checkout'],
              [multiValue('a3'), 'cart-1', 'checkout'],
            ],
          };
    });
    return esClient;
  };

  it('attributes alerts through every key and every spelling of it, and reports the total', async () => {
    const result = await createClassicAlertMatcher({
      esClient: createClient(),
      spaceId: 'default',
    }).match({
      keys: [uidKey, nameKey],
      entities,
    });

    expect(result.source).toBe('classic');
    expect(result.activeAlerts).toBe(7);
    expect(result.alertIdsByEntity.get('k8s.pod:u1')).toEqual(new Set(['a1', 'a2', 'a3']));
    expect(result.alertIdsByEntity.get('k8s.pod:u2')).toEqual(new Set(['a2', 'e1']));
  });

  it('scopes every query to the space', async () => {
    const esClient = createClient();

    await createClassicAlertMatcher({ esClient, spaceId: 'default' }).match({
      keys: [uidKey, nameKey],
      entities,
    });

    // Two keys, each in its own and its ECS spelling, and the total.
    expect(esClient.esql.query).toHaveBeenCalledTimes(5);
    esClient.esql.query.mock.calls.forEach(([request]) =>
      expect(request.params).toEqual([{ spaceId: 'default' }])
    );
  });

  it('only counts the total when there are no keys', async () => {
    const esClient = createClient();

    const result = await createClassicAlertMatcher({ esClient, spaceId: 'default' }).match({
      keys: [],
      entities,
    });

    expect(result.alertIdsByEntity.size).toBe(0);
    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
  });
});
