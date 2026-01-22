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
const HASH_ALG = 'SHA256';

const MAIN_ENTITY_ID = 'entity.id';
const DEFAULT_FIELDS = ['@timestamp', MAIN_ENTITY_ID];
const METADATA_FIELDS = ['_index'];

const RECENT_DATA_PREFIX = 'recent';
// Some fields have only src and we need to fallback to it.
const recentData = (src: string, dest?: string) => `${RECENT_DATA_PREFIX}.${dest || src}`;

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

  const cleanFields = fields.filter(
    // TODO: Investigate support for boolean and date fields in logs extraction.
    // These types are currently excluded from cleanFields until their ES|QL handling is verified.
    ({ mapping }) =>
      mapping?.type !== 'boolean' && mapping?.type !== 'date' && mapping?.type !== 'ip'
  );

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
    ${recentFieldStats(cleanFields)}
    BY ${recentData(idFieldName)}
  | LOOKUP JOIN ${latestIndex}
      ON ${recentData(idFieldName)} == ${idFieldName}
  | RENAME
    ${recentData(idFieldName)} AS ${idFieldName}
  | EVAL
    ${mergedFieldStats(idField, cleanFields)},
    ${customFieldEvalLogic()}
  | KEEP ${fieldsToKeep(idField, cleanFields)}
  | LIMIT ${maxPageSearchSize}
  | EVAL ${HASHED_ID} = HASH("${HASH_ALG}", ${MAIN_ENTITY_ID})
  | SORT @timestamp ASC`;
};

function entityIdFilter(idFieldName: string) {
  return `${idFieldName} IS NOT NULL
  AND ${idFieldName} != ""`;
}

function recentFieldStats(fields: EntityField[]) {
  return fields
    .map((field) => {
      const { retention, destination: dest, source: src } = field;
      const recentDest = recentData(src, dest);
      switch (retention.operation) {
        case 'collect_values':
          return `${recentDest} = MV_DEDUPE(TOP(${castSrcType(field)}, ${retention.maxLength}))`;
        case 'prefer_newest_value':
          return `${recentDest} = LAST(${castSrcType(field)}, @timestamp)`;
        case 'prefer_oldest_value':
          return `${recentDest} = FIRST(${castSrcType(field)}, @timestamp)`;
        default:
          throw new Error('unknown field operation');
      }
    })
    .join(',\n ');
}

function mergedFieldStats({ field: idField }: EntityIdentityField, fields: EntityField[]) {
  return fields
    .map(({ retention, destination: dest, source: src }) => {
      const recentDest = recentData(src, dest);
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
    .map(({ destination, source }) => destination || source)
    .concat([...DEFAULT_FIELDS, idField])
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
      return `TO_DATETIME(${field.source})`;
    case 'boolean':
      return `TO_BOOLEAN(${field.source})`;
    case 'long':
      return `TO_LONG(${field.source})`;
    case 'ip':
      return `TO_IP(${field.source})`;
    case 'scaled_float': // explicit no cast because it doesn't exist in ESQl
      return `${field.source}`;
    default:
      return field.source;
  }
}
