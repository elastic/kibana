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
} from '../../definitions/entity_schema';

const DEFAULT_FIELDS = ['@timestamp', `entity.id`];
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

export const buildPriorityLogsExtractionEsqlQuery = ({
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
  | WHERE ${entityIdFiler(idFieldName)}
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
    ${customFieldEvalLogic()}
  | KEEP ${fieldsToKeep(idField, fields)}
  | LIMIT ${maxPageSearchSize}
  | SORT @timestamp ASC`;
};

function entityIdFiler(idFieldName: string) {
  return `${idFieldName} IS NOT NULL
  AND ${idFieldName} != ""`;
}

function recentFieldStats(fields: EntityField[]) {
  return fields
    .map(({ retention, destination: dest, source: src }) => {
      const recentDest = recentData(src, dest);
      switch (retention.operation) {
        case 'collect_values':
          return `${recentDest} = MV_DEDUPE(TOP(${src}, ${retention.maxLength}))`;
        case 'prefer_newest_value':
          return `${recentDest} = LAST(${src}, @timestamp)`;
        case 'prefer_oldest_value':
          return `${recentDest} = FIRST(${src}, @timestamp)`;
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
    .concat([`entity.id = ${idField}`])
    .join(',\n ');
}

function fieldsToKeep({ field: idField }: EntityIdentityField, fields: EntityField[]) {
  return fields
    .map(({ destination }) => destination)
    .concat([...DEFAULT_FIELDS, idField])
    .join(',\n ');
}

function customFieldEvalLogic() {
  return [
    `@timestamp = ${recentData('timestamp')}`,
    `entity.name = COALESCE(entity.name, entity.id)`,
  ].join(',\n ');
}
