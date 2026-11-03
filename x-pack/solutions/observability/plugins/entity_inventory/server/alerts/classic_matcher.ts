/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { GeneratedQuery } from '../inventory/generator';
import { attributeAlertsToEntities } from './attribute_alerts';
import { toAlertGroups } from './esql_rows';
import { getMatchKeys } from './match_keys';
import type { AlertGroup, AlertMatcher, KeyedAlertGroups, MatchKey } from './types';

export const CLASSIC_ALERT_INDICES = '.alerts-stack.*,.alerts-observability.*';

/** The most value tuples one key reads back; a PoC bound, since the join runs in memory. */
const MAX_GROUPS = 10000;

const ALERT_UUID = '`kibana.alert.uuid`';
const quote = (field: string): string => `\`${field}\``;

const ACTIVE_IN_SPACE_FILTERS = [
  '`kibana.alert.status` == "active"',
  'MV_CONTAINS(`kibana.space_ids`, ?spaceId)',
];

const buildQuery = (filters: string[], stats: string, spaceId: string): GeneratedQuery => ({
  esql: [
    'SET unmapped_fields="nullify";',
    `FROM ${CLASSIC_ALERT_INDICES}`,
    `| WHERE ${filters.join(' AND ')}`,
    `| ${stats}`,
    `| LIMIT ${MAX_GROUPS}`,
  ].join('\n'),
  params: [{ spaceId }],
});

/** Active alerts grouped by the key's alert fields, with the ids of the alerts in each group. */
export const buildGroupQuery = (key: MatchKey, spaceId: string): GeneratedQuery => {
  const fields = key.map(({ alertField }) => quote(alertField));
  return buildQuery(
    [...ACTIVE_IN_SPACE_FILTERS, ...fields.map((field) => `${field} IS NOT NULL`)],
    `STATS alert_ids = VALUES(${ALERT_UUID}) BY ${fields.join(', ')}`,
    spaceId
  );
};

export const buildTotalQuery = (spaceId: string): GeneratedQuery =>
  buildQuery(
    ACTIVE_IN_SPACE_FILTERS,
    `STATS active_alerts = COUNT_DISTINCT(${ALERT_UUID})`,
    spaceId
  );

const queryGroups = async (
  esClient: ElasticsearchClient,
  key: MatchKey,
  spaceId: string
): Promise<AlertGroup[]> => {
  const { esql, params } = buildGroupQuery(key, spaceId);
  const { values } = await esClient.esql.query({ query: esql, params, format: 'json' });
  return toAlertGroups(values);
};

const queryActiveAlerts = async (
  esClient: ElasticsearchClient,
  spaceId: string
): Promise<number> => {
  const { esql, params } = buildTotalQuery(spaceId);
  const { values } = await esClient.esql.query({ query: esql, params, format: 'json' });
  return Number(values[0]?.[0] ?? 0);
};

/** Matches entities to the active alerts of the classic rules, through `kibana.alert.grouping`. */
export const createClassicAlertMatcher = ({
  esClient,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
}): AlertMatcher => ({
  source: 'classic',
  match: async ({ type, entities }) => {
    const [keyedGroups, activeAlerts] = await Promise.all([
      Promise.all(
        getMatchKeys(type).map(
          async (key): Promise<KeyedAlertGroups> => ({
            key,
            groups: await queryGroups(esClient, key, spaceId),
          })
        )
      ),
      queryActiveAlerts(esClient, spaceId),
    ]);

    return {
      source: 'classic',
      alertIdsByEntity: attributeAlertsToEntities(entities, keyedGroups),
      activeAlerts,
    };
  },
});
