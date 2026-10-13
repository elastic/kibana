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

// The columns that count or time something per entity (alerts, anomalies) show their group's
// total on a resolved row. They are read for the members, then rolled up per group.

/** Most members of the groups of one page, whose entity docs the enrichers read. */
const MAX_PAGE_MEMBERS = ESQL_MAX_RESULT_ROWS - 1;

/** Entities per read of a base enricher: its queries grow with the entities they list. */
const ROWS_PER_ENRICH = 200;

/** How a column of a group comes from the values of its members. */
export type RollUp = 'sum' | 'max';

/** The column that holds the group of an entity (alias or head) while its rows are rolled up. */
export const GROUP_KEY_FIELD = '_ea_group_key';

/**
 * After a STATS per entity that kept `GROUP_KEY_FIELD`, which only the members of groups with
 * aliases have: rolls the columns up per group, which then is the row, under its main entity's id.
 */
export const buildGroupRollUpSteps = (rollUps: Readonly<Record<string, RollUp>>): string[] => [
  `| WHERE ${GROUP_KEY_FIELD} IS NOT NULL`,
  `| STATS ${Object.entries(rollUps)
    .map(([field, rollUp]) => `${field} = ${rollUp === 'sum' ? 'SUM' : 'MAX'}(${field})`)
    .join(', ')} BY ${GROUP_KEY_FIELD}`,
  `| RENAME ${GROUP_KEY_FIELD} AS \`entity.id\``,
];

/** The aliases of each of the heads, as entity docs, by head id. */
export const fetchGroupMembers = async (
  args: QueryArgs,
  runQuery: EsqlRunner,
  headIds: readonly string[]
): Promise<Map<string, Row[]>> => {
  const members = await fetchPerIdChunk(runQuery, headIds, (chunk) =>
    [
      `FROM ${getEntityAlias(args.namespace)}`,
      `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IN (${toList(chunk)})`,
      buildKeepClause(args),
      `| LIMIT ${MAX_PAGE_MEMBERS + 1}`,
    ].join('\n')
  );
  if (members.length > MAX_PAGE_MEMBERS) {
    throw new Error('The groups of this page have too many members to total their columns');
  }
  const byHeadId = new Map<string, Row[]>();
  members.forEach((member) => {
    const headId = String(member[RESOLVED_TO_FIELD]);
    byHeadId.set(headId, [...(byHeadId.get(headId) ?? []), member]);
  });
  return byHeadId;
};

const isGreater = (a: unknown, b: unknown): boolean =>
  typeof a === 'number' && typeof b === 'number' ? a > b : String(a) > String(b);

const rollUpValues = (rollUp: RollUp, values: readonly unknown[]): unknown => {
  const present = values.filter((value) => value != null);
  if (!present.length) return null;
  if (rollUp === 'max') {
    return present.reduce((latest, value) => (isGreater(value, latest) ? value : latest));
  }
  return present.reduce<number>(
    (total, value) => total + (typeof value === 'number' ? value : 0),
    0
  );
};

/**
 * An enricher that totals its columns over the members of each group, for resolved rows: the
 * entities themselves are read by `enricher`, and each column is rolled up as `rollUps` says.
 * Individual rows are the entities, so they are read as they are.
 */
export const groupEnricher = (
  enricher: PageEnricher,
  rollUps: Readonly<Record<string, RollUp>>
): PageEnricher => ({
  fields: enricher.fields,
  fetch: async (pageRows, args, ctx) => {
    if (args.rowsMode !== 'resolved') return enricher.fetch(pageRows, args, ctx);

    const headIds = getEntityIds(pageRows);
    const membersByHead = await fetchGroupMembers(args, ctx.runQuery, headIds);
    const entityRows = [...pageRows, ...[...membersByHead.values()].flat()];
    const fieldsById = new Map<string, Row>();
    for (let i = 0; i < entityRows.length; i += ROWS_PER_ENRICH) {
      const fields = await enricher.fetch(entityRows.slice(i, i + ROWS_PER_ENRICH), args, ctx);
      fields.forEach((entityFields, id) => fieldsById.set(id, entityFields));
    }

    return new Map(
      headIds.map((headId) => {
        const groupFields = [headId, ...getEntityIds(membersByHead.get(headId) ?? [])].map((id) =>
          fieldsById.get(id)
        );
        return [
          headId,
          Object.fromEntries(
            Object.entries(rollUps).map(([field, rollUp]) => [
              field,
              rollUpValues(
                rollUp,
                groupFields.map((fields) => fields?.[field])
              ),
            ])
          ),
        ];
      })
    );
  },
});
