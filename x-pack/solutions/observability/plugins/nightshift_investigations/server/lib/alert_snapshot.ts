/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { esql } from '@elastic/esql';
import { isResponseError } from '@kbn/es-errors';
import {
  SavedObjectsErrorHelpers,
  type ElasticsearchClient,
  type SavedObjectsClientContract,
} from '@kbn/core/server';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_FLAPPING,
  ALERT_GROUP,
  ALERT_GROUPING,
  ALERT_INDEX_PATTERN,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_URL,
  ALERT_UUID,
  OBSERVABILITY_RULE_TYPE_IDS,
  STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import {
  alertSnapshotSchema,
  v2AlertSnapshotSchema,
  type InvestigationAlertSnapshot,
  type AlertSnapshot,
  type V2AlertSnapshot,
} from '../../common';

export const ALERTING_V2_RULE_SO_TYPE = 'alerting_rule';

const INVESTIGABLE_RULE_TYPE_IDS = [
  ...OBSERVABILITY_RULE_TYPE_IDS,
  ...STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
];

export const parseAlertSnapshot = (alert: Record<string, unknown>): AlertSnapshot | undefined => {
  const value = alert[ALERT_EVALUATION_VALUES] ?? alert[ALERT_EVALUATION_VALUE];
  const threshold = alert[ALERT_EVALUATION_THRESHOLD];
  const result = alertSnapshotSchema.safeParse({
    id: alert[ALERT_UUID],
    rule_id: alert[ALERT_RULE_UUID],
    rule_name: alert[ALERT_RULE_NAME],
    rule_type_id: alert[ALERT_RULE_TYPE_ID],
    rule_category: alert[ALERT_RULE_CATEGORY],
    reason: alertSnapshotSchema.shape.reason.catch(undefined).parse(alert[ALERT_REASON]),
    status: alert[ALERT_STATUS],
    start: alert[ALERT_START] ?? alert[TIMESTAMP],
    timestamp: alertSnapshotSchema.shape.timestamp.catch(undefined).parse(alert[TIMESTAMP]),
    flapping: alertSnapshotSchema.shape.flapping.catch(undefined).parse(alert[ALERT_FLAPPING]),
    url: alertSnapshotSchema.shape.url.catch(undefined).parse(alert[ALERT_URL]),
    rule_tags: alertSnapshotSchema.shape.rule_tags.catch(undefined).parse(alert[ALERT_RULE_TAGS]),
    grouping: alertSnapshotSchema.shape.grouping.catch(undefined).parse(alert[ALERT_GROUPING]),
    group: alertSnapshotSchema.shape.group.catch(undefined).parse(alert[ALERT_GROUP]),
    evaluation: alertSnapshotSchema.shape.evaluation
      .catch(undefined)
      .parse(value !== undefined || threshold !== undefined ? { value, threshold } : undefined),
    rule_parameters: alertSnapshotSchema.shape.rule_parameters
      .catch(undefined)
      .parse(alert[ALERT_RULE_PARAMETERS]),
    index_pattern: alertSnapshotSchema.shape.index_pattern
      .catch(undefined)
      .parse(alert[ALERT_INDEX_PATTERN]),
  });

  return result.success ? result.data : undefined;
};

export interface EpisodeLookup {
  esClient: ElasticsearchClient;
  getSoClient: () => SavedObjectsClientContract;
  spaceId: string;
}

const UNKNOWN = 'unknown';

const buildClassicSnapshot = (alert: Record<string, unknown>): AlertSnapshot =>
  parseAlertSnapshot(alert) ??
  alertSnapshotSchema.parse({
    id: alert[ALERT_UUID],
    rule_id: alert[ALERT_RULE_UUID] ?? UNKNOWN,
    rule_name: alert[ALERT_RULE_NAME] ?? UNKNOWN,
    rule_type_id: alert[ALERT_RULE_TYPE_ID] ?? UNKNOWN,
    rule_category: alert[ALERT_RULE_CATEGORY] ?? UNKNOWN,
    status: alert[ALERT_STATUS] ?? UNKNOWN,
    start: alert[ALERT_START] ?? alert[TIMESTAMP],
  });

const fetchClassicSnapshots = async (
  alertsClient: AlertsClient,
  alertIds: string[]
): Promise<Map<string, AlertSnapshot>> => {
  const indices = (await alertsClient.getAuthorizedAlertsIndices(INVESTIGABLE_RULE_TYPE_IDS)) ?? [];
  if (!indices.length) {
    return new Map();
  }

  const {
    hits: { hits },
  } = await alertsClient.find({
    index: indices.join(','),
    query: { terms: { [ALERT_UUID]: alertIds } },
    size: alertIds.length,
  });
  return new Map(
    hits.flatMap(({ _source: alert }) =>
      alert ? [[String(alert[ALERT_UUID]), buildClassicSnapshot({ ...alert })]] : []
    )
  );
};

const fetchRuleNames = async (
  getSoClient: () => SavedObjectsClientContract,
  ruleIds: string[]
): Promise<Map<string, string>> => {
  if (!ruleIds.length) {
    return new Map();
  }
  const { saved_objects: rules } = await getSoClient()
    .bulkGet<{ metadata?: { name?: string } }>(
      ruleIds.map((id) => ({ type: ALERTING_V2_RULE_SO_TYPE, id }))
    )
    .catch((error) => {
      if (SavedObjectsErrorHelpers.isForbiddenError(error)) return { saved_objects: [] };
      throw error;
    });
  return new Map(
    rules.flatMap((rule) =>
      'attributes' in rule && rule.attributes.metadata?.name
        ? [[rule.id, rule.attributes.metadata.name]]
        : []
    )
  );
};

const isEventsUnavailable = (error: unknown): boolean =>
  isResponseError(error) &&
  (error.statusCode === 403 ||
    error.statusCode === 404 ||
    (error.statusCode === 400 && /unknown index/i.test(error.message)));

const fetchV2Snapshots = async (
  { esClient, getSoClient, spaceId }: EpisodeLookup,
  episodeIds: string[]
): Promise<Map<string, V2AlertSnapshot>> => {
  const episodeIdValues = episodeIds.map((episodeId) => esql.str(episodeId));
  const { query } = esql`
    FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source
    | WHERE type == "alert" AND space_id == ${spaceId} AND episode.id IN (${episodeIdValues})
    | EVAL data_json = JSON_EXTRACT(_source, "$.data"), episode_id = episode.id
    | DROP _source
    | STATS
        start = MIN(@timestamp),
        last_event_timestamp = MAX(@timestamp),
        data_json = LAST(data_json, @timestamp) WHERE data_json != "{}",
        status = LAST(episode.status, @timestamp),
        severity = LAST(severity, @timestamp),
        source = LAST(source, @timestamp),
        rule_id = LAST(rule.id, @timestamp),
        group_hash = LAST(group_hash, @timestamp)
      BY episode_id`.toRequest();

  const response = await esClient.esql.query({ query, drop_null_columns: true }).catch((error) => {
    if (isEventsUnavailable(error)) return undefined;
    throw error;
  });
  if (!response) {
    return new Map();
  }

  const { columns, values } = response;
  const rows = values.map((row) =>
    Object.fromEntries(
      columns.flatMap(({ name }, index) => (row[index] === null ? [] : [[name, row[index]]]))
    )
  );
  const ruleNames = await fetchRuleNames(getSoClient, [
    ...new Set(rows.flatMap(({ rule_id: ruleId }) => (typeof ruleId === 'string' ? [ruleId] : []))),
  ]);

  return new Map(
    rows.map(({ data_json: dataJson, episode_id: id, ...fields }) => {
      const snapshot = v2AlertSnapshotSchema.parse({
        alert_version: 'v2',
        id,
        ...fields,
        rule_id: fields.rule_id ?? UNKNOWN,
        group_hash: fields.group_hash ?? UNKNOWN,
        status: fields.status ?? UNKNOWN,
        rule_name: ruleNames.get(String(fields.rule_id)),
        data: v2AlertSnapshotSchema.shape.data
          .catch(undefined)
          .parse(typeof dataJson === 'string' ? JSON.parse(dataJson) : undefined),
      });
      return [snapshot.id, snapshot];
    })
  );
};

export const fetchInvestigationAlertSnapshots = async ({
  alertsClient,
  alertIds,
  ...lookup
}: EpisodeLookup & {
  alertsClient: AlertsClient;
  alertIds: string[];
}): Promise<InvestigationAlertSnapshot[]> => {
  const ids = [...new Set(alertIds)];
  const classic = await fetchClassicSnapshots(alertsClient, ids);
  const unresolved = ids.filter((id) => !classic.has(id));
  const universal = unresolved.length
    ? await fetchV2Snapshots(lookup, unresolved)
    : new Map<string, V2AlertSnapshot>();

  const missing = unresolved.filter((id) => !universal.has(id));
  if (missing.length) {
    throw Boom.notFound(`Alert with id ${missing.join(', ')} not found`);
  }
  const resolved = new Map<string, InvestigationAlertSnapshot>([...classic, ...universal]);
  return ids.flatMap((id) => resolved.get(id) ?? []);
};
