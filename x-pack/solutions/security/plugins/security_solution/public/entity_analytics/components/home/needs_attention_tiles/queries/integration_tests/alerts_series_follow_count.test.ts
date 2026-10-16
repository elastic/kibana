/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { TimeRange } from '../../../entities_grid/common';
import { getAlertsIndex } from '../../../entities_grid/queries/esql';
import { buildAlertBasedTilesQuery } from '../entities_with_alerts_query';
import {
  buildAlertBasedTilesSeriesQuery,
  severeAlertsSeriesColumn,
  watchlistedSeriesColumn,
} from '../entities_with_alerts_series_query';
import {
  describeSeriesFollowsCount,
  moveWindowBack,
  readCounts,
} from './series_follow_count_suite';

/*
 * The sparkline dots must follow the tile count. Dot k is the count query with its alert window
 * moved back k steps, so this test runs the real count query once per dot and compares.
 * Alerts sit half an hour off a whole hour, so no alert is on the edge of a bucket.
 *
 * | entity.id   | watchlisted | alerts (severity, hours ago)                                   |
 * |-------------|-------------|----------------------------------------------------------------|
 * | host:a      |             | high 2.5, high 30.5                                            |
 * | host:alias  |             | critical 5.5 (resolves to host:a: one entity)                  |
 * | host:b      |             | high 100.5                                                     |
 * | user:c      | yes         | low 1.5                                                        |
 * | user:d      | yes         | critical 240.5, low 480.5                                      |
 * | host:e      |             | medium 3.5                                                     |
 * | host:f      |             | critical 1080.5                                                |
 * | host:m      |             | critical 0.5, 7.5, 13.5, 19.5, 25.5 (many buckets of a window) |
 * | host:ghost  | no entity   | high 2.5 (dropped: unknown entity)                             |
 * | host:wg     |             | critical 3.5 (its alias host:wga is watchlisted, and never alerts) |
 * | host:wh     | yes         | none (its alias host:wha has a low alert 100.5 hours ago)      |
 *
 * A group is watchlisted when any member is, whichever one alerted.
 */

const NAMESPACE = 'default';
const ENTITY_INDEX = 'entities-latest-alerts-series-test';
const HOUR_MS = 60 * 60 * 1000;

const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };

const ENTITIES: ReadonlyArray<{ id: string; watchlisted?: boolean; resolvedTo?: string }> = [
  { id: 'host:a' },
  { id: 'host:alias', resolvedTo: 'host:a' },
  { id: 'host:b' },
  { id: 'user:c', watchlisted: true },
  { id: 'user:d', watchlisted: true },
  { id: 'host:e' },
  { id: 'host:f' },
  { id: 'host:m' },
  { id: 'host:wg' },
  { id: 'host:wga', watchlisted: true, resolvedTo: 'host:wg' },
  { id: 'host:wh', watchlisted: true },
  { id: 'host:wha', resolvedTo: 'host:wh' },
];

const ALERTS: ReadonlyArray<[entityId: string, severity: string, hoursAgo: number]> = [
  ['host:a', 'high', 2.5],
  ['host:a', 'high', 30.5],
  ['host:alias', 'critical', 5.5],
  ['host:b', 'high', 100.5],
  ['user:c', 'low', 1.5],
  ['user:d', 'critical', 240.5],
  ['user:d', 'low', 480.5],
  ['host:e', 'medium', 3.5],
  ['host:f', 'critical', 1080.5],
  ['host:m', 'critical', 0.5],
  ['host:m', 'critical', 7.5],
  ['host:m', 'critical', 13.5],
  ['host:m', 'critical', 19.5],
  ['host:m', 'critical', 25.5],
  ['host:ghost', 'high', 2.5],
  ['host:wg', 'critical', 3.5],
  ['host:wha', 'low', 100.5],
];

const isoHoursAgo = (now: number, hours: number) => new Date(now - hours * HOUR_MS).toISOString();

const loadFixture = async (client: Client) => {
  const now = Date.now();
  await client.indices.create({
    index: ENTITY_INDEX,
    // In lookup mode, so the alert queries can LOOKUP JOIN it.
    settings: { index: { mode: 'lookup' } },
    mappings: {
      properties: {
        // Real entity docs have a timestamp: the alias rows must not land in a bucket with it.
        '@timestamp': DATE,
        'entity.id': KEYWORD,
        'entity.name': KEYWORD,
        'entity.attributes.watchlists': KEYWORD,
        'entity.lifecycle.first_seen': DATE,
        'entity.relationships.resolution.resolved_to': KEYWORD,
      },
    },
  });
  await client.indices.create({
    index: getAlertsIndex(NAMESPACE),
    mappings: {
      properties: {
        '@timestamp': DATE,
        'kibana.alert.entity.id': KEYWORD,
        'kibana.alert.severity': KEYWORD,
      },
    },
  });
  const operations = [
    ...ENTITIES.flatMap(({ id, watchlisted, resolvedTo }) => [
      { index: { _index: ENTITY_INDEX } },
      {
        '@timestamp': isoHoursAgo(now, 1),
        'entity.id': id,
        'entity.name': id.split(':')[1],
        'entity.lifecycle.first_seen': isoHoursAgo(now, 24 * 100),
        ...(watchlisted ? { 'entity.attributes.watchlists': 'w1' } : {}),
        ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
      },
    ]),
    ...ALERTS.flatMap(([entityId, severity, hoursAgo]) => [
      { index: { _index: getAlertsIndex(NAMESPACE) } },
      {
        '@timestamp': isoHoursAgo(now, hoursAgo),
        'kibana.alert.entity.id': entityId,
        'kibana.alert.severity': severity,
      },
    ]),
  ];
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error('Bulk indexing of the alert series fixture failed');
};

const COUNT_COLUMNS = ['severe_alerts_count', 'watchlisted_count'];
const buildCount = (range: TimeRange) => buildAlertBasedTilesQuery(ENTITY_INDEX, NAMESPACE, range);

describeSeriesFollowsCount({
  name: 'alert based tile series',
  loadFixture,
  tiles: [
    {
      name: 'Entities with alerts',
      column: severeAlertsSeriesColumn,
      // 24h: host:a (2.5h, and host:alias 5.5h), host:m (0.5 to 19.5h) and host:wg (3.5h). Not
      // host:e (medium) and not host:ghost (unknown entity).
      // 30d: host:a, host:b, host:m, host:wg, user:d (critical 10 days ago). host:f is 45 days old.
      byHand: { '24h': 3, '30d': 5 },
    },
    {
      name: 'Watchlisted',
      column: watchlistedSeriesColumn,
      // 24h: user:c (a low alert still counts) and host:wg (through its watchlisted alias).
      // 30d: those two, user:d and host:wh (its alias alerted, the main entity is watchlisted).
      byHand: { '24h': 2, '30d': 4 },
    },
  ],
  seriesQuery: (range) => buildAlertBasedTilesSeriesQuery(ENTITY_INDEX, NAMESPACE, range),
  countNow: async (range, run) => readCounts(await run(buildCount(range)), COUNT_COLUMNS),
  countStepsAgo: async (range, k, run) =>
    readCounts(
      await run(
        moveWindowBack({
          base: buildCount(range),
          // The alert window sits inside the condition that also keeps the alias rows.
          window: /@timestamp >= NOW\(\) - \d+ (days|hours)/,
          field: '@timestamp',
          range,
          k,
        })
      ),
      COUNT_COLUMNS
    ),
});
