/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import type { QueryArgs, Row } from '../../../common';
import type { EsqlRunner } from '../../types';
import { alertsIndex } from './alerts';
import { anomaliesIndex, ANOMALY_JOB_ID } from './anomalies';
import { entitiesIndex, ENTITY_INDEX } from './entities';
import { riskScoresIndex } from './risk_scores';
import { HOUR_MS, NAMESPACE, toIsoAgo } from './fixture_index';
import type { FixtureIndex } from './fixture_index';

/*
 * A small entity store, with the alerts, anomalies and risk scores of its entities, whose
 * every sort order is known by construction. Timestamps are relative to the load time, so
 * the 30 day window always holds the same documents.
 *
 * Resolved rows (main entities):
 *
 * | entity.id        | name     | risk          | criticality | records | alerts (open, 30d)     | anomalies | risk change           | first seen |
 * |------------------|----------|---------------|-------------|---------|------------------------|-----------|-----------------------|------------|
 * | host:h1          | web-1    | 90, Critical  | high_impact | 3       | 3 (1 C, 2 H), last 3h  | –         | +30 (Moderate before) | 60d ago    |
 * | host:h2          | web-2    | 50, Moderate  | –           | 1       | 1 (L), last 1h         | 1         | 0 (Moderate before)   | 20d ago    |
 * | host:h3          | web-3    | –             | –           | 1       | 0                      | –         | –                     | 20d ago    |
 * | service:payments | payments | 20, Low       | –           | 1       | 0                      | –         | –                     | 20d ago    |
 * | user:alice@okta  | alice    | 70, High      | –           | 1       | 2 (2 M), last 2h       | 2         | -10 (High before)     | 20d ago    |
 * | user:bob@okta    | bob      | –             | –           | 2       | 0                      | –         | –                     | 20d ago    |
 *
 * Aliases: host:h4 and host:h5 resolve to host:h1, user:carol@okta resolves to user:bob@okta.
 * Alerts are stamped with the entity id, except the one of host:h2, whose id comes from
 * `host.id`. Anomaly records carry no entity id: theirs comes from `user.name` with
 * `event.module` (okta), or from `host.name`.
 * Excluded alerts: a closed alert of host:h3, and an alert of host:h3 from 40 days ago.
 * Risk change is the current score minus the last score in the 2 hours before the window;
 * service:payments has no score there. host:h2 is on watchlist `wl-1`.
 */

const FIXTURE_INDICES: readonly FixtureIndex[] = [
  entitiesIndex,
  alertsIndex,
  anomaliesIndex,
  riskScoresIndex,
];

const loadIndex = async (
  client: Client,
  { index, settings, aliases = [], fields, buildDocs }: FixtureIndex,
  now: number
) => {
  await client.indices.create({
    index,
    settings,
    aliases: Object.fromEntries(aliases.map((alias) => [alias, {}])),
    mappings: { properties: fields },
  });
  const operations = buildDocs(now).flatMap((doc) => [{ index: { _index: index } }, doc]);
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error(`Bulk indexing into ${index} failed`);
};

/** Runs ES|QL on the test cluster and returns rows keyed by column name. */
const createRunQuery =
  (client: Client): EsqlRunner =>
  async (query) => {
    const { columns, values } = await client.esql.query({ query });
    return values.map((value) =>
      Object.fromEntries(columns.map(({ name }, i) => [name, value[i]]))
    );
  };

export interface FixtureCluster {
  runQuery: EsqlRunner;
  /** The fixture's load time: the reference for its relative timestamps. */
  now: number;
  stop: () => Promise<void>;
}

/** Starts a test Elasticsearch with the fixture loaded. */
export const startFixtureCluster = async (): Promise<FixtureCluster> => {
  const esServer = createTestEsCluster({
    log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
  });
  await esServer.start();
  const client = esServer.getClient();
  const now = Date.now();
  await Promise.all(FIXTURE_INDICES.map((fixtureIndex) => loadIndex(client, fixtureIndex, now)));
  return { runQuery: createRunQuery(client), now, stop: () => esServer.stop() };
};

/** Query arguments for the fixture: the 30 day window, resolved rows, one page of 25. */
export const BASE_ARGS: QueryArgs = {
  namespace: NAMESPACE,
  timeRange: '30d',
  sort: { field: 'entity.risk.calculated_score_norm', direction: 'desc' },
  cursor: null,
  pageSize: 25,
  rowsMode: 'resolved',
  concreteEntityIndexName: ENTITY_INDEX,
  anomalyJobIds: [ANOMALY_JOB_ID],
};

export const getIds = (rows: readonly Row[]): unknown[] => rows.map((row) => row['entity.id']);

export const hoursAgo = (now: number, hours: number): string => toIsoAgo(now, hours * HOUR_MS);
