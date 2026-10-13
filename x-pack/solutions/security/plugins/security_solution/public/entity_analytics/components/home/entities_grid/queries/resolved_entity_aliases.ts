/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESOLVED_TO_FIELD, getEntityIds } from '../common';
import type { QueryArgs, Row } from '../common';
import {
  ENTITY_TYPE_FILTER,
  ESQL_MAX_RESULT_ROWS,
  buildKeepClause,
  fetchPerIdChunk,
  getEntityAlias,
  toList,
} from './esql';
import type { EsqlRunner, PageEnricher } from './types';

// The columns that count or time something per entity (alerts, anomalies) show the total over
// the resolved entity and its aliases on a resolved row. They are read for the aliases, then
// aggregated per resolved entity.

/** Most aliases of the resolved entities of one page, whose entity docs the enrichers read. */
const MAX_PAGE_ALIASES = ESQL_MAX_RESULT_ROWS - 1;

/** Entities per read of a base enricher: its queries grow with the entities they list. */
const ROWS_PER_ENRICH = 200;

/** The ES|QL aggregation that gives a column of a resolved entity from its aliases' values. */
export type ResolvedEntityAggregation = 'SUM' | 'MAX';

/** The column that holds the resolved entity of an entity (alias or itself) while it aggregates. */
export const RESOLVED_ENTITY_KEY_FIELD = '_ea_resolved_entity_key';

/**
 * After a STATS per entity that kept `RESOLVED_ENTITY_KEY_FIELD`, which only the aliases of
 * resolved entities and these have: aggregates the columns per resolved entity, which then is
 * the row, under its own id.
 */
export const buildResolvedEntityAggregationSteps = (
  aggregations: Readonly<Record<string, ResolvedEntityAggregation>>
): string[] => [
  `| WHERE ${RESOLVED_ENTITY_KEY_FIELD} IS NOT NULL`,
  `| STATS ${Object.entries(aggregations)
    .map(([field, aggregation]) => `${field} = ${aggregation}(${field})`)
    .join(', ')} BY ${RESOLVED_ENTITY_KEY_FIELD}`,
  `| RENAME ${RESOLVED_ENTITY_KEY_FIELD} AS \`entity.id\``,
];

/** The aliases of each of the resolved entities, as entity docs, by the id of the latter. */
export const fetchEntityAliases = async (
  args: QueryArgs,
  runQuery: EsqlRunner,
  resolvedEntityIds: readonly string[]
): Promise<Map<string, Row[]>> => {
  const aliases = await fetchPerIdChunk(runQuery, resolvedEntityIds, (chunk) =>
    [
      `FROM ${getEntityAlias(args.namespace)}`,
      `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IN (${toList(chunk)})`,
      buildKeepClause(args),
      `| LIMIT ${MAX_PAGE_ALIASES + 1}`,
    ].join('\n')
  );
  if (aliases.length > MAX_PAGE_ALIASES) {
    throw new Error(
      'The resolved entities of this page have too many aliases to total their columns'
    );
  }
  const byResolvedEntityId = new Map<string, Row[]>();
  aliases.forEach((alias) => {
    const resolvedEntityId = String(alias[RESOLVED_TO_FIELD]);
    byResolvedEntityId.set(resolvedEntityId, [
      ...(byResolvedEntityId.get(resolvedEntityId) ?? []),
      alias,
    ]);
  });
  return byResolvedEntityId;
};

const isGreater = (a: unknown, b: unknown): boolean =>
  typeof a === 'number' && typeof b === 'number' ? a > b : String(a) > String(b);

const aggregateValues = (
  aggregation: ResolvedEntityAggregation,
  values: readonly unknown[]
): unknown => {
  const present = values.filter((value) => value != null);
  if (!present.length) return null;
  if (aggregation === 'MAX') {
    return present.reduce((latest, value) => (isGreater(value, latest) ? value : latest));
  }
  return present.reduce<number>(
    (total, value) => total + (typeof value === 'number' ? value : 0),
    0
  );
};

/**
 * An enricher that totals its columns over the resolved entity and its aliases, for resolved
 * rows: the entities themselves are read by `enricher`, and each column is aggregated as
 * `aggregations` says. Individual rows are the entities, so they are read as they are.
 */
export const resolvedEntityEnricher = (
  enricher: PageEnricher,
  aggregations: Readonly<Record<string, ResolvedEntityAggregation>>
): PageEnricher => ({
  fields: enricher.fields,
  fetch: async (pageRows, args, ctx) => {
    if (args.rowsMode !== 'resolved') return enricher.fetch(pageRows, args, ctx);

    const resolvedEntityIds = getEntityIds(pageRows);
    const aliasesById = await fetchEntityAliases(args, ctx.runQuery, resolvedEntityIds);
    const entityRows = [...pageRows, ...[...aliasesById.values()].flat()];
    const fieldsById = new Map<string, Row>();
    for (let i = 0; i < entityRows.length; i += ROWS_PER_ENRICH) {
      const fields = await enricher.fetch(entityRows.slice(i, i + ROWS_PER_ENRICH), args, ctx);
      fields.forEach((entityFields, id) => fieldsById.set(id, entityFields));
    }

    return new Map(
      resolvedEntityIds.map((id) => {
        const entityFields = [id, ...getEntityIds(aliasesById.get(id) ?? [])].map((entityId) =>
          fieldsById.get(entityId)
        );
        return [
          id,
          Object.fromEntries(
            Object.entries(aggregations).map(([field, aggregation]) => [
              field,
              aggregateValues(
                aggregation,
                entityFields.map((fields) => fields?.[field])
              ),
            ])
          ),
        ];
      })
    );
  },
});
