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

  return `FROM ${indexPatterns.join(', ')}
  | WHERE ${entityIdFiler(description)}
      AND @timestamp >= TO_DATETIME("${fromDateISO}")
      AND @timestamp <= TO_DATETIME("${toDateISO}")
  | STATS
    ${convertToFieldStats(description)}
    BY ${description.identityField}`;
};

function entityIdFiler({ identityField }: EntityDescription) {
  return `${identityField} IS NOT NULL
  AND ${identityField} != ""`;
}

function convertToFieldStats({ fields }: EntityDescription) {
  return fields
    .filter(({ source }) => source[0] !== '_') // ESQL doesn't support internal fields checks (we use _index)
    .filter(({ mapping }) => mapping.type !== 'boolean') // ESQL FIRST/LAST is not working with booleans right now (https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/esql/src/main/java/org/elasticsearch/xpack/esql/expression/function/aggregate/First.java#L57C23-L57C61)
    .filter(({ mapping }) => mapping.type !== 'date') // ESQL FIRST/LAST is not working with datetime right now (https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/esql/src/main/java/org/elasticsearch/xpack/esql/expression/function/aggregate/First.java#L57C23-L57C61)
    .map((field) => {
      switch (field.retention.operation) {
        case 'collect_values':
          return `${field.destination} = TOP(${field.source}, ${field.retention.maxLength})`;
        case 'prefer_newest_value':
          return `${field.destination} = LAST(${field.source}, @timestamp)`;
        case 'prefer_oldest_value':
          return `${field.destination} = FIRST(${field.source}, @timestamp)`;
        default:
          throw new Error('unknown field operation');
      }
    })
    .join(',\n ');
}
