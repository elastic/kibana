/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { GeneratedQuery } from '../inventory/generator';
import { attributeAlertsToEntities } from './attribute_alerts';
import { getMatchKeys } from './match_keys';
import type { AlertGroup, AlertMatcher, EsqlValue, KeyedAlertGroups, MatchKey } from './types';

export const CLASSIC_ALERT_INDICES = '.alerts-stack.*,.alerts-observability.*';

/** The most value tuples one key reads back; a PoC bound, since the join runs in memory. */
const MAX_GROUPS = 10000;

const ALERT_UUID = '`kibana.alert.uuid`';
const quote = (field: string): string => `\`${field}\``;

const activeFilters = (ruleTag?: string): string[] => [
  '`kibana.alert.status` == "active"',
  ...(ruleTag ? ['MV_CONTAINS(`kibana.alert.rule.tags`, ?ruleTag)'] : []),
];

const buildQuery = (filters: string[], stats: string, ruleTag?: string): GeneratedQuery => ({
  esql: [
    'SET unmapped_fields="nullify";',
    `FROM ${CLASSIC_ALERT_INDICES}`,
    `| WHERE ${filters.join(' AND ')}`,
    `| ${stats}`,
    `| LIMIT ${MAX_GROUPS}`,
  ].join('\n'),
  params: ruleTag ? [{ ruleTag }] : [],
});

/** Active alerts grouped by the key's alert fields, with the ids of the alerts in each group. */
export const buildGroupQuery = (key: MatchKey, ruleTag?: string): GeneratedQuery => {
  const fields = key.map(({ alertField }) => quote(alertField));
  return buildQuery(
    [...activeFilters(ruleTag), ...fields.map((field) => `${field} IS NOT NULL`)],
    `STATS alert_ids = VALUES(${ALERT_UUID}) BY ${fields.join(', ')}`,
    ruleTag
  );
};

export const buildTotalQuery = (ruleTag?: string): GeneratedQuery =>
  buildQuery(
    activeFilters(ruleTag),
    `STATS active_alerts = COUNT_DISTINCT(${ALERT_UUID})`,
    ruleTag
  );

const toList = (value: EsqlValue | undefined): string[] => {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value.map(String) : [String(value)];
};

const queryGroups = async (
  esClient: ElasticsearchClient,
  key: MatchKey,
  ruleTag?: string
): Promise<AlertGroup[]> => {
  const { esql, params } = buildGroupQuery(key, ruleTag);
  const { values } = await esClient.esql.query({ query: esql, params, format: 'json' });
  return values.map(([alertIds, ...groupValues]) => ({
    alertIds: toList(alertIds),
    values: groupValues.map(String),
  }));
};

const queryActiveAlerts = async (
  esClient: ElasticsearchClient,
  ruleTag?: string
): Promise<number> => {
  const { esql, params } = buildTotalQuery(ruleTag);
  const { values } = await esClient.esql.query({ query: esql, params, format: 'json' });
  return Number(values[0]?.[0] ?? 0);
};

/** Matches entities to the active alerts of the classic rules, through `kibana.alert.grouping`. */
export const createClassicAlertMatcher = ({
  esClient,
  ruleTag,
}: {
  esClient: ElasticsearchClient;
  ruleTag?: string;
}): AlertMatcher => ({
  source: 'classic',
  match: async ({ type, entities }) => {
    const [keyedGroups, activeAlerts] = await Promise.all([
      Promise.all(
        getMatchKeys(type).map(
          async (key): Promise<KeyedAlertGroups> => ({
            key,
            groups: await queryGroups(esClient, key, ruleTag),
          })
        )
      ),
      queryActiveAlerts(esClient, ruleTag),
    ]);

    return {
      source: 'classic',
      alertIdsByEntity: attributeAlertsToEntities(entities, keyedGroups),
      activeAlerts,
    };
  },
});
