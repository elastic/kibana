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

const MAX_PAGE_SIZE = 10000;
const DEFAULT_FIELDS = ['@timestamp', `entity.id`];

const RECENT_DATA_PREFIX = 'recent';
const recentData = (field: string) => `${RECENT_DATA_PREFIX}.${field}`;

export const buildESQLQuery = async (
  namespace: string,
  entityType: EntityType,
  appClient: AppClient,
  dataViewsService: DataViewsService,
  fromDateISO: string,
  toDateISO: string
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
  | WHERE ${entityIdFiler(description)}
      AND @timestamp >= TO_DATETIME("${fromDateISO}")
      AND @timestamp <= TO_DATETIME("${toDateISO}")
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
    ${customFieldEvalLogic()}
  | KEEP ${fieldsToKeep(description)}
  | LIMIT ${MAX_PAGE_SIZE}`;
};

function entityIdFiler({ identityField }: EntityDescription) {
  return `${identityField} IS NOT NULL
  AND ${identityField} != ""`;
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

function customFieldEvalLogic() {
  return [
    `@timestamp = ${recentData('timestamp')}`,
    `entity.name = COALESCE(entity.name, entity.id)`,
  ].join(',\n ');
}

function filterFields(fields: FieldDescription[]) {
  return fields
    .filter(({ source }) => source[0] !== '_') // ESQL doesn't support internal fields checks (we use _index)
    .filter(({ mapping }) => mapping.type !== 'boolean') // ESQL FIRST/LAST is not working with booleans right now (https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/esql/src/main/java/org/elasticsearch/xpack/esql/expression/function/aggregate/First.java#L57C23-L57C61)
    .filter(({ mapping }) => mapping.type !== 'date'); // ESQL FIRST/LAST is not working with datetime right now (https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/esql/src/main/java/org/elasticsearch/xpack/esql/expression/function/aggregate/First.java#L57C23-L57C61)
}
