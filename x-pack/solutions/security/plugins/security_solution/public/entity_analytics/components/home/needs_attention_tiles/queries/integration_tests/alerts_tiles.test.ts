/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { EMPTY_ENTITY_FILTERS } from '../../../entities_grid/common';
import { buildEntityFilterClauses } from '../../../entities_grid/queries/entity_filters';
import { getAlertsIndex } from '../../../entities_grid/queries/esql';
import { buildAlertBasedTilesQuery } from '../entities_with_alerts_query';

/*
 * Entities and alerts whose alert tile results are known by construction, for the 7d range:
 * the current period is the last 7 days, the previous one the 7 days before that.
 *
 * | entity.id   | first_seen | watchlisted | alerts (severity, days ago)        | notes                        |
 * |-------------|------------|-------------|------------------------------------|------------------------------|
 * | host:a      | 100d       |             | high 3                             | current severe               |
 * | host:alias  | 100d       |             | high 4                             | resolves to host:a, one entity |
 * | host:b      | 100d       |             | critical 10                        | previous severe              |
 * | user:c      | 100d       |             | high 2, critical 9                 | severe in both periods       |
 * | user:d      | 100d       | yes         | low 1                              | current watchlisted          |
 * | host:e      | 10d        | yes         | medium 11                          | previous watchlisted |
 * | host:f      | 2d         |             | low 1                              | current, low alert       |
 * | host:g      | 100d       |             | critical 5 (acknowledged)          | current severe only          |
 * | host:ghost  | no entity doc | -        | high 3                             | dropped: unknown entity      |
 * | host:c1     | 100d       |             | critical 2 (closed)                | dropped: closed alert        |
 * | user:wc     | 100d       | yes         | low 1 (closed)                     | dropped: closed alert        |
 * | host:c2     | 100d       |             | critical 9 (closed)                | dropped: closed alert        |
 *
 * Closed alerts are left out, as in the entities grid; open and acknowledged alerts count.
 *
 * Groups are judged by the group: it counts as watchlisted when ANY member, the main entity or an
 * alias, is watchlisted (that member need not be the one that alerted) and the group has an alert.
 *
 * | main entity | watchlisted | alerts                    | alias               | counted as                          |
 * |-------------|-------------|---------------------------|---------------------|-------------------------------------|
 * | host:w2     |             | high 2                    | host:w2a: yes, no alerts | current severe and watchlisted |
 * | host:w3     | yes         | none                      | host:w3a: low 1     | current watchlisted only            |
 * | host:w4     | yes         | none (no alert anywhere)  | -                   | dropped: no alert                   |
 * | host:w5     |             | none                      | host:w5a: critical 3 | current severe only                |
 * | host:w6     | yes         | none                      | host:w6a: high 10   | previous severe and watchlisted     |
 * | host:w7     | yes         | none                      | host:w7a: none      | dropped: no alert anywhere          |
 *
 * Like real entity docs, the host entities carry `host.id` and `host.name`: an alias doc read as
 * if it were an alert would then get an entity id from them, and wrongly count as an alert.
 *
 * The entity filters judge a group by its main entity, after its alerts are gathered. With the
 * Watchlists filter set to w1, host:w3 and host:w6 count though only their aliases (not on w1)
 * alerted; host:w2 does not, because its main entity is not on w1.
 */

const NAMESPACE = 'default';
const ENTITY_INDEX = 'entities-latest-alerts-tiles-test';
const DAY_MS = 24 * 60 * 60 * 1000;

const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };

interface EntitySeed {
  id: string;
  firstSeenDaysAgo: number;
  watchlisted?: boolean;
  resolvedTo?: string;
}

const ENTITIES: readonly EntitySeed[] = [
  { id: 'host:a', firstSeenDaysAgo: 100 },
  { id: 'host:alias', firstSeenDaysAgo: 100, resolvedTo: 'host:a' },
  { id: 'host:b', firstSeenDaysAgo: 100 },
  { id: 'user:c', firstSeenDaysAgo: 100 },
  { id: 'user:d', firstSeenDaysAgo: 100, watchlisted: true },
  { id: 'host:e', firstSeenDaysAgo: 10, watchlisted: true },
  { id: 'host:f', firstSeenDaysAgo: 2 },
  { id: 'host:g', firstSeenDaysAgo: 100 },
  { id: 'host:c1', firstSeenDaysAgo: 100 },
  { id: 'user:wc', firstSeenDaysAgo: 100, watchlisted: true },
  { id: 'host:c2', firstSeenDaysAgo: 100 },
  { id: 'host:w2', firstSeenDaysAgo: 100 },
  { id: 'host:w2a', firstSeenDaysAgo: 100, watchlisted: true, resolvedTo: 'host:w2' },
  { id: 'host:w3', firstSeenDaysAgo: 100, watchlisted: true },
  { id: 'host:w3a', firstSeenDaysAgo: 100, resolvedTo: 'host:w3' },
  { id: 'host:w4', firstSeenDaysAgo: 100, watchlisted: true },
  { id: 'host:w5', firstSeenDaysAgo: 100 },
  { id: 'host:w5a', firstSeenDaysAgo: 100, resolvedTo: 'host:w5' },
  { id: 'host:w6', firstSeenDaysAgo: 100, watchlisted: true },
  { id: 'host:w6a', firstSeenDaysAgo: 100, resolvedTo: 'host:w6' },
  { id: 'host:w7', firstSeenDaysAgo: 100, watchlisted: true },
  { id: 'host:w7a', firstSeenDaysAgo: 100, resolvedTo: 'host:w7' },
];

const ALERTS: ReadonlyArray<
  [entityId: string, severity: string, daysAgo: number, workflowStatus?: string]
> = [
  ['host:a', 'high', 3],
  ['host:alias', 'high', 4],
  ['host:b', 'critical', 10],
  ['user:c', 'high', 2],
  ['user:c', 'critical', 9],
  ['user:d', 'low', 1],
  ['host:e', 'medium', 11],
  ['host:f', 'low', 1],
  ['host:g', 'critical', 5, 'acknowledged'],
  ['host:ghost', 'high', 3],
  ['host:w2', 'high', 2],
  ['host:w3a', 'low', 1],
  ['host:w5a', 'critical', 3],
  ['host:w6a', 'high', 10],
  ['host:c1', 'critical', 2, 'closed'],
  ['user:wc', 'low', 1, 'closed'],
  ['host:c2', 'critical', 9, 'closed'],
];

const isoDaysAgo = (now: number, days: number) => new Date(now - days * DAY_MS).toISOString();

const loadFixture = async (client: Client) => {
  const now = Date.now();
  await client.indices.create({
    index: ENTITY_INDEX,
    // In lookup mode, so the alert query can LOOKUP JOIN it.
    settings: { index: { mode: 'lookup' } },
    mappings: {
      properties: {
        'entity.id': KEYWORD,
        'entity.name': KEYWORD,
        'host.id': KEYWORD,
        'host.name': KEYWORD,
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
        'kibana.alert.workflow_status': KEYWORD,
      },
    },
  });
  const operations = [
    ...ENTITIES.flatMap(({ id, firstSeenDaysAgo, watchlisted, resolvedTo }) => [
      { index: { _index: ENTITY_INDEX } },
      {
        'entity.id': id,
        'entity.name': id.split(':')[1],
        ...(id.startsWith('host:')
          ? { 'host.id': id.split(':')[1], 'host.name': id.split(':')[1] }
          : {}),
        'entity.lifecycle.first_seen': isoDaysAgo(now, firstSeenDaysAgo),
        ...(watchlisted ? { 'entity.attributes.watchlists': 'w1' } : {}),
        ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
      },
    ]),
    ...ALERTS.flatMap(([entityId, severity, daysAgo, workflowStatus]) => [
      { index: { _index: getAlertsIndex(NAMESPACE) } },
      {
        '@timestamp': isoDaysAgo(now, daysAgo),
        'kibana.alert.entity.id': entityId,
        'kibana.alert.severity': severity,
        ...(workflowStatus ? { 'kibana.alert.workflow_status': workflowStatus } : {}),
      },
    ]),
  ];
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error('Bulk indexing of the alert tiles fixture failed');
};

const ids = (value: unknown) => [value ?? []].flat().map(String).sort();

const ON_WATCHLIST_W1 = buildEntityFilterClauses({ ...EMPTY_ENTITY_FILTERS, watchlists: ['w1'] });

describe('alert based tiles on Elasticsearch', () => {
  let esServer: ReturnType<typeof createTestEsCluster>;
  let client: Client;

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
    client = esServer.getClient();
    await loadFixture(client);
  }, 300_000);

  afterAll(async () => {
    await esServer?.stop();
  });

  const runTiles = async (period: 'current' | 'previous', filters: string[] = []) => {
    const query = buildAlertBasedTilesQuery(ENTITY_INDEX, NAMESPACE, '7d', filters, period);
    const { columns, values } = await client.esql.query({ query });
    const row = Object.fromEntries(columns.map(({ name }, i) => [name, values[0]?.[i]]));
    return {
      columnNames: columns.map(({ name }) => name).sort(),
      severe: { count: Number(row.severe_alerts_count), ids: ids(row.severe_alerts_entity_ids) },
      watchlisted: { count: Number(row.watchlisted_count), ids: ids(row.watchlisted_entity_ids) },
    };
  };

  it('counts the current period as the last 7 days, with aliases collapsed into one entity', async () => {
    expect(await runTiles('current')).toEqual({
      columnNames: [
        'severe_alerts_count',
        'severe_alerts_entity_ids',
        'watchlisted_count',
        'watchlisted_entity_ids',
      ],
      severe: { count: 5, ids: ['host:a', 'host:g', 'host:w2', 'host:w5', 'user:c'] },
      watchlisted: { count: 3, ids: ['host:w2', 'host:w3', 'user:d'] },
    });
  });

  it('counts the previous period as the 7 days before that, by alert time, and only returns the counts', async () => {
    expect(await runTiles('previous')).toEqual({
      columnNames: ['severe_alerts_count', 'watchlisted_count'],
      severe: { count: 3, ids: [] },
      watchlisted: { count: 2, ids: [] },
    });
  });

  it('gives the delta as the current count minus the previous count', async () => {
    const [current, previous] = [await runTiles('current'), await runTiles('previous')];
    // Severe: five now (host:a, host:g, host:w2, host:w5, user:c), three before (host:b, user:c,
    // host:w6). Watchlisted: three now (user:d, host:w2, host:w3), two before (host:e, host:w6).
    expect(current.severe.count - previous.severe.count).toBe(2);
    expect(current.watchlisted.count - previous.watchlisted.count).toBe(1);
  });

  it('leaves out closed alerts, in both periods', async () => {
    const current = await runTiles('current');
    expect(current.severe.ids).not.toContain('host:c1');
    expect(current.watchlisted.ids).not.toContain('user:wc');
    // host:c2's only alert, critical and closed, is in the previous period: still three.
    expect((await runTiles('previous')).severe.count).toBe(3);
  });

  describe('with an entity filter, judged by the main entity', () => {
    it('keeps a group whose main entity passes, though only its alias alerted', async () => {
      // host:w3 is on w1 and only its alias (not on w1) alerted; host:w2's main entity is not on w1.
      const { severe, watchlisted } = await runTiles('current', ON_WATCHLIST_W1);
      expect(severe).toEqual({ count: 0, ids: [] });
      expect(watchlisted).toEqual({ count: 2, ids: ['host:w3', 'user:d'] });
    });

    it('does the same for the previous period', async () => {
      // host:w6 is on w1 and only its alias (not on w1) alerted, with a high alert.
      const { severe, watchlisted } = await runTiles('previous', ON_WATCHLIST_W1);
      expect(severe.count).toBe(1);
      expect(watchlisted.count).toBe(2);
    });
  });
});
