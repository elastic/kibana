/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  ANOMALY_COUNT_FIELD,
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FILTER,
  alertLookbackCutoff,
  entityAliasOf,
  keepClause,
  toList,
  sortSuffix,
  cursorClause,
} from '../common';
import type { QueryArgs, EsqlRunner, Row } from '../common';
import { buildEuidStages } from '../euid';

// ── fragments ────────────────────────────────────────────────────────────────

const ML_ANOMALY_INDICES = '.ml-anomalies-*';
const SET_UNMAPPED_NULLIFY = 'SET unmapped_fields="nullify";';
const ANOMALY_BASE_FILTER = `result_type == "record" AND is_interim == false`;

// ── query builders: anomaly_count sort ───────────────────────────────────────

const anomalyCountSortBaseQuery = (cutoff: string): string =>
  [
    `FROM ${ML_ANOMALY_INDICES}`,
    `| WHERE ${ANOMALY_BASE_FILTER} AND \`@timestamp\` >= "${cutoff}"`,
    ...buildEuidStages(),
    `| STATS ${ANOMALY_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
  ].join('\n');

export const anomalyCountSortDataQuery = ({
  namespace,
  timeRange,
  sort: { direction: dir },
  cursor,
  pageSize,
}: QueryArgs): string => {
  const inner = [
    anomalyCountSortBaseQuery(alertLookbackCutoff(timeRange)),
    `| LOOKUP JOIN ${entityAliasOf(namespace)} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    keepClause(ANOMALY_COUNT_FIELD),
    ...(cursor ? [cursorClause(cursor)] : []),
  ].join('\n');

  return [
    SET_UNMAPPED_NULLIFY,
    `FROM (`,
    inner,
    `)`,
    sortSuffix(ANOMALY_COUNT_FIELD, dir, pageSize),
  ].join('\n');
};

export const anomalyCountSortCountQuery = ({ namespace, timeRange }: QueryArgs): string =>
  [
    SET_UNMAPPED_NULLIFY,
    anomalyCountSortBaseQuery(alertLookbackCutoff(timeRange)),
    `| LOOKUP JOIN ${entityAliasOf(namespace)} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| KEEP \`${ENTITY_ID_FIELD}\``,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── enrichment ────────────────────────────────────────────────────────────────

const anomalyCountEnrichQuery = ({ timeRange }: QueryArgs, entityIds: string[]): string => {
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

/** Populates anomaly_count for a page of entity rows. */
export const enrichAnomalyCount = async (
  logger: Logger,
  pageRows: Row[],
  deps: QueryArgs,
  skip: Set<string>,
  enrichPageQuery: EsqlRunner
): Promise<void> => {
  if (skip.has(ANOMALY_COUNT_FIELD)) return;

  const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
  if (!entityIds.length) return;

  const rows = await enrichPageQuery(anomalyCountEnrichQuery(deps, entityIds)).catch(
    (e: unknown) => {
      logger.warn(`anomaly count enrich: ${e}`);
      return null;
    }
  );
  if (!rows) return;

  const byId = new Map(
    rows.map((r) => [r['entity.id'] as string, r[ANOMALY_COUNT_FIELD] as number])
  );
  for (const row of pageRows) {
    row[ANOMALY_COUNT_FIELD] = byId.get(row[ENTITY_ID_FIELD] as string) ?? 0;
  }
};
