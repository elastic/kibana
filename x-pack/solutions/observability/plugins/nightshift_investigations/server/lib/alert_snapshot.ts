/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { esql } from '@elastic/esql';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import {
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_BASE_PATH,
} from '@kbn/deeplinks-observability';
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

const OBSERVABILITY_ALERT_DETAILS_PATH = '/app/observability/alerts';

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

export const fetchAlertSnapshot = async (
  alertsClient: AlertsClient,
  alertId: string,
  basePath: string
): Promise<AlertSnapshot> => {
  const indices = (await alertsClient.getAuthorizedAlertsIndices(INVESTIGABLE_RULE_TYPE_IDS)) ?? [];
  if (!indices.length) {
    throw Boom.notFound(`Alert with id ${alertId} not found`);
  }

  const alert = await alertsClient.get({ id: alertId, index: indices.join(',') }).catch((error) => {
    if (Boom.isBoom(error) && error.output.statusCode === 404) {
      throw Boom.notFound(`Alert with id ${alertId} not found`);
    }
    throw error;
  });

  const snapshot = parseAlertSnapshot(alert);
  if (!snapshot) {
    throw Boom.badRequest('Alert does not contain the fields required for an investigation');
  }
  return {
    ...snapshot,
    url: `${basePath}${OBSERVABILITY_ALERT_DETAILS_PATH}/${encodeURIComponent(alertId)}`,
  };
};

export interface EpisodeLookup {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  spaceId: string;
  basePath: string;
}

export const fetchV2AlertSnapshot = async ({
  esClient,
  soClient,
  spaceId,
  basePath,
  episodeId,
}: EpisodeLookup & { episodeId: string }): Promise<V2AlertSnapshot> => {
  const { query } = esql`
    FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source
    | WHERE type == "alert" AND space_id == ${spaceId} AND episode.id == ${episodeId}
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

  const { columns, values } = await esClient.esql.query({ query, drop_null_columns: true });
  const [row] = values;
  if (!row) {
    throw Boom.notFound(`Alert with id ${episodeId} not found`);
  }

  const {
    data_json: dataJson,
    episode_id: id,
    ...fields
  } = Object.fromEntries(columns.map(({ name }, index) => [name, row[index]]));
  const result = v2AlertSnapshotSchema.safeParse({
    alert_version: 'v2',
    id,
    ...fields,
    data: typeof dataJson === 'string' ? JSON.parse(dataJson) : undefined,
    url: `${basePath}${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_ALERTS_PATH}/${encodeURIComponent(
      episodeId
    )}`,
  });
  if (!result.success) {
    throw Boom.badRequest('Alert does not contain the fields required for an investigation');
  }
  const {
    saved_objects: [rule],
  } = await soClient.bulkGet<{ metadata?: { name?: string } }>([
    { type: ALERTING_V2_RULE_SO_TYPE, id: result.data.rule_id },
  ]);
  return {
    ...result.data,
    rule_name: 'attributes' in rule ? rule.attributes.metadata?.name : undefined,
  };
};

export const fetchInvestigationAlertSnapshot = ({
  alertsClient,
  alertId,
  ...lookup
}: EpisodeLookup & {
  alertsClient: AlertsClient;
  alertId: string;
}): Promise<InvestigationAlertSnapshot> =>
  fetchAlertSnapshot(alertsClient, alertId, lookup.basePath).catch((error) => {
    if (Boom.isBoom(error) && error.output.statusCode === 404) {
      return fetchV2AlertSnapshot({ ...lookup, episodeId: alertId });
    }
    throw error;
  });
