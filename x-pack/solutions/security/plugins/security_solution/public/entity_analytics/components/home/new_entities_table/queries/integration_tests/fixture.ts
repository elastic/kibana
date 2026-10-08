/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_FIELDS } from '../../common';
import type { QueryArgs, Row } from '../../common';
import { getAlertsIndex, getEntityAlias, getRiskScoreIndex } from '../esql';
import type { EsqlRunner } from '../types';

/*
 * A small entity store, with the alerts, anomalies and risk scores of its entities, whose
 * every sort order is known by construction. Timestamps are relative to the load time, so
 * the 30 day window always holds the same documents.
 *
 * Resolved rows (main entities):
 *
 * | entity.id        | name     | risk | criticality | records | alerts (open, 30d) | anomalies | risk change |
 * |------------------|----------|------|-------------|---------|--------------------|-----------|-------------|
 * | host:h1          | web-1    | 90   | high_impact | 3       | 3, last 3h ago     | –         | +30         |
 * | host:h2          | web-2    | 50   | –           | 1       | 1, last 1h ago     | 1         | 0           |
 * | host:h3          | web-3    | –    | –           | 1       | 0                  | –         | –           |
 * | service:payments | payments | 20   | –           | 1       | 0                  | –         | –           |
 * | user:alice@okta  | alice    | 70   | –           | 1       | 2, last 2h ago     | 2         | -10         |
 * | user:bob@okta    | bob      | –    | –           | 2       | 0                  | –         | –           |
 *
 * Aliases: host:h4 and host:h5 resolve to host:h1, user:carol@okta resolves to user:bob@okta.
 * Alerts are stamped with the entity id, except the one of host:h2, whose id comes from
 * `host.id`. Anomaly records carry no entity id: theirs comes from `user.name` with
 * `event.module` (okta), or from `host.name`.
 * Excluded alerts: a closed alert of host:h3, and an alert of host:h3 from 40 days ago.
 * Risk change is the current score minus the last score in the 2 hours before the window;
 * service:payments has no score there.
 */

export const NAMESPACE = 'test';
export const ENTITY_INDEX = 'entities-latest-test-concrete';
export const ANOMALY_JOB_ID = 'test_security_job';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };
const FLOAT: MappingProperty = { type: 'float' };

/** Fields the EUID pipelines read from alert and anomaly documents. */
const EUID_SOURCE_FIELDS = [
  'cloud.provider',
  'data_stream.dataset',
  'event.dataset',
  'event.kind',
  'event.module',
  'host.hostname',
  'host.id',
  'host.name',
  'service.name',
  'user.domain',
  'user.email',
  'user.id',
  'user.name',
];

const toMappings = (fields: Record<string, MappingProperty>) => ({
  properties: Object.fromEntries(Object.entries(fields)),
});

const keywordsOf = (fields: readonly string[]): Record<string, MappingProperty> =>
  Object.fromEntries(fields.map((field) => [field, KEYWORD]));

const ENTITY_MAPPINGS = toMappings({
  ...keywordsOf(ENTITY_FIELDS),
  '@timestamp': DATE,
  'entity.lifecycle.first_seen': DATE,
  'entity.risk.calculated_score_norm': FLOAT,
  'entity.risk.calculated_level': KEYWORD,
});

const ALERT_MAPPINGS = toMappings({
  ...keywordsOf(EUID_SOURCE_FIELDS),
  '@timestamp': DATE,
  'kibana.alert.entity.id': KEYWORD,
  'kibana.alert.severity': KEYWORD,
  'kibana.alert.workflow_status': KEYWORD,
});

/** Matches the anomaly queries' `.ml-anomalies-shared*`. */
const ANOMALY_INDEX = '.ml-anomalies-shared';

const ANOMALY_MAPPINGS = toMappings({
  ...keywordsOf(EUID_SOURCE_FIELDS),
  '@timestamp': DATE,
  job_id: KEYWORD,
  result_type: KEYWORD,
  is_interim: { type: 'boolean' },
  record_score: FLOAT,
});

const RISK_MAPPINGS = toMappings(
  Object.fromEntries(
    ['host', 'user', 'service'].flatMap((type) => [
      [`${type}.risk.id_field`, KEYWORD],
      [`${type}.risk.id_value`, KEYWORD],
      [`${type}.risk.calculated_score_norm`, FLOAT],
      [`${type}.risk.calculated_level`, KEYWORD],
      ['@timestamp', DATE],
    ])
  )
);

interface EntitySeed {
  id: string;
  type: 'host' | 'user' | 'service';
  name: string;
  risk?: number;
  criticality?: string;
  resolvedTo?: string;
}

const ENTITIES: readonly EntitySeed[] = [
  { id: 'host:h1', type: 'host', name: 'web-1', risk: 90, criticality: 'high_impact' },
  { id: 'host:h2', type: 'host', name: 'web-2', risk: 50 },
  { id: 'host:h3', type: 'host', name: 'web-3' },
  { id: 'host:h4', type: 'host', name: 'web-4', resolvedTo: 'host:h1' },
  { id: 'host:h5', type: 'host', name: 'web-5', resolvedTo: 'host:h1' },
  { id: 'service:payments', type: 'service', name: 'payments', risk: 20 },
  { id: 'user:alice@okta', type: 'user', name: 'alice', risk: 70 },
  { id: 'user:bob@okta', type: 'user', name: 'bob' },
  { id: 'user:carol@okta', type: 'user', name: 'carol', resolvedTo: 'user:bob@okta' },
];

const toEntityDoc = (seed: EntitySeed, now: number) => ({
  '@timestamp': new Date(now - HOUR_MS).toISOString(),
  'entity.id': seed.id,
  'entity.name': seed.name,
  'entity.EngineMetadata.Type': seed.type,
  'entity.lifecycle.first_seen': new Date(now - 20 * DAY_MS).toISOString(),
  ...(seed.risk != null ? { 'entity.risk.calculated_score_norm': seed.risk } : {}),
  ...(seed.criticality ? { 'asset.criticality': seed.criticality } : {}),
  ...(seed.resolvedTo ? { 'entity.relationships.resolution.resolved_to': seed.resolvedTo } : {}),
});

interface AlertSeed {
  entityId: string;
  /** Leaves `kibana.alert.entity.id` unset, so the EUID comes from `host.id`. */
  hostId?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  hoursAgo: number;
  status?: 'open' | 'closed';
}

const ALERTS: readonly AlertSeed[] = [
  { entityId: 'host:h1', severity: 'critical', hoursAgo: 3 },
  { entityId: 'host:h1', severity: 'high', hoursAgo: 5 },
  { entityId: 'host:h1', severity: 'high', hoursAgo: 7 },
  { entityId: 'host:h2', hostId: 'h2', severity: 'low', hoursAgo: 1 },
  { entityId: 'user:alice@okta', severity: 'medium', hoursAgo: 2 },
  { entityId: 'user:alice@okta', severity: 'medium', hoursAgo: 4 },
  { entityId: 'host:h3', severity: 'high', hoursAgo: 6, status: 'closed' },
  { entityId: 'host:h3', severity: 'high', hoursAgo: 40 * 24 },
];

const toAlertDoc = (
  { entityId, hostId, severity, hoursAgo, status = 'open' }: AlertSeed,
  now: number
) => ({
  '@timestamp': new Date(now - hoursAgo * HOUR_MS).toISOString(),
  ...(hostId ? { 'host.id': hostId } : { 'kibana.alert.entity.id': entityId }),
  'kibana.alert.severity': severity,
  'kibana.alert.workflow_status': status,
});

const toAnomalyDoc = (userName: string | undefined, hostName: string | undefined, now: number) => ({
  '@timestamp': new Date(now - 2 * HOUR_MS).toISOString(),
  job_id: ANOMALY_JOB_ID,
  result_type: 'record',
  is_interim: false,
  record_score: 50,
  ...(userName ? { 'user.name': userName, 'event.module': 'okta' } : {}),
  ...(hostName ? { 'host.name': hostName } : {}),
});

const toRiskDoc = (entityId: string, score: number, timestamp: number) => {
  const type = entityId.split(':')[0];
  return {
    '@timestamp': new Date(timestamp).toISOString(),
    [`${type}.risk.id_field`]: 'entity.id',
    [`${type}.risk.id_value`]: entityId,
    [`${type}.risk.calculated_score_norm`]: score,
  };
};

/** Reference scores: one hour before the 30 day window starts. */
const REFERENCE_SCORES: Readonly<Record<string, number>> = {
  'host:h1': 60,
  'host:h2': 50,
  'user:alice@okta': 80,
};

const bulkIndex = async (client: Client, index: string, docs: readonly object[]) => {
  const operations = docs.flatMap((doc) => [{ index: { _index: index } }, doc]);
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error(`Bulk indexing into ${index} failed`);
};

/** Creates the indices the grid reads and loads the documents above. */
export const loadFixture = async (client: Client): Promise<void> => {
  const now = Date.now();
  await client.indices.create({
    index: ENTITY_INDEX,
    settings: { index: { mode: 'lookup' } },
    mappings: ENTITY_MAPPINGS,
    aliases: { [getEntityAlias(NAMESPACE)]: {} },
  });
  await client.indices.create({ index: getAlertsIndex(NAMESPACE), mappings: ALERT_MAPPINGS });
  await client.indices.create({ index: ANOMALY_INDEX, mappings: ANOMALY_MAPPINGS });
  await client.indices.create({ index: getRiskScoreIndex(NAMESPACE), mappings: RISK_MAPPINGS });

  await bulkIndex(
    client,
    ENTITY_INDEX,
    ENTITIES.map((seed) => toEntityDoc(seed, now))
  );
  await bulkIndex(
    client,
    getAlertsIndex(NAMESPACE),
    ALERTS.map((seed) => toAlertDoc(seed, now))
  );
  await bulkIndex(client, ANOMALY_INDEX, [
    toAnomalyDoc('alice', undefined, now),
    toAnomalyDoc('alice', undefined, now),
    toAnomalyDoc(undefined, 'h2', now),
  ]);
  await bulkIndex(
    client,
    getRiskScoreIndex(NAMESPACE),
    Object.entries(REFERENCE_SCORES).map(([entityId, score]) =>
      toRiskDoc(entityId, score, now - 30 * DAY_MS - HOUR_MS)
    )
  );
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

/** Runs ES|QL on the test cluster and returns rows keyed by column name. */
export const createRunQuery =
  (client: Client): EsqlRunner =>
  async (query) => {
    const { columns, values } = await client.esql.query({ query });
    return values.map((value) =>
      Object.fromEntries(columns.map(({ name }, i) => [name, value[i]]))
    );
  };

export const getIds = (rows: readonly Row[]): unknown[] => rows.map((row) => row['entity.id']);
