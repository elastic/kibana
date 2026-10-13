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
import { getAlertsIndex } from '../../../entities_grid/queries/esql';
import { buildAlertBasedTilesQuery } from '../entities_with_alerts_query';
import { buildEntitiesWithAnomaliesCountQuery } from '../entities_with_anomalies_query';

/*
 * The tile counts must be exact, however many entities there are. ES|QL's COUNT_DISTINCT is only
 * approximate above 3,000 distinct values (it is off by about 0.4% to 0.75% on its default setting),
 * so the counts below sit well above that: a regression to COUNT_DISTINCT would miss them.
 *
 * - 6,000 host entities, each with one high severity alert and one anomaly record in the last day.
 * - The first 3,500 are watchlisted.
 * - 100 more entities are aliases that resolve to one of the 6,000, so they must not add to a count.
 */

const NAMESPACE = 'default';
const ENTITY_INDEX = 'entities-latest-exact-counts-test';
const ANOMALY_INDEX = '.ml-anomalies-shared-exact-counts-test';
const JOBS = ['job_a'];
const ENTITIES = 6000;
const WATCHLISTED = 3500;
const ALIASES = 100;
const BULK_SIZE = 10_000;

const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };

const idOf = (i: number) => `host:exact-${String(i).padStart(5, '0')}`;

const bulk = async (client: Client, operations: object[]) => {
  for (let start = 0; start < operations.length; start += BULK_SIZE * 2) {
    const response = await client.bulk({
      operations: operations.slice(start, start + BULK_SIZE * 2),
      refresh: false,
    });
    if (response.errors) throw new Error('Bulk indexing of the exact counts fixture failed');
  }
};

const loadFixture = async (client: Client) => {
  const timestamp = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await client.indices.create({
    index: ENTITY_INDEX,
    settings: { index: { mode: 'lookup' } },
    mappings: {
      properties: {
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
  await client.indices.create({
    index: ANOMALY_INDEX,
    mappings: {
      properties: {
        '@timestamp': DATE,
        result_type: KEYWORD,
        job_id: KEYWORD,
        is_interim: { type: 'boolean' },
        record_score: { type: 'double' },
        'host.id': KEYWORD,
      },
    },
  });

  const entityOps: object[] = [];
  const alertOps: object[] = [];
  const anomalyOps: object[] = [];
  for (let i = 0; i < ENTITIES; i++) {
    entityOps.push(
      { index: { _index: ENTITY_INDEX } },
      {
        'entity.id': idOf(i),
        'entity.name': `exact-${i}`,
        'entity.lifecycle.first_seen': timestamp,
        ...(i < WATCHLISTED ? { 'entity.attributes.watchlists': 'w1' } : {}),
      }
    );
    alertOps.push(
      { index: { _index: getAlertsIndex(NAMESPACE) } },
      {
        '@timestamp': timestamp,
        'kibana.alert.entity.id': idOf(i),
        'kibana.alert.severity': 'high',
      }
    );
    anomalyOps.push(
      { index: { _index: ANOMALY_INDEX } },
      {
        '@timestamp': timestamp,
        result_type: 'record',
        job_id: JOBS[0],
        is_interim: false,
        record_score: 50,
        'host.id': `exact-${String(i).padStart(5, '0')}`,
      }
    );
  }
  // Aliases: each resolves to one of the entities above, and has an alert and a record of its own.
  for (let i = 0; i < ALIASES; i++) {
    const aliasId = `host:alias-${String(i).padStart(5, '0')}`;
    entityOps.push(
      { index: { _index: ENTITY_INDEX } },
      {
        'entity.id': aliasId,
        'entity.name': `alias-${i}`,
        'entity.lifecycle.first_seen': timestamp,
        'entity.relationships.resolution.resolved_to': idOf(i),
        ...(i < WATCHLISTED ? { 'entity.attributes.watchlists': 'w1' } : {}),
      }
    );
    alertOps.push(
      { index: { _index: getAlertsIndex(NAMESPACE) } },
      {
        '@timestamp': timestamp,
        'kibana.alert.entity.id': aliasId,
        'kibana.alert.severity': 'high',
      }
    );
    anomalyOps.push(
      { index: { _index: ANOMALY_INDEX } },
      {
        '@timestamp': timestamp,
        result_type: 'record',
        job_id: JOBS[0],
        is_interim: false,
        record_score: 50,
        'host.id': `alias-${String(i).padStart(5, '0')}`,
      }
    );
  }
  await bulk(client, entityOps);
  await bulk(client, alertOps);
  await bulk(client, anomalyOps);
  await client.indices.refresh({ index: [ENTITY_INDEX, getAlertsIndex(NAMESPACE), ANOMALY_INDEX] });
};

describe('tile counts above the COUNT_DISTINCT precision, on Elasticsearch', () => {
  let esServer: ReturnType<typeof createTestEsCluster>;
  let client: Client;

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
    client = esServer.getClient();
    await loadFixture(client);
  }, 600_000);

  afterAll(async () => {
    await esServer?.stop();
  });

  const row = async (query: string) => {
    const { columns, values } = await client.esql.query({ query });
    return Object.fromEntries(columns.map(({ name }, i) => [name, values[0]?.[i]]));
  };

  it.each(['current'] as const)(
    'counts the alert based tiles exactly for the %s period',
    async (period) => {
      const result = await row(
        buildAlertBasedTilesQuery(ENTITY_INDEX, NAMESPACE, '24h', [], period)
      );
      expect(Number(result.severe_alerts_count)).toBe(ENTITIES);
      expect(Number(result.watchlisted_count)).toBe(WATCHLISTED);
      expect(Number(result.new_alerting_count)).toBe(ENTITIES);
    }
  );

  it('counts the entities with anomalies exactly, with aliases collapsed into their entity', async () => {
    const result = await row(buildEntitiesWithAnomaliesCountQuery(ENTITY_INDEX, '24h', [], JOBS));
    expect(Number(result.value)).toBe(ENTITIES);
  });

  it('returns as many entity ids as the count says', async () => {
    const alerts = await row(buildAlertBasedTilesQuery(ENTITY_INDEX, NAMESPACE, '24h'));
    expect([alerts.severe_alerts_entity_ids].flat()).toHaveLength(
      Number(alerts.severe_alerts_count)
    );
    const anomalies = await row(
      buildEntitiesWithAnomaliesCountQuery(ENTITY_INDEX, '24h', [], JOBS)
    );
    expect([anomalies.entity_ids].flat()).toHaveLength(Number(anomalies.value));
  });
});
