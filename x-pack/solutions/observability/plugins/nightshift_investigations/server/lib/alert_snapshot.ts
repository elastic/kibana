/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { esql } from '@elastic/esql';
import { isResponseError } from '@kbn/es-errors';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  ALERT_EPISODE_FIELDS,
  asTypedEsqlQuery,
  buildEpisodesBaseQuery,
  rowsFromEsql,
  type AlertEpisodeEsqlRow,
} from '@kbn/alerting-v2-common-queries';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
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
  getRulesClient?: () => Promise<RulesClientApi>;
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
  getRulesClient: EpisodeLookup['getRulesClient'],
  ruleIds: string[]
): Promise<Map<string, string>> => {
  if (!getRulesClient || !ruleIds.length) {
    return new Map();
  }
  const rulesClient = await getRulesClient();
  const rules = await rulesClient.getRules(ruleIds).catch((error) => {
    if (Boom.isBoom(error) && [403, 404].includes(error.output.statusCode)) return [];
    throw error;
  });
  return new Map(rules.map(({ id, metadata }) => [id, metadata.name]));
};

const isEventsUnavailable = (error: unknown): boolean =>
  isResponseError(error) &&
  (error.statusCode === 403 ||
    error.statusCode === 404 ||
    (error.statusCode === 400 && /unknown index/i.test(error.message)));

const fetchV2Snapshots = async (
  { esClient, getRulesClient, spaceId }: EpisodeLookup,
  episodeIds: string[]
): Promise<Map<string, V2AlertSnapshot>> => {
  const episodeQuery = buildEpisodesBaseQuery(spaceId).where`episode.id IN (${episodeIds.map(
    (episodeId) => esql.str(episodeId)
  )})`.keep(...ALERT_EPISODE_FIELDS);
  const typedQuery = asTypedEsqlQuery<AlertEpisodeEsqlRow>(episodeQuery);

  const response = await esClient.esql
    .query({ query: episodeQuery.print('basic') })
    .catch((error) => {
      if (isEventsUnavailable(error)) return undefined;
      throw error;
    });
  if (!response) {
    return new Map();
  }

  const episodes = rowsFromEsql(typedQuery, response as ESQLSearchResponse);
  const ruleNames = await fetchRuleNames(getRulesClient, [
    ...new Set(episodes.map((episode) => episode['rule.id'])),
  ]);

  return new Map(
    episodes.map((episode) => {
      const snapshot = v2AlertSnapshotSchema.parse({
        alert_version: 'v2',
        id: episode['episode.id'],
        rule_id: episode['rule.id'],
        rule_name: ruleNames.get(episode['rule.id']),
        group_hash: episode.group_hash,
        status: episode['episode.status'],
        start: episode.first_timestamp,
        last_event_timestamp: episode.last_timestamp,
        severity: episode.severity ?? undefined,
        source: episode.source ?? undefined,
        data: v2AlertSnapshotSchema.shape.data
          .catch(undefined)
          .parse(episode.episode_data ? JSON.parse(episode.episode_data) : undefined),
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
