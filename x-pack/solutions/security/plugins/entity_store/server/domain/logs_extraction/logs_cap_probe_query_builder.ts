/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../common/domain/definitions/entity_schema';
import { buildExtractionSourceClause, TIMESTAMP_FIELD } from './query_builder_commons';

export const ROW_COUNT_COLUMN = 'row_count';
export const CAP_TS_COLUMN = 'cap_ts';

export function buildLogsPerCycleCapProbeQuery(params: {
  indexPatterns: string[];
  type: EntityType;
  fromDateISO: string;
  toDateISO: string;
  recoveryId?: string;
  maxLogsPerCycle: number;
}): string {
  const source = buildExtractionSourceClause({
    indexPatterns: params.indexPatterns,
    type: params.type,
    fromDateISO: params.fromDateISO,
    toDateISO: params.toDateISO,
    recoveryId: params.recoveryId,
  });

  // Nullify unmapped to work with CCS too
  return `SET unmapped_fields="nullify";
  ${source}
| KEEP ${TIMESTAMP_FIELD}
| SORT ${TIMESTAMP_FIELD} ASC
| LIMIT ${params.maxLogsPerCycle}
| STATS ${ROW_COUNT_COLUMN} = COUNT(), ${CAP_TS_COLUMN} = MAX(${TIMESTAMP_FIELD})`;
}
