/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  AggregationsCompositeAggregate,
  MappingRuntimeFields,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { AfterKeys } from '../../../../../common/api/entity_analytics/common';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';
import type { EntityMaintainer, EntityMaintainerConfig } from '../maintainer';

interface GetBatchOfEntitiesOpts {
  abortController: AbortController;
  afterKeys: AfterKeys;
  esClient: ElasticsearchClient;
  index: string;
  logger: Logger;
  maintainerConfig: EntityMaintainerConfig;
  maintainerDef: EntityMaintainer;
  runtimeMappings: MappingRuntimeFields;
}

export const processResponse = (
  response: SearchResponse<unknown, Record<string, AggregationsCompositeAggregate>>
) => {
  const processedResponse: Record<string, { afterKey: Record<string, string>; values: string[] }> =
    {};
  const aggregations = response.aggregations || {};
  Object.keys(aggregations).forEach((entityType) => {
    const afterKey = aggregations[entityType].after_key as Record<string, string>;
    const values = (aggregations[entityType].buckets ?? []).map(
      (bucket) => bucket.key[EntityTypeToIdentifierField[entityType as EntityType]]
    );

    processedResponse[entityType] = {
      afterKey,
      values,
    };
  });

  return processedResponse;
};

export const getEntitiesToProcess = async (opts: GetBatchOfEntitiesOpts) => {
  const { logger, maintainerConfig, maintainerDef, esClient } = opts;

  const query = maintainerDef.getCompositeQuery(
    maintainerConfig.timeField,
    maintainerConfig.lookbackWindow
  );
  const aggregation = maintainerDef.entityTypes.reduce((aggs, entityType: EntityType) => {
    const idField = EntityTypeToIdentifierField[entityType];
    return {
      ...aggs,
      [entityType]: {
        composite: {
          size: 3500,
          sources: [{ [idField]: { terms: { field: idField } } }],
          after: opts.afterKeys[entityType],
        },
      },
    };
  }, {});

  logger.info(
    `Executing query for entity maintainer ${maintainerDef.id} - ${JSON.stringify({
      query,
      aggregation,
    })}`
  );

  const response = await esClient.search<unknown, Record<string, AggregationsCompositeAggregate>>(
    {
      size: 0,
      index: opts.index,
      ignore_unavailable: true,
      runtime_mappings: opts.runtimeMappings,
      query,
      aggs: aggregation,
    },
    { signal: opts.abortController.signal }
  );

  // TODO - error handling

  return processResponse(response);
};
