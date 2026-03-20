/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { recentData } from '../../../common/domain/definitions/esql';
import type { EntityDefinition } from '../../../common/domain/definitions/entity_schema';
import {
  isSingleFieldIdentity,
  type EntityField,
  type EntityType,
} from '../../../common/domain/definitions/entity_schema';
import {
  getEuidEsqlDocumentsContainsIdFilter,
  getFieldEvaluationsEsqlFromDefinition,
} from '../../../common/domain/euid/esql';

export const ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD =
  'entity.EngineMetadata.FirstSeenLogInPage';
export const ENGINE_METADATA_UNTYPED_ID_FIELD = 'entity.EngineMetadata.UntypedId';
export const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';

export const MAIN_ENTITY_ID_FIELD = 'entity.id';
export const ENTITY_NAME_FIELD = 'entity.name';
export const ENTITY_TYPE_FIELD = 'entity.type';
export const TIMESTAMP_FIELD = '@timestamp';

const METADATA_FIELDS = ['_index'];

export interface PaginationParams {
  timestampCursor: string;
  idCursor: string;
}

export interface PaginationFields {
  // Timestamp to sort and paginate on
  timestampField: string;
  // Intermediate id field used in the query for pagination
  idFieldInQuery: string;
  // Final id field kept in the result
  finalIdField: string;
}

export function buildExtractionSourceClause(params: {
  indexPatterns: string[];
  type: EntityType;
  fromDateISO: string;
  toDateISO: string;
  recoveryId?: string;
}): string {
  const { indexPatterns, type, fromDateISO, toDateISO, recoveryId } = params;
  return (
    `FROM ${indexPatterns.join(', ')}
    METADATA ${METADATA_FIELDS.join(', ')}` +
    `
  | WHERE 
      ${TIMESTAMP_FIELD} ${recoveryId ? '>=' : '>'} TO_DATETIME("${fromDateISO}")
      AND ${TIMESTAMP_FIELD} <= TO_DATETIME("${toDateISO}")
      AND (${getEuidEsqlDocumentsContainsIdFilter(type)})`
  );
}

export function aggregationStats(fields: EntityField[], renameToRecent: boolean = true): string {
  return fields
    .map((field) => {
      const { retention, destination: dest, source } = field;
      const finalDest = renameToRecent ? recentData(dest) : dest;
      const castedSrc = castSrcType(field);
      switch (retention.operation) {
        case 'collect_values':
          return `${finalDest} = MV_DEDUPE(TOP(${castedSrc}, ${retention.maxLength})) WHERE ${source} IS NOT NULL`;
        case 'prefer_newest_value':
          return `${finalDest} = LAST(${castedSrc}, ${TIMESTAMP_FIELD}) WHERE ${source} IS NOT NULL`;
        case 'prefer_oldest_value':
          return `${finalDest} = FIRST(${castedSrc}, ${TIMESTAMP_FIELD}) WHERE ${source} IS NOT NULL`;
        default:
          throw new Error('unknown field operation');
      }
    })
    .join(',\n ');
}

export function fieldsToKeep(definitionFields: EntityField[], defaultFields: string[]): string {
  const allFieldPatterns = definitionFields
    .map(({ destination }) => destination)
    .concat(defaultFields)
    .map((field) => {
      const dotIndex = field.indexOf('.');
      // not a pattern
      if (dotIndex === -1) {
        return field;
      }

      const firstPart = field.substring(0, dotIndex);
      return `${firstPart}*`;
    });

  return [...new Set(allFieldPatterns)].join(',\n');
}

export function castSrcType(field: EntityField): string {
  switch (field.mapping?.type) {
    case 'keyword':
      return `TO_STRING(${field.source})`;
    case 'date':
      return `TO_DATETIME(${field.source})`;
    case 'boolean':
      return `TO_BOOLEAN(${field.source})`;
    case 'long':
      return `TO_LONG(${field.source})`;
    case 'integer':
      return `TO_INTEGER(${field.source})`;
    case 'float':
      return `TO_DOUBLE(${field.source})`;
    case 'ip':
      return `TO_IP(${field.source})`;
    case 'scaled_float':
      return `${field.source}`;
    default:
      return field.source;
  }
}

export function extractPaginationParams(
  esqlResponse: ESQLSearchResponse,
  maxDocs: number,
  paginationFields: PaginationFields
): PaginationParams | undefined {
  const count = esqlResponse.values.length;
  if (count === 0 || count < maxDocs) {
    return undefined;
  }

  const { timestampField, finalIdField: idField } = paginationFields;
  const columns = esqlResponse.columns;
  const timestampFieldIdx = columns.findIndex(({ name }) => name === timestampField);
  if (timestampFieldIdx === -1) {
    throw new Error(`${timestampField} not found in esql response, internal logic error`);
  }

  const idFieldIdx = columns.findIndex(({ name }) => name === idField);
  if (idFieldIdx === -1) {
    throw new Error(`${idField} not found in esql response, internal logic error`);
  }

  const lastResult = esqlResponse.values[esqlResponse.values.length - 1];
  const timestampCursor = lastResult[timestampFieldIdx] as string;
  const idCursor = lastResult[idFieldIdx] as string;
  return {
    timestampCursor,
    idCursor,
  };
}

/**
 * Builds the ESQL fragment that evaluates identityField.fieldEvaluations (EVAL only).
 * Returns empty string when there are no field evaluations.
 */
export function buildFieldEvaluations(entityDefinition: EntityDefinition): string {
  const fieldEvaluationsEsql = getFieldEvaluationsEsqlFromDefinition(entityDefinition);
  return `| EVAL ${fieldEvaluationsEsql}`;
}

export function buildPaginationSection(
  fromDateISO: string,
  docsLimit: number,
  paginationFields: PaginationFields,
  pagination?: PaginationParams,
  recoveryId?: string
): string[] {
  const parts = [];
  parts.push(
    `| SORT ${paginationFields.timestampField} ASC, ${paginationFields.idFieldInQuery} ASC`
  );

  if (pagination) {
    if (!recoveryId) {
      parts.push(getPaginationWhereClause(paginationFields, pagination));
    } else {
      parts.push(
        getPaginationWhereClause(paginationFields, pagination, { fromDateISO, recoveryId })
      );
    }
  }

  parts.push(`| LIMIT ${docsLimit}`);
  return parts;
}

function getPaginationWhereClause(
  paginationFields: PaginationFields,
  pagination: PaginationParams,
  paginationRecovery?: { fromDateISO: string; recoveryId: string }
): string {
  if (paginationRecovery) {
    return buildPaginationWhereClause(
      { timestampCursor: paginationRecovery.fromDateISO, idCursor: paginationRecovery.recoveryId },
      paginationFields
    );
  }

  return buildPaginationWhereClause(pagination, paginationFields);
}

function buildPaginationWhereClause(
  { timestampCursor, idCursor }: PaginationParams,
  { timestampField, idFieldInQuery: idFieldExprForWhere }: PaginationFields
): string {
  return `| WHERE ${timestampField} > TO_DATETIME("${timestampCursor}") 
            OR (${timestampField} == TO_DATETIME("${timestampCursor}") 
                AND ${idFieldExprForWhere} > "${idCursor}")`;
}

export function hasFieldEvaluations(entityDefinition: EntityDefinition): boolean {
  if (isSingleFieldIdentity(entityDefinition.identityField)) {
    return false;
  }

  return (entityDefinition.identityField.fieldEvaluations?.length ?? 0) > 0;
}
