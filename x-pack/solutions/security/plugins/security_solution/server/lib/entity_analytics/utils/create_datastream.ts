/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This file is a copy of x-pack/plugins/alerting/server/alerts_service/lib/create_concrete_write_index.ts
// The original function created an index, while here we create a datastream. If and when responseOps develops first-party code to work with datastreams (https://github.com/elastic/kibana/issues/140403), this file should be removed.

import { get } from 'lodash';
import type { IndicesSimulateIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { retryTransientEsErrors } from './retry_transient_es_errors';

export interface IIndexPatternString {
  template: string;
  alias: string;
}

interface CreateConcreteWriteIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  indexPatterns: IIndexPatternString;
}

interface UpdateIndexMappingsOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit?: number;
  indices: string[];
}

interface UpdateIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit?: number;
  index: string;
}

const updateTotalFieldLimitSetting = async ({
  logger,
  esClient,
  totalFieldsLimit,
  index,
}: UpdateIndexOpts) => {
  try {
    await retryTransientEsErrors(
      () =>
        esClient.indices.putSettings({
          index,
          body: { 'index.mapping.total_fields.limit': totalFieldsLimit },
        }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Failed to PUT index.mapping.total_fields.limit settings for index ${index}: ${err.message}`
    );
    throw err;
  }
};

// This will update the mappings of  indices but *not* the settings. This
// is due to the fact settings can be classed as dynamic and static, and static
// updates will fail on an index that isn't closed. New settings *will* be applied as part
// of the ILM policy rollovers. More info: https://github.com/elastic/kibana/pull/113389#issuecomment-940152654
const updateUnderlyingMapping = async ({ logger, esClient, index }: UpdateIndexOpts) => {
  let simulatedIndexMapping: IndicesSimulateIndexTemplateResponse;
  try {
    simulatedIndexMapping = await retryTransientEsErrors(
      () => esClient.indices.simulateIndexTemplate({ name: index }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Ignored PUT mappings for index ${index}; error generating simulated mappings: ${err.message}`
    );
    return;
  }

  const simulatedMapping = get(simulatedIndexMapping, ['template', 'mappings']);

  if (simulatedMapping == null) {
    logger.error(`Ignored PUT mappings for index ${index}; simulated mappings were empty`);
    return;
  }

  try {
    await retryTransientEsErrors(
      () => esClient.indices.putMapping({ index, body: simulatedMapping }),
      { logger }
    );
    logger.info(`Update mappings for ${index}`);
  } catch (err) {
    logger.error(`Failed to PUT mapping for index ${index}: ${err.message}`);
    throw err;
  }
};
/**
 * Updates the underlying mapping for any existing concrete indices
 */
export const updateIndexMappings = async ({
  logger,
  esClient,
  totalFieldsLimit,
  indices,
}: UpdateIndexMappingsOpts) => {
  logger.info(`Updating underlying mappings for ${indices.length} indices.`);

  if (totalFieldsLimit) {
    // Update total field limit setting of found indices
    // Other index setting changes are not updated at this time
    await Promise.all(
      indices.map((index) =>
        updateTotalFieldLimitSetting({ logger, esClient, totalFieldsLimit, index })
      )
    );
  }

  // Update mappings of the found indices.
  await Promise.all(indices.map((index) => updateUnderlyingMapping({ logger, esClient, index })));
};

/**
 * Create a data stream
 */
export const createDataStream = async ({
  logger,
  esClient,
  indexPatterns,
  totalFieldsLimit,
}: CreateConcreteWriteIndexOpts) => {
  logger.info(`Creating data stream - ${indexPatterns.alias}`);

  // check if a datastream already exists
  let dataStreams: string[] = [];
  try {
    // Specify both the index pattern for the backing indices and their aliases
    // The alias prevents the request from finding other namespaces that could match the -* pattern
    const response = await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name: indexPatterns.alias, expand_wildcards: 'all' }),
      { logger }
    );

    dataStreams = response.data_streams.map((dataStream) => dataStream.name);

    logger.debug(
      () =>
        `Found ${dataStreams.length} concrete indices for ${indexPatterns.alias} - ${JSON.stringify(
          dataStreams
        )}`
    );
  } catch (error) {
    // 404 is expected if no datastream have been created
    if (error.statusCode !== 404) {
      logger.error(
        `Error fetching concrete indices for ${indexPatterns.alias} pattern - ${error.message}`
      );
      throw error;
    }
  }

  const dataStreamsExist = dataStreams.length > 0;

  // if a concrete write datastream already exists, update the underlying mapping
  if (dataStreams.length > 0) {
    await updateIndexMappings({ logger, esClient, totalFieldsLimit, indices: dataStreams });
  }

  // check if a concrete write datastream already exists
  if (!dataStreamsExist) {
    try {
      await retryTransientEsErrors(
        () =>
          esClient.indices.createDataStream({
            name: indexPatterns.alias,
          }),
        { logger }
      );
    } catch (error) {
      logger.error(`Error creating datastream - ${error.message}`);
      throw error;
    }
  }
};
