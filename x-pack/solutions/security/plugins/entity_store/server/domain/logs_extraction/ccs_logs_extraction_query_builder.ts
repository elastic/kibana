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
  buildSetFieldsByCondition,
  type PaginationParams,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  MAIN_ENTITY_ID_FIELD,
  TIMESTAMP_FIELD,
  aggregationStats,
  fieldsToKeep,
  extractPaginationParams,
  buildPaginationSection,
  hasFieldEvaluations,
} from './query_builder_commons';

const CCS_FIELDS_TO_KEEP = [
  TIMESTAMP_FIELD,
  MAIN_ENTITY_ID_FIELD,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
];

export const CCS_PAGINATION_FIELDS: PaginationFields = {
  timestampField: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  finalIdField: MAIN_ENTITY_ID_FIELD,
  idFieldInQuery: MAIN_ENTITY_ID_FIELD,
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
  entityDefinition,
  fromDateISO,
  toDateISO,
  docsLimit,
  recoveryId,
  pagination,
}: CcsLogsExtractionQueryParams): string {
  const { fields, type } = entityDefinition;

  const parts = [];

  // Because we don't have updates on remote clusters, we need to nullify the unmapped fields
  parts.push(`SET unmapped_fields="nullify";`);

  // FROM and WHERE
  parts.push(
    buildExtractionSourceClause({ indexPatterns, type, fromDateISO, toDateISO, recoveryId })
  );

  // Special evaluations for entity id
  if (hasFieldEvaluations(entityDefinition)) {
    parts.push(buildFieldEvaluations(entityDefinition));
  }

  if (entityDefinition.whenConditionTrueSetFieldsPreAgg?.length) {
    for (const entry of entityDefinition.whenConditionTrueSetFieldsPreAgg) {
      parts.push(buildSetFieldsByCondition(entry));
    }
  }

  // Builds the id
  parts.push(`| EVAL ${MAIN_ENTITY_ID_FIELD} = ${getEuidEsqlEvaluation(type)}`);

  // Main stats aggregation from incoming data
  parts.push(`| STATS
    ${TIMESTAMP_FIELD} = MAX(${TIMESTAMP_FIELD}),
    ${ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD} = MIN(${TIMESTAMP_FIELD}),
    ${aggregationStats(fields, false)}
    BY ${MAIN_ENTITY_ID_FIELD}`);

  if (entityDefinition.whenConditionTrueSetFieldsAfterStats?.length) {
    for (const entry of entityDefinition.whenConditionTrueSetFieldsAfterStats) {
      parts.push(
        buildSetFieldsByCondition(entry, {
          entityFields: fields,
          useRecentDataPrefix: false,
        })
      );
    }
  }

  // Keep fields
  parts.push(`| KEEP ${fieldsToKeep(fields, CCS_FIELDS_TO_KEEP)}`);

  // Paginate
  parts.push(
    ...buildPaginationSection(fromDateISO, docsLimit, CCS_PAGINATION_FIELDS, pagination, recoveryId)
  );

  return parts.join('\n');
}

export function extractCcsPaginationParams(
  esqlResponse: ESQLSearchResponse,
  maxDocs: number
): PaginationParams | undefined {
  return extractPaginationParams(esqlResponse, maxDocs, CCS_PAGINATION_FIELDS);
}
