/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlIsNullOrEmpty } from '../../../common/esql/strings';
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

const MAIN_ENTITY_ID_FIELD = 'entity.id';
const ENTITY_NAME_FIELD = 'entity.name';
const ENGINE_METADATA_UNTYPED_ID_FIELD = 'entity.EngineMetadata.UntypedId';
const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';
const TIMESTAMP_FIELD = '@timestamp';

const METADATA_FIELDS = ['_index'];
const DEFAULT_FIELDS_TO_KEEP = [
  TIMESTAMP_FIELD,
  MAIN_ENTITY_ID_FIELD,
  ENTITY_NAME_FIELD,
  ENGINE_METADATA_UNTYPED_ID_FIELD,
  HASHED_ID_FIELD,
  ENGINE_METADATA_TYPE_FIELD,
];

const RECENT_DATA_PREFIX = 'recent';
// Some fields have only src and we need to fallback to it.
const recentData = (dest: string) => `${RECENT_DATA_PREFIX}.${dest}`;

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
}

export const buildLogsExtractionEsqlQuery = ({
  indexPatterns,
  entityDefinition: { fields, type, entityTypeFallback },
  fromDateISO,
  toDateISO,
  docsLimit,
  latestIndex,
}: LogsExtractionQueryParams): string => {
  return `FROM ${indexPatterns.join(', ')}
    METADATA ${METADATA_FIELDS.join(', ')}
  | WHERE (${getEuidEsqlDocumentsContainsIdFilter(type)})
      AND ${TIMESTAMP_FIELD} > TO_DATETIME("${fromDateISO}")
      AND ${TIMESTAMP_FIELD} <= TO_DATETIME("${toDateISO}")
  | SORT ${TIMESTAMP_FIELD} ASC
  | LIMIT ${docsLimit}
  | EVAL ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)} = ${getEuidEsqlEvaluation(type, {
    withTypeId: false,
  })}
  | STATS
    ${recentData('timestamp')} = MAX(${TIMESTAMP_FIELD}),
    ${recentFieldStats(fields)}
    BY ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)}
  | EVAL ${recentData(MAIN_ENTITY_ID_FIELD)} = CONCAT("${type}:", ${recentData(
    ENGINE_METADATA_UNTYPED_ID_FIELD
  )})
  | LOOKUP JOIN ${latestIndex}
      ON ${recentData(MAIN_ENTITY_ID_FIELD)} == ${MAIN_ENTITY_ID_FIELD}
  | RENAME
    ${recentData(MAIN_ENTITY_ID_FIELD)} AS ${MAIN_ENTITY_ID_FIELD},
    ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)} AS ${ENGINE_METADATA_UNTYPED_ID_FIELD}
  | EVAL
    ${mergedFieldStats(MAIN_ENTITY_ID_FIELD, fields)},
    ${customFieldEvalLogic(type, entityTypeFallback)},
    ${HASHED_ID_FIELD} = HASH("${HASH_ALG}", ${MAIN_ENTITY_ID_FIELD})
  | KEEP ${fieldsToKeep(fields)}
  | SORT ${TIMESTAMP_FIELD} ASC`;
};

function recentFieldStats(fields: EntityField[]) {
  return fields
    .map((field) => {
      const { retention, destination: dest } = field;
      const recentDest = recentData(dest);
      const castedSrc = castSrcType(field);
      switch (retention.operation) {
        case 'collect_values':
          return `${recentDest} = MV_DEDUPE(TOP(${castedSrc}, ${retention.maxLength}))`;
        case 'prefer_newest_value':
          return `${recentDest} = LAST(${castedSrc}, ${TIMESTAMP_FIELD})`;
        case 'prefer_oldest_value':
          return `${recentDest} = FIRST(${castedSrc}, ${TIMESTAMP_FIELD})`;
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
          return `${dest} = MV_DEDUPE(COALESCE(MV_APPEND(${recentDest}, ${dest}), ${recentDest}))`;
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
    `${TIMESTAMP_FIELD} = ${recentData('timestamp')}`,
    `${ENTITY_NAME_FIELD} = CASE(${esqlIsNullOrEmpty(
      ENTITY_NAME_FIELD
    )}, ${ENGINE_METADATA_UNTYPED_ID_FIELD}, ${ENTITY_NAME_FIELD})`,
    `${ENGINE_METADATA_TYPE_FIELD} = "${type}"`,
  ];

  if (entityTypeFallback) {
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
