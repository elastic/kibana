/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { EntityDefinition } from '../../../common/domain/definitions/entity_schema';
import { getEuidEsqlEvaluation } from '../../../common/domain/euid/esql';
import type { PaginationFields } from './query_builder_commons';
import {
  buildExtractionSourceClause,
  buildFieldEvaluations,
  type PaginationParams,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  MAIN_ENTITY_ID_FIELD,
  TIMESTAMP_FIELD,
  aggregationStats,
  fieldsToKeep,
  getPaginationWhereClause,
  extractPaginationParams,
} from './query_builder_commons';

const CCS_FIELDS_TO_KEEP = [
  TIMESTAMP_FIELD,
  MAIN_ENTITY_ID_FIELD,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
];

export const CCS_PAGINATION_FIELDS: PaginationFields = {
  timestampField: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  idField: MAIN_ENTITY_ID_FIELD,
  idFieldExprForWhere: MAIN_ENTITY_ID_FIELD,
};

export interface CcsLogsExtractionQueryParams {
  indexPatterns: string[];
  entityDefinition: EntityDefinition;
  fromDateISO: string;
  toDateISO: string;
  docsLimit: number;
  recoveryId?: string;
  pagination?: PaginationParams;
}

/**
 * Builds ESQL for CCS-only extraction: same aggregation as main but no LOOKUP JOIN.
 * Writes partial entities to updates with @timestamp = nowISO so the next run intakes them.
 */
export function buildCcsLogsExtractionEsqlQuery({
  indexPatterns,
  entityDefinition: { fields, type },
  fromDateISO,
  toDateISO,
  docsLimit,
  recoveryId,
  pagination,
}: CcsLogsExtractionQueryParams): string {
  return (
    `SET unmapped_fields="nullify";
    ${buildExtractionSourceClause({ indexPatterns, type, fromDateISO, toDateISO, recoveryId })}` +
    buildFieldEvaluations(type) +
    `| EVAL ${MAIN_ENTITY_ID_FIELD} = ${getEuidEsqlEvaluation(type)}
    | STATS
      ${TIMESTAMP_FIELD} = MAX(${TIMESTAMP_FIELD}),
      ${ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD} = MIN(${TIMESTAMP_FIELD}),
      ${aggregationStats(fields, false)}
      BY ${MAIN_ENTITY_ID_FIELD}` +
    `
    | SORT ${ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD} ASC, ${MAIN_ENTITY_ID_FIELD} ASC
    ${getPaginationWhereClause(
      CCS_PAGINATION_FIELDS,
      pagination,
      recoveryId ? { fromDateISO, recoveryId } : undefined
    )}
    | KEEP ${fieldsToKeep(fields, CCS_FIELDS_TO_KEEP)}
    | LIMIT ${docsLimit}`
  );
}

export function extractCcsPaginationParams(
  esqlResponse: ESQLSearchResponse,
  maxDocs: number
): PaginationParams | undefined {
  return extractPaginationParams(esqlResponse, maxDocs, CCS_PAGINATION_FIELDS);
}
