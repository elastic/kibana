/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ANOMALY_COUNT_FIELD,
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FILTER,
  alertLookbackCutoff,
  buildKeepClause,
  buildResolvedRowsFilter,
  buildFilterClause,
  buildLookupJoinClause,
  buildSearchIdInClause,
  entityAliasOf,
  toList,
  buildSortSuffix,
  buildCursorClause,
  buildEuidStages,
} from '../common';
import type { QueryArgs, RunContext, Row, ColumnDescriptor } from '../common';
import { isAbortError } from '../../../../../common/utils/exceptions';

const ML_ANOMALY_INDICES = '.ml-anomalies-*';
const SET_UNMAPPED_NULLIFY = 'SET unmapped_fields="nullify";';
const ANOMALY_BASE_FILTER = `result_type == "record" AND is_interim == false`;

// ── query builders: anomaly_count sort ───────────────────────────────────────

const buildAnomalyCountSortBaseQuery = (cutoff: string): string =>
  [
    `FROM ${ML_ANOMALY_INDICES}`,
    `| WHERE ${ANOMALY_BASE_FILTER} AND \`@timestamp\` >= "${cutoff}"`,
    ...buildEuidStages(),
    `| STATS ${ANOMALY_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
  ].join('\n');

const buildAnomalyCountSortDataQuery = (args: QueryArgs): string => {
  const {
    namespace,
    timeRange,
    sort: { direction: dir },
    cursor,
    pageSize,
    rowsMode,
    concreteEntityIndexName,
    searchExpression,
    entityExpression,
  } = args;
  const inner = [
    buildAnomalyCountSortBaseQuery(alertLookbackCutoff(timeRange)),
    ...buildSearchIdInClause(entityAliasOf(namespace), searchExpression),
    buildLookupJoinClause(concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildResolvedRowsFilter(rowsMode),
    ...buildFilterClause(entityExpression),
    buildKeepClause(args, ANOMALY_COUNT_FIELD),
    ...buildCursorClause(cursor),
  ].join('\n');

  return [
    SET_UNMAPPED_NULLIFY,
    `FROM (`,
    inner,
    `)`,
    buildSortSuffix(ANOMALY_COUNT_FIELD, dir, pageSize),
  ].join('\n');
};

const buildAnomalyCountSortCountQuery = ({
  namespace,
  timeRange,
  rowsMode,
  concreteEntityIndexName,
  searchExpression,
  entityExpression,
}: QueryArgs): string =>
  [
    SET_UNMAPPED_NULLIFY,
    buildAnomalyCountSortBaseQuery(alertLookbackCutoff(timeRange)),
    ...buildSearchIdInClause(entityAliasOf(namespace), searchExpression),
    buildLookupJoinClause(concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildResolvedRowsFilter(rowsMode),
    ...buildFilterClause(entityExpression),
    `| KEEP \`${ENTITY_ID_FIELD}\``,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── enrichment ────────────────────────────────────────────────────────────────

const buildAnomalyCountEnrichQuery = ({ timeRange }: QueryArgs, entityIds: string[]): string => {
  const ids = toList(entityIds);
  return [
    SET_UNMAPPED_NULLIFY,
    `FROM ${ML_ANOMALY_INDICES}`,
    `| WHERE ${ANOMALY_BASE_FILTER} AND \`@timestamp\` >= "${alertLookbackCutoff(timeRange)}"`,
    ...buildEuidStages(),
    `| WHERE \`entity.id\` IN (${ids})`,
    `| STATS ${ANOMALY_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
  ].join('\n');
};

const enrichAnomalyCount = async (
  pageRows: Row[],
  args: QueryArgs,
  skip: Set<string>,
  { runQuery }: RunContext
): Promise<void> => {
  if (skip.has(ANOMALY_COUNT_FIELD)) return;

  const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
  if (!entityIds.length) return;

  const rows = await runQuery(buildAnomalyCountEnrichQuery(args, entityIds)).catch((err) => {
    if (isAbortError(err)) throw err;
    return null;
  });
  if (!rows) return;

  const byId = new Map(
    rows.map((r) => [r['entity.id'] as string, r[ANOMALY_COUNT_FIELD] as number])
  );
  for (const row of pageRows) {
    row[ANOMALY_COUNT_FIELD] = byId.get(row[ENTITY_ID_FIELD] as string) ?? 0;
  }
};

// ── column descriptor ─────────────────────────────────────────────────────────

export const anomalyCountColumn = {
  id: ANOMALY_COUNT_FIELD,
  displayAsText: 'Anomalies',
  initialWidth: 120,
  isSortable: true,
  isExpandable: false,
  buildSortQuery: buildAnomalyCountSortDataQuery,
  buildCountQuery: buildAnomalyCountSortCountQuery,
  enrichPage: enrichAnomalyCount,
} as const satisfies ColumnDescriptor;
