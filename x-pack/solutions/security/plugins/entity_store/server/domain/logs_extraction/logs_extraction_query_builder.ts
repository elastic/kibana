/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { esqlIsNotNullOrEmpty } from '../../../common/esql/strings';
import {
  type EntityDefinition,
  type EntityField,
  type EntityType,
} from '../../../common/domain/definitions/entity_schema';
import {
  getEuidEsqlEvaluation,
  getEuidEsqlDocumentsContainsIdFilter,
} from '../../../common/domain/euid/esql';

export const HASHED_ID_FIELD = 'entity.hashedId';
const HASH_ALG = 'MD5';

export const ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD =
  'entity.EngineMetadata.FirstSeenLogInPage';
const ENGINE_METADATA_UNTYPED_ID_FIELD = 'entity.EngineMetadata.UntypedId';
const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';

const MAIN_ENTITY_ID_FIELD = 'entity.id';
const ENTITY_NAME_FIELD = 'entity.name';
const TIMESTAMP_FIELD = '@timestamp';

const METADATA_FIELDS = ['_index'];
const DEFAULT_FIELDS_TO_KEEP = [
  TIMESTAMP_FIELD,
  MAIN_ENTITY_ID_FIELD,
  ENTITY_NAME_FIELD,
  ENGINE_METADATA_UNTYPED_ID_FIELD,
  HASHED_ID_FIELD,
  ENGINE_METADATA_TYPE_FIELD,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
];

const RECENT_DATA_PREFIX = 'recent';
// Some fields have only src and we need to fallback to it.
const recentData = (dest: string) => `${RECENT_DATA_PREFIX}.${dest}`;

export interface PaginationParams {
  timestampCursor: string;
  idCursor: string;
}

interface LogsExtractionQueryParams {
  // source of the query
  indexPatterns: string[];
  // used to join and perform field retention strategy
  latestIndex: string;
  // contains all the fields and id descriptions
  entityDefinition: EntityDefinition;
  // limits amount of logs and entities processed
  docsLimit: number;

  fromDateISO: string;

  toDateISO: string;

  recoveryId?: string;

  pagination?: PaginationParams;
}

export const buildLogsExtractionEsqlQuery = ({
  indexPatterns,
  entityDefinition: { fields, type, entityTypeFallback },
  fromDateISO,
  toDateISO,
  docsLimit,
  latestIndex,
  recoveryId,
  pagination,
}: LogsExtractionQueryParams): string => {
  return (
    `FROM ${indexPatterns.join(', ')}
    METADATA ${METADATA_FIELDS.join(', ')}` +
    // Where clause captures the full window that we will process
    // We are including timestamp boundaries to ensure we are not missing any logs
    // that contain the same timestamp (e.g. pagination recovery)
    `
  | WHERE (${getEuidEsqlDocumentsContainsIdFilter(type)})
      AND ${TIMESTAMP_FIELD} ${recoveryId ? '>=' : '>'} TO_DATETIME("${fromDateISO}")
      AND ${TIMESTAMP_FIELD} <= TO_DATETIME("${toDateISO}")` +
    // Early construct the id (based on euid logic) so we can run stats per entity (equivalent to GROUP BY)
    `
  | EVAL ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)} = ${getEuidEsqlEvaluation(type, {
      withTypeId: false,
    })}` +
    // Perform the main aggregation of all the seen logs in the window, taking into consideration the
    `
  | STATS
    ${ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD} = MIN(${TIMESTAMP_FIELD}),
    ${recentData('timestamp')} = MAX(${TIMESTAMP_FIELD}),
    ${recentFieldStats(fields)}
    BY ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)}` +
    // early sort, paginate and limit so we perform data retention operations (LOOKUP JOIN) only on documents
    // that are needed
    `
  | SORT ${ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD} ASC, ${recentData(
      ENGINE_METADATA_UNTYPED_ID_FIELD
    )} ASC
  ${getPaginationWhereClause(pagination, recoveryId ? { fromDateISO, recoveryId } : undefined)}
  | LIMIT ${docsLimit}` +
    // Concatenate the type of the entity and the id to perform the LOOKUP JOIN (otherwise ids won't match)
    `
  | EVAL ${recentData(MAIN_ENTITY_ID_FIELD)} = CONCAT("${type}:", ${recentData(
      ENGINE_METADATA_UNTYPED_ID_FIELD
    )})` +
    // - Perform the LOOKUP JOIN to get the latest data for the entity
    // - Merge the fields from latest with recent data (taking into consideration the retention strategy)
    // - Perform the custom fields evaluation logic
    // Obs: this not an aggregation.
    `
  | LOOKUP JOIN ${latestIndex}
      ON ${recentData(MAIN_ENTITY_ID_FIELD)} == ${MAIN_ENTITY_ID_FIELD}
  | EVAL ${mergedFieldStats(MAIN_ENTITY_ID_FIELD, fields)}
  | EVAL ${customFieldEvalLogic(type, entityTypeFallback)}` +
    // Rename the fields to the original names
    `
  | RENAME
    ${recentData(MAIN_ENTITY_ID_FIELD)} AS ${MAIN_ENTITY_ID_FIELD},
    ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)} AS ${ENGINE_METADATA_UNTYPED_ID_FIELD}
  | KEEP ${fieldsToKeep(fields)}`
  );
};

function recentFieldStats(fields: EntityField[]) {
  return fields
    .map((field) => {
      const { retention, destination: dest, source } = field;
      const recentDest = recentData(dest);
      const castedSrc = castSrcType(field);
      switch (retention.operation) {
        case 'collect_values':
          return `${recentDest} = TOP(MV_DEDUPE(${castedSrc}), ${retention.maxLength}) WHERE ${source} IS NOT NULL`;
        case 'prefer_newest_value':
          return `${recentDest} = LAST(${castedSrc}, ${TIMESTAMP_FIELD}) WHERE ${source} IS NOT NULL`;
        case 'prefer_oldest_value':
          return `${recentDest} = FIRST(${castedSrc}, ${TIMESTAMP_FIELD}) WHERE ${source} IS NOT NULL`;
        default:
          throw new Error('unknown field operation');
      }
    })
    .join(',\n ');
}

function mergedFieldStats(idFieldName: string, fields: EntityField[]) {
  return fields
    .map((field) => {
      const { retention, destination: dest } = field;
      const recentDest = recentData(dest);
      if (dest === idFieldName) {
        return null; // id field should not be merged
      }

      switch (retention.operation) {
        case 'collect_values':
          return `${dest} = MV_SLICE(MV_UNION(${recentDest}, ${dest}), 0, ${
            retention.maxLength - 1
          })`;
        case 'prefer_newest_value':
          return `${dest} = COALESCE(${recentDest}, ${dest})`;
        case 'prefer_oldest_value':
          return `${dest} = COALESCE(${dest}, ${recentDest})`;
        default:
          throw new Error('unknown field operation');
      }
    })
    .filter(Boolean)
    .join(',\n ');
}

function fieldsToKeep(fields: EntityField[]) {
  return fields
    .map(({ destination }) => destination)
    .concat(DEFAULT_FIELDS_TO_KEEP)
    .join(',\n ');
}

function customFieldEvalLogic(type: EntityType, entityTypeFallback?: string) {
  const evals = [
    // Bring recent timestamp back
    `${TIMESTAMP_FIELD} = ${recentData('timestamp')}`,

    // Fallback to the untyped id if the name is empty
    `${ENTITY_NAME_FIELD} = CASE(${esqlIsNotNullOrEmpty(
      ENTITY_NAME_FIELD
    )}, ${ENTITY_NAME_FIELD}, ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)})`,

    // Save the engine type
    `${ENGINE_METADATA_TYPE_FIELD} = "${type}"`,

    // Hash the id to be used as the _id in the elasticsearch document
    `${HASHED_ID_FIELD} = HASH("${HASH_ALG}", ${recentData(MAIN_ENTITY_ID_FIELD)})`,
  ];

  if (entityTypeFallback) {
    // If type doesn't exist, fallback to the entity type fallback
    evals.push(`entity.type = COALESCE(entity.type, "${entityTypeFallback}")`);
  }

  return evals.join(',\n ');
}

function castSrcType(field: EntityField) {
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
    case 'ip':
      return `TO_IP(${field.source})`;
    // explicit no cast because it doesn't exist in ESQl
    // and it's a breaking point
    case 'scaled_float':
      return `${field.source}`;
    default:
      return field.source;
  }
}

function getPaginationWhereClause(
  pagination?: PaginationParams,
  paginationRecovery?: { fromDateISO: string; recoveryId: string }
) {
  if (!pagination && !paginationRecovery) {
    return '';
  }

  if (paginationRecovery) {
    return buildPaginationWhereClause({
      timestampCursor: paginationRecovery.fromDateISO,
      idCursor: paginationRecovery.recoveryId,
    });
  }

  if (pagination) {
    return buildPaginationWhereClause(pagination);
  }
}

function buildPaginationWhereClause({ timestampCursor, idCursor }: PaginationParams) {
  return `| WHERE ${ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD} > TO_DATETIME("${timestampCursor}") 
            OR (${ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD} == TO_DATETIME("${timestampCursor}") 
                AND ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)} > "${idCursor}")`;
}

export function extractPaginationParams(
  esqlResponse: ESQLSearchResponse,
  maxDocs: number
): PaginationParams | undefined {
  const count = esqlResponse.values.length;
  if (count === 0 || count < maxDocs) {
    return undefined;
  }

  const columns = esqlResponse.columns;
  const timestampFieldIdx = columns.findIndex(
    ({ name }) => name === ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD
  );
  if (timestampFieldIdx === -1) {
    throw new Error(
      `${ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD} not found in esql response, internal logic error`
    );
  }

  const idFieldIdx = columns.findIndex(({ name }) => name === ENGINE_METADATA_UNTYPED_ID_FIELD);
  if (idFieldIdx === -1) {
    throw new Error(
      `${ENGINE_METADATA_UNTYPED_ID_FIELD} not found in esql response, internal logic error`
    );
  }

  const lastResult = esqlResponse.values[esqlResponse.values.length - 1];
  const timestampCursor = lastResult[timestampFieldIdx] as string;
  const idCursor = lastResult[idFieldIdx] as string;
  return {
    timestampCursor,
    idCursor,
  };
}
