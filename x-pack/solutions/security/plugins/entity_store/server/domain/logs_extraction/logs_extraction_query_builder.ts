/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityDefinition,
  EntityField,
  EntityIdentityField,
} from '../definitions/entity_schema';

export const HASHED_ID = 'entity.hashedId';
const HASH_ALG = 'MD5';

const MAIN_ENTITY_ID = 'entity.id';
const DEFAULT_FIELDS_TO_KEEP = ['@timestamp', MAIN_ENTITY_ID, HASHED_ID];
const METADATA_FIELDS = ['_index'];

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
  entityDefinition: { fields, identityFields },
  fromDateISO,
  toDateISO,
  maxPageSearchSize,
  latestIndex,
}: LogsExtractionQueryParams): string => {
  // supporting only one identity field until we have
  // an strategy to express calculated identity fields
  const idField = identityFields[0];
  const idFieldName = idField.field;

  return `FROM ${indexPatterns.join(', ')}
    METADATA ${METADATA_FIELDS.join(', ')}
  | WHERE ${entityIdFilter(idFieldName)}
      AND @timestamp > TO_DATETIME("${fromDateISO}")
      AND @timestamp <= TO_DATETIME("${toDateISO}")
  | SORT @timestamp ASC
  | LIMIT ${maxPageSearchSize}
  | RENAME
    ${idFieldName} AS ${recentData(idFieldName)}
  | STATS
    ${recentData('timestamp')} = MAX(@timestamp),
    ${recentFieldStats(fields)}
    BY ${recentData(idFieldName)}
  | LOOKUP JOIN ${latestIndex}
      ON ${recentData(idFieldName)} == ${idFieldName}
  | RENAME
    ${recentData(idFieldName)} AS ${idFieldName}
  | EVAL
    ${mergedFieldStats(idField, fields)},
    ${customFieldEvalLogic()},
    ${HASHED_ID} = HASH("${HASH_ALG}", ${MAIN_ENTITY_ID})
  | KEEP ${fieldsToKeep(idField, fields)}
  | SORT @timestamp ASC`;
};

function entityIdFilter(idFieldName: string) {
  return `${idFieldName} IS NOT NULL
  AND ${idFieldName} != ""`;
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
          return `${recentDest} = LAST(${castedSrc}, @timestamp)`;
        case 'prefer_oldest_value':
          return `${recentDest} = FIRST(${castedSrc}, @timestamp)`;
        default:
          throw new Error('unknown field operation');
      }
    })
    .join(',\n ');
}

function mergedFieldStats({ field: idField }: EntityIdentityField, fields: EntityField[]) {
  return fields
    .map((field) => {
      const { retention, destination: dest } = field;
      const recentDest = castDestType(recentData(dest), field);
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
    .concat([`${MAIN_ENTITY_ID} = ${idField}`])
    .join(',\n ');
}

function fieldsToKeep({ field: idField }: EntityIdentityField, fields: EntityField[]) {
  return fields
    .map(({ destination }) => destination)
    .concat([...DEFAULT_FIELDS_TO_KEEP, idField])
    .join(',\n ');
}

function customFieldEvalLogic() {
  return [
    `@timestamp = ${recentData('timestamp')}`,
    `entity.name = COALESCE(entity.name, entity.id)`,
  ].join(',\n ');
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
