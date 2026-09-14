/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ANOMALY_COUNT_FIELD,
  ENTITY_ID_FIELD,
  ENTITY_JOIN_FILTER,
  ML_ANOMALY_INDICES,
  indent,
  keepClause,
  toList,
  sortSuffix,
  cursorClause,
} from './common';
import type { PageCursor, QueryDeps, SortDir } from './common';
import { buildAnomalyEuidPipeline } from './alert_euid_pipeline';

// nullify unmapped fields so queries work across heterogeneous .ml-anomalies-* index mappings
// (e.g. a user-anomaly shard won't error when host.name is referenced).
const SET_UNMAPPED_NULLIFY = 'SET unmapped_fields="nullify";\n';

const ANOMALY_BASE_FILTER = `result_type == "record" AND is_interim == false`;

// ── query builders: anomaly_count sort ───────────────────────────────────────

const anomalyCountSortBaseQuery = (cutoff: string): string =>
  [
    `FROM ${ML_ANOMALY_INDICES}`,
    `| WHERE ${ANOMALY_BASE_FILTER} AND \`@timestamp\` >= "${cutoff}"`,
    ...buildAnomalyEuidPipeline(),
    `| STATS ${ANOMALY_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
  ].join('\n');

export const anomalyCountSortDataQuery = (
  { entityAlias, alertCutoff }: QueryDeps,
  cursor: PageCursor | null,
  pageSize: number,
  dir: SortDir
): string => {
  const inner = [
    anomalyCountSortBaseQuery(alertCutoff),
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_JOIN_FILTER}`,
    keepClause(ANOMALY_COUNT_FIELD),
    ...(cursor ? [cursorClause(cursor)] : []),
  ].join('\n');
  // SET must be a top-level statement — it cannot appear inside a FROM ( subquery ).
  return [
    `${SET_UNMAPPED_NULLIFY}FROM (`,
    indent(inner),
    `)`,
    sortSuffix(ANOMALY_COUNT_FIELD, dir, pageSize),
  ].join('\n');
};

export const anomalyCountSortCountQuery = ({ entityAlias, alertCutoff }: QueryDeps): string =>
  SET_UNMAPPED_NULLIFY +
  [
    anomalyCountSortBaseQuery(alertCutoff),
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_JOIN_FILTER}`,
    `| KEEP \`${ENTITY_ID_FIELD}\``,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── query builders: anomaly_count enrichment ─────────────────────────────────

export const anomalyCountEnrichQuery = (
  { alertCutoff }: QueryDeps,
  entityIds: string[]
): string => {
  const ids = toList(entityIds);
  return (
    SET_UNMAPPED_NULLIFY +
    [
      `FROM ${ML_ANOMALY_INDICES}`,
      `| WHERE ${ANOMALY_BASE_FILTER} AND \`@timestamp\` >= "${alertCutoff}"`,
      ...buildAnomalyEuidPipeline(),
      `| WHERE \`entity.id\` IN (${ids})`,
      `| STATS ${ANOMALY_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
    ].join('\n')
  );
};
