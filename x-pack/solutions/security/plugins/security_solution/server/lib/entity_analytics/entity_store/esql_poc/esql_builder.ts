/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { AppClient } from '../../../../client';
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store';
import { engineDescriptionRegistry } from '../installation/engine_description';
import { buildIndexPatternsByEngine } from '../utils';
import type { EntityDescription } from '../entity_definitions/types';
import { generateLatestIndex } from './latest_index';
import type { FieldDescription } from '../installation/types';
import type { EntityStoreEsqlConfig } from './config';

const DEFAULT_FIELDS = ['@timestamp', `entity.id`];

const RECENT_DATA_PREFIX = 'recent';
const recentData = (field: string) => `${RECENT_DATA_PREFIX}.${field}`;

export const buildESQLQuery = async (
  namespace: string,
  entityType: EntityType,
  appClient: AppClient,
  dataViewsService: DataViewsService,
  fromDateISO: string,
  toDateISO: string,
  config: EntityStoreEsqlConfig
): Promise<string> => {
  const indexPatterns = await buildIndexPatternsByEngine(
    namespace,
    entityType,
    appClient,
    dataViewsService
  );
  const description = engineDescriptionRegistry[entityType];
  const latestIndex = generateLatestIndex(entityType, namespace);

  return `FROM ${indexPatterns.join(', ')}
  | WHERE ${entityIdFilter(description)}
      AND @timestamp > TO_DATETIME("${fromDateISO}")
      AND @timestamp <= TO_DATETIME("${toDateISO}")
  ${generateEUID(description)}
  | RENAME
    ${description.identityField} AS ${recentData(description.identityField)}
  | STATS
    ${recentData('timestamp')} = MAX(@timestamp),
    ${recentFieldStats(description)}
    BY ${recentData(description.identityField)}
  | LOOKUP JOIN ${latestIndex}
      ON ${recentData(description.identityField)} == ${description.identityField}
  | RENAME
    ${recentData(description.identityField)} AS ${description.identityField}
  | EVAL
    ${mergedFieldStats(description)},
    ${customFieldEvalLogic(description)},
    entity.Metadata.EngineType = "${description.entityType}"
  | KEEP
    ${fieldsToKeep(description)},
    entity.Metadata.EngineType
  | LIMIT ${config.maxPageSearchSize}`;
};

function entityIdFilter({ identityField, entityType }: EntityDescription) {
  if (entityType === 'user') {
    return `(
              (user.entity.id IS NOT NULL AND user.entity.id != "")
            OR (user.email IS NOT NULL AND user.email != "")
            OR (user.name IS NOT NULL AND user.name != "")
            OR (user.id IS NOT NULL AND user.id != "")
          )`;
  } else if (entityType === 'host') {
    return `(
              (host.entity.id IS NOT NULL AND host.entity.id != "")
            OR (host.id IS NOT NULL AND host.id != "")
            OR (host.mac IS NOT NULL AND host.mac != "")
            OR (host.name IS NOT NULL AND host.name != "")
            OR (host.hostname IS NOT NULL AND host.hostname != "")
          )`;
  }

  return `${identityField} IS NOT NULL
  AND ${identityField} != ""`;
}

function generateEUID({ entityType }: EntityDescription) {
  if (entityType === 'user') {
    return `| EVAL user.entity.id = COALESCE(
                user.entity.id,
                user.id,
                user.email,
                CASE(user.name IS NOT NULL AND user.name != "", 
                  CASE(
                    user.domain IS NOT NULL AND user.domain != "", CONCAT(user.name, "@", user.domain),
                    host.id IS NOT NULL AND host.id != "", CONCAT(user.name, "@", host.id),
                    host.domain IS NOT NULL AND host.domain != "", CASE(
                      host.name IS NOT NULL AND host.name != "", CONCAT(user.name, "@", host.name, ".", TO_STRING(host.domain)),
                      host.hostname IS NOT NULL AND host.hostname != "", CONCAT(user.name, "@", host.hostname, ".", TO_STRING(host.domain)),
                      NULL
                    ),
                    host.name IS NOT NULL AND host.name != "", CONCAT(user.name, "@", host.name),
                    host.hostname IS NOT NULL AND host.hostname != "", CONCAT(user.name, "@", host.hostname),
                    NULL
                  ),
                  NULL
                ),
                user.name
            )`;
  } else if (entityType === 'host') {
    return `| EVAL host.entity.id = COALESCE(
                host.entity.id,
                host.id,
                CASE(host.domain IS NOT NULL AND host.domain != "",
                  CASE(
                    host.name IS NOT NULL AND host.name != "", CONCAT(host.name, ".", TO_STRING(host.domain)),
                    host.hostname IS NOT NULL AND host.hostname != "", CONCAT(host.hostname, ".", TO_STRING(host.domain)),
                    NULL
                  ),
                  NULL
                ),
                CASE(host.mac IS NOT NULL AND host.mac != "",
                  CASE(
                    host.name IS NOT NULL AND host.name != "", CONCAT(host.name, "|", TO_STRING(host.mac)),
                    host.hostname IS NOT NULL AND host.hostname != "", CONCAT(host.hostname, "|", TO_STRING(host.mac)),
                    NULL
                  ),
                  NULL
                ),
                host.name,
                host.hostname
              )`;
  }

  return '';
}

function recentFieldStats({ fields }: EntityDescription) {
  return filterFields(fields)
    .map(({ retention, destination: dest, source: src }) => {
      switch (retention.operation) {
        case 'collect_values':
          return `${recentData(dest)} = MV_DEDUPE(TOP(${src}, ${retention.maxLength}))`;
        case 'prefer_newest_value':
          return `${recentData(dest)} = LAST(${src}, @timestamp)`;
        case 'prefer_oldest_value':
          return `${recentData(dest)} = FIRST(${src}, @timestamp)`;
        default:
          throw new Error('unknown field operation');
      }
    })
    .join(',\n ');
}

function mergedFieldStats({ fields, identityField }: EntityDescription) {
  return filterFields(fields)
    .map(({ retention, destination: dest }) => {
      switch (retention.operation) {
        case 'collect_values':
          return `${dest} = MV_DEDUPE(COALESCE(MV_APPEND(${recentData(
            dest
          )}, ${dest}), ${recentData(dest)}))`;
        case 'prefer_newest_value':
          return `${dest} = COALESCE(${recentData(dest)}, ${dest})`;
        case 'prefer_oldest_value':
          return `${dest} = COALESCE(${dest}, ${recentData(dest)})`;
        default:
          throw new Error('unknown field operation');
      }
    })
    .concat([`entity.id = ${identityField}`])
    .join(',\n ');
}

function fieldsToKeep({ fields, identityField }: EntityDescription) {
  return filterFields(fields)
    .map(({ destination }) => destination)
    .concat([...DEFAULT_FIELDS, identityField])
    .join(',\n ');
}

function customFieldEvalLogic({ entityType }: EntityDescription) {
  let entityNameEval = `entity.name = COALESCE(entity.name, entity.id)`;

  if (entityType === 'host') {
    entityNameEval = `entity.name = COALESCE(entity.name, host.name, entity.id)`;
  } else if (entityType === 'user') {
    entityNameEval = `entity.name = COALESCE(entity.name, user.name, entity.id)`;
  }

  return [`@timestamp = ${recentData('timestamp')}`, entityNameEval].join(',\n ');
}

function filterFields(fields: FieldDescription[]) {
  return fields
    .filter(({ source }) => source[0] !== '_') // ESQL doesn't support internal fields checks (we use _index)
    .filter(({ mapping }) => mapping.type !== 'boolean') // ESQL FIRST/LAST is not working with booleans right now (https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/esql/src/main/java/org/elasticsearch/xpack/esql/expression/function/aggregate/First.java#L57C23-L57C61)
    .filter(({ mapping }) => mapping.type !== 'date'); // ESQL FIRST/LAST is not working with datetime right now (https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/esql/src/main/java/org/elasticsearch/xpack/esql/expression/function/aggregate/First.java#L57C23-L57C61)
}
