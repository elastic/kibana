/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { GeneratedQuery, NamedParams } from '../inventory/generator';
import { attributeAlertsToEntities } from './attribute_alerts';
import { assertLiteralField, MAX_EXPLAINED_ALERTS, toAlertGroups } from './esql_rows';
import { aliasVariants } from './field_aliases';
import type { AlertMatcher, KeyedAlertGroups, MatchKey } from './types';

export const V2_ALERT_INDEX = '.rule-events';

/** The most value tuples one key reads back; a PoC bound, since the join runs in memory. */
const MAX_GROUPS = 10000;

export interface V2Scope {
  /** ISO lower bound on event time. An alert counts when it has an event at or after this. */
  from: string;
  spaceId: string;
}

const SCOPE_FILTERS = ['`@timestamp` >= ?from', 'type == "alert"', '`space_id` == ?spaceId'];

const scopeParams = ({ from, spaceId }: V2Scope): NamedParams => [{ from }, { spaceId }];

/** The newest status of each alert, from its events: only the last event of any kind counts. */
const activeAlertsPipeline = (extraEval: string[] = []): string[] => [
  `FROM ${V2_ALERT_INDEX}`,
  `| WHERE ${SCOPE_FILTERS.join(' AND ')}`,
  ...extraEval,
];

interface KeyColumn {
  alertField: string;
  column: string;
}

const keyColumnsOf = (variant: MatchKey): KeyColumn[] => {
  variant.forEach(assertLiteralField);
  return variant.map((alertField, index) => ({ alertField, column: `key_${index}` }));
};

const keyEval = (columns: KeyColumn[]): string =>
  `| EVAL ${columns
    .map(({ alertField, column }) => `${column} = FIELD_EXTRACT(\`data\`, "${alertField}")`)
    .join(', ')}`;

/** An alert's later events can carry an empty payload, so each key value is the last non-null one. */
const lastKeyValues = (columns: KeyColumn[]): string[] =>
  columns.map(
    ({ column }) => `${column} = LAST(${column}, \`@timestamp\`) WHERE ${column} IS NOT NULL`
  );

/**
 * Active alerts grouped by the key's fields, which a v2 rule stores inside the flattened `data`
 * of its events. The status comes from the newest event of any kind.
 */
export const buildV2GroupQuery = (variant: MatchKey, scope: V2Scope): GeneratedQuery => {
  const columns = keyColumnsOf(variant);

  return {
    esql: [
      ...activeAlertsPipeline([keyEval(columns)]),
      `| STATS last_status = LAST(\`alert.status\`, \`@timestamp\`), ${lastKeyValues(columns).join(
        ', '
      )} BY \`alert.id\``,
      `| WHERE last_status == "active" AND ${columns
        .map(({ column }) => `${column} IS NOT NULL`)
        .join(' AND ')}`,
      `| STATS alert_ids = VALUES(\`alert.id\`) BY ${columns
        .map(({ column }) => column)
        .join(', ')}`,
      `| LIMIT ${MAX_GROUPS}`,
    ].join('\n'),
    params: scopeParams(scope),
  };
};

/** The active alerts whose group values equal one entity's values for the key, with their rule id. */
export const buildV2ExplainQuery = (
  variant: MatchKey,
  values: readonly string[],
  scope: V2Scope
): GeneratedQuery => {
  const columns = keyColumnsOf(variant);

  return {
    esql: [
      ...activeAlertsPipeline([keyEval(columns)]),
      `| STATS last_status = LAST(\`alert.status\`, \`@timestamp\`), ${lastKeyValues(columns).join(
        ', '
      )}, rule_id = LAST(\`rule.id\`, \`@timestamp\`) BY \`alert.id\``,
      `| WHERE last_status == "active" AND ${columns
        .map(({ column }, index) => `${column} == ?value${index}`)
        .join(' AND ')}`,
      '| KEEP `alert.id`, rule_id',
      `| LIMIT ${MAX_EXPLAINED_ALERTS}`,
    ].join('\n'),
    params: [
      ...scopeParams(scope),
      ...values.map((value, index) => ({ [`value${index}`]: value })),
    ],
  };
};

export const buildV2TotalQuery = (scope: V2Scope): GeneratedQuery => ({
  esql: [
    ...activeAlertsPipeline(),
    '| STATS last_status = LAST(`alert.status`, `@timestamp`) BY `alert.id`',
    '| WHERE last_status == "active"',
    '| STATS active_alerts = COUNT(*)',
  ].join('\n'),
  params: scopeParams(scope),
});

/** Matches entities to the active alerts of alerting v2 rules, through the group values in `data`. */
export const createV2AlertMatcher = ({
  esClient,
  scope,
}: {
  esClient: ElasticsearchClient;
  scope: V2Scope;
}): AlertMatcher => ({
  source: 'v2',
  match: async ({ keys, entities }) => {
    const [keyedGroups, activeAlerts] = await Promise.all([
      Promise.all(
        keys.flatMap((key) =>
          aliasVariants(key, keys).map(async (variant): Promise<KeyedAlertGroups> => {
            const { esql, params } = buildV2GroupQuery(variant, scope);
            const { values } = await esClient.esql.query({ query: esql, params, format: 'json' });
            return { key, groups: toAlertGroups(values) };
          })
        )
      ),
      (async () => {
        const { esql, params } = buildV2TotalQuery(scope);
        const { values } = await esClient.esql.query({ query: esql, params, format: 'json' });
        return Number(values[0]?.[0] ?? 0);
      })(),
    ]);

    return {
      source: 'v2',
      alertIdsByEntity: attributeAlertsToEntities(entities, keyedGroups),
      activeAlerts,
    };
  },
});
