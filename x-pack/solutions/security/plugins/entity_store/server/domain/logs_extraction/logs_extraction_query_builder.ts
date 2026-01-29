/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityDefinition,
  EntityField,
  EntityIdentity,
  EntityType,
} from '../definitions/entity_schema';
import { esqlIsNotNullOrEmpty } from './esql_strings';

export const HASHED_ID = 'entity.hashedId';
const HASH_ALG = 'MD5';

const MAIN_ENTITY_ID = 'entity.id';
const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';
const TIMESTAMP_FIELD = '@timestamp';

const METADATA_FIELDS = ['_index'];
const DEFAULT_FIELDS_TO_KEEP = [
  TIMESTAMP_FIELD,
  MAIN_ENTITY_ID,
  HASHED_ID,
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
  maxPageSearchSize: number;

  fromDateISO: string;

  toDateISO: string;
}

export const buildLogsExtractionEsqlQuery = ({
  indexPatterns,
  entityDefinition: { fields, identityField, type, entityTypeFallback },
  fromDateISO,
  toDateISO,
  maxPageSearchSize,
  latestIndex,
}: LogsExtractionQueryParams): string => {
  const idFieldName = getIdFieldName(identityField);

  return `FROM ${indexPatterns.join(', ')}
    METADATA ${METADATA_FIELDS.join(', ')}
  | WHERE (${entityIdFilter(identityField, type)})
      AND ${TIMESTAMP_FIELD} > TO_DATETIME("${fromDateISO}")
      AND ${TIMESTAMP_FIELD} <= TO_DATETIME("${toDateISO}")
  | SORT ${TIMESTAMP_FIELD} ASC
  | LIMIT ${maxPageSearchSize}
  ${entityFieldEvaluation(identityField, type)}
  | STATS
    ${recentData('timestamp')} = MAX(${TIMESTAMP_FIELD}),
    ${recentFieldStats(fields)}
    BY ${recentData(idFieldName)}
  | LOOKUP JOIN ${latestIndex}
      ON ${recentData(idFieldName)} == ${idFieldName}
  | RENAME
    ${recentData(idFieldName)} AS ${idFieldName}
  | EVAL
    ${mergedFieldStats(idFieldName, fields)},
    ${customFieldEvalLogic(type, entityTypeFallback)},
    ${HASHED_ID} = HASH("${HASH_ALG}", ${MAIN_ENTITY_ID})
  | KEEP ${fieldsToKeep(idFieldName, fields)}
  | SORT ${TIMESTAMP_FIELD} ASC`;
};

function entityIdFilter(identityField: EntityIdentity, type: EntityType) {
  const idFieldName = getIdFieldName(identityField);
  if (identityField.calculated) {
    return [idFieldName, ...identityField.requiresOneOfFields]
      .map((field) => `(${esqlIsNotNullOrEmpty(field)})`)
      .join(' OR ');
  }

  return esqlIsNotNullOrEmpty(idFieldName);
}

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
      const recentDest = castDestType(recentData(dest), field);
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
    .concat([`${MAIN_ENTITY_ID} = ${idFieldName}`])
    .join(',\n ');
}

function fieldsToKeep(idFieldName: string, fields: EntityField[]) {
  return fields
    .map(({ destination }) => destination)
    .concat([...DEFAULT_FIELDS_TO_KEEP, idFieldName])
    .join(',\n ');
}

function customFieldEvalLogic(type: EntityType, entityTypeFallback?: string) {
  const evals = [
    `${TIMESTAMP_FIELD} = ${recentData('timestamp')}`,
    `entity.name = COALESCE(entity.name, entity.id)`,
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
      return `TO_STRING(${field.source})`;
    case 'boolean':
      return `TO_STRING(${field.source})`;
    case 'long':
      return `TO_LONG(${field.source})`;
    case 'ip':
      return `TO_STRING(${field.source})`;
    // explicit no cast because it doesn't exist in ESQl
    // and it's a breaking point
    case 'scaled_float':
      return `${field.source}`;
    default:
      return field.source;
  }
}

function castDestType(fieldName: string, field: EntityField) {
  // We only to cast boolean, date and ip to string and back to the original type
  // because of a limitation in ESQL.
  // This should not be needed after https://github.com/elastic/elasticsearch/issues/141101
  switch (field.mapping?.type) {
    case 'boolean':
      return `TO_BOOLEAN(${fieldName})`;
    case 'date':
      return `TO_DATETIME(${fieldName})`;
    case 'ip':
      return `TO_IP(${fieldName})`;
    default:
      return fieldName;
  }
}

function getIdFieldName(identityField: EntityIdentity): string {
  if (identityField.calculated) {
    return identityField.defaultIdField;
  }

  return identityField.field;
}

function entityFieldEvaluation(identityField: EntityIdentity, type: EntityType) {
  const idFieldName = getIdFieldName(identityField);
  if (identityField.calculated) {
    return `| EVAL ${recentData(idFieldName)} = CONCAT("${type}:", 
      CASE(
        ${esqlIsNotNullOrEmpty(idFieldName)}, ${idFieldName},
        ${identityField.esqlEvaluation}
      )
    )`;
  }

  return `| EVAL ${recentData(idFieldName)} = CONCAT("${type}:", ${idFieldName})`;
}
