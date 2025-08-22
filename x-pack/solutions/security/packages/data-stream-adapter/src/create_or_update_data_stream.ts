/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesDataStream,
  IndicesSimulateIndexTemplateResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { retryTransientEsErrors } from '@kbn/index-adapter';
import { rolloverDataStream, shouldRolloverDataStream } from './rollover_data_stream';
import { reindexDataStreamDocuments } from './reindex_data_stream';

interface UpdateIndexMappingsOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  indexNames: string[];
  totalFieldsLimit: number;
  writeIndexOnly?: boolean;
  enableRollover?: boolean;
  enableReindexing?: boolean;
}

interface UpdateIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  indexName: string;
  totalFieldsLimit: number;
  writeIndexOnly?: boolean;
  enableRollover?: boolean;
  enableReindexing?: boolean;
}

const updateTotalFieldLimitSetting = async ({
  logger,
  esClient,
  indexName,
  totalFieldsLimit,
}: UpdateIndexOpts) => {
  logger.debug(`Updating total field limit setting for ${indexName} data stream.`);

  try {
    const settings = { 'index.mapping.total_fields.limit': totalFieldsLimit };
    await retryTransientEsErrors(
      () => esClient.indices.putSettings({ index: indexName, settings }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Failed to PUT index.mapping.total_fields.limit settings for ${indexName}: ${err.message}`
    );
    throw err;
  }
};

// This will update the mappings but *not* the settings. This
// is due to the fact settings can be classed as dynamic and static, and static
// updates will fail on an index that isn't closed. New settings *will* be applied as part
// of the ILM policy rollovers. More info: https://github.com/elastic/kibana/pull/113389#issuecomment-940152654
const updateMapping = async ({
  logger,
  esClient,
  indexName,
  writeIndexOnly,
  enableRollover = false,
  enableReindexing = false,
}: UpdateIndexOpts) => {
  logger.debug(`Updating mappings for ${indexName} data stream.`);

  let simulatedIndexMapping: IndicesSimulateIndexTemplateResponse;
  try {
    simulatedIndexMapping = await retryTransientEsErrors(
      () => esClient.indices.simulateIndexTemplate({ name: indexName }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Ignored PUT mappings for ${indexName}; error generating simulated mappings: ${err.message}`
    );
    return;
  }

  const simulatedMapping = get(simulatedIndexMapping, ['template', 'mappings']);

  if (simulatedMapping == null) {
    logger.error(`Ignored PUT mappings for ${indexName}; simulated mappings were empty`);
    return;
  }

  try {
    await retryTransientEsErrors(
      () =>
        esClient.indices.putMapping({
          index: indexName,
          ...simulatedMapping,
          write_index_only: writeIndexOnly,
        }),
      { logger }
    );

    // If rollover is enabled and reindexing is enabled, trigger both after successful mapping update
    if (enableRollover) {
      logger.info(`Triggering rollover for ${indexName} after mapping update`);
      await rolloverDataStream({
        esClient,
        logger,
        dataStreamName: indexName,
      });

      // Reindex older documents after rollover if enabled
      if (enableReindexing) {
        logger.info(`Starting reindex of older documents for ${indexName}`);
        await reindexDataStreamDocuments({
          esClient,
          logger,
          dataStreamName: indexName,
        });
      }
    }
  } catch (err) {
    logger.error(`Failed to PUT mapping for ${indexName}: ${err.message}`);

    // Check if we should rollover due to mapping conflicts
    if (enableRollover && shouldRolloverDataStream(err)) {
      logger.info(`Mapping update failed for ${indexName}, triggering rollover due to conflict`);
      try {
        await rolloverDataStream({
          esClient,
          logger,
          dataStreamName: indexName,
        });

        // Retry mapping update after rollover
        await retryTransientEsErrors(
          () =>
            esClient.indices.putMapping({
              index: indexName,
              ...simulatedMapping,
              write_index_only: true, // Only update write index after rollover
            }),
          { logger }
        );

        // Reindex older documents after rollover if enabled
        if (enableReindexing) {
          logger.info(`Starting reindex of older documents for ${indexName} after rollover`);
          await reindexDataStreamDocuments({
            esClient,
            logger,
            dataStreamName: indexName,
          });
        }
      } catch (rolloverErr) {
        logger.error(
          `Failed to rollover ${indexName} after mapping failure: ${rolloverErr.message}`
        );
        throw rolloverErr;
      }
    } else {
      throw err;
    }
  }
};
/**
 * Updates the data stream mapping and total field limit setting
 */
const updateDataStreamMappings = async ({
  logger,
  esClient,
  totalFieldsLimit,
  indexNames,
  writeIndexOnly,
  enableRollover = false,
  enableReindexing = false,
}: UpdateIndexMappingsOpts) => {
  for (const indexName of indexNames) {
    // Update settings first
    await updateTotalFieldLimitSetting({ logger, esClient, totalFieldsLimit, indexName });
    // Then update mappings
    await updateMapping({
      logger,
      esClient,
      totalFieldsLimit,
      indexName,
      writeIndexOnly,
      enableRollover,
      enableReindexing,
    });
  }
};

export interface CreateOrUpdateDataStreamParams {
  name: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  writeIndexOnly?: boolean;
  enableRollover?: boolean;
  enableReindexing?: boolean;
}

export async function createOrUpdateDataStream({
  logger,
  esClient,
  name,
  totalFieldsLimit,
  writeIndexOnly,
  enableRollover = false,
  enableReindexing = false,
}: CreateOrUpdateDataStreamParams): Promise<void> {
  logger.info(`Creating data stream - ${name}`);

  // check if data stream exists
  let dataStreamExists = false;
  try {
    const response = await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name, expand_wildcards: 'all' }),
      { logger }
    );
    dataStreamExists = response.data_streams.length > 0;
  } catch (error) {
    if (error?.statusCode !== 404) {
      logger.error(`Error fetching data stream for ${name} - ${error.message}`);
      throw error;
    }
  }

  // if a data stream exists, update the underlying mapping
  if (dataStreamExists) {
    await updateDataStreamMappings({
      logger,
      esClient,
      indexNames: [name],
      totalFieldsLimit,
      writeIndexOnly,
      enableRollover,
      enableReindexing,
    });
  } else {
    try {
      await retryTransientEsErrors(() => esClient.indices.createDataStream({ name }), { logger });
    } catch (error) {
      if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        logger.error(`Error creating data stream ${name} - ${error.message}`);
        throw error;
      }
    }
  }
}

export interface CreateDataStreamParams {
  name: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}

export async function createDataStream({
  logger,
  esClient,
  name,
}: CreateDataStreamParams): Promise<void> {
  logger.debug(`Checking data stream exists - ${name}`);

  // check if data stream exists
  let dataStreamExists = false;
  try {
    const response = await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name, expand_wildcards: 'all' }),
      { logger }
    );
    dataStreamExists = response.data_streams.length > 0;
  } catch (error) {
    if (error?.statusCode !== 404) {
      logger.error(`Error fetching data stream for ${name} - ${error.message}`);
      throw error;
    }
  }

  // return if data stream already created
  if (dataStreamExists) {
    return;
  }
  logger.info(`Installing data stream - ${name}`);

  try {
    await retryTransientEsErrors(() => esClient.indices.createDataStream({ name }), { logger });
  } catch (error) {
    if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
      logger.error(`Error creating data stream ${name} - ${error.message}`);
      throw error;
    }
  }
}

export interface CreateOrUpdateSpacesDataStreamParams {
  name: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  writeIndexOnly?: boolean;
  enableRollover?: boolean;
  enableReindexing?: boolean;
}

export async function updateDataStreams({
  logger,
  esClient,
  name,
  totalFieldsLimit,
  writeIndexOnly,
  enableRollover = false,
  enableReindexing = false,
}: CreateOrUpdateSpacesDataStreamParams): Promise<void> {
  logger.info(`Updating data streams - ${name}`);

  // check if data stream exists
  let dataStreams: IndicesDataStream[] = [];
  try {
    const response = await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name, expand_wildcards: 'all' }),
      { logger }
    );
    dataStreams = response.data_streams;
  } catch (error) {
    if (error?.statusCode !== 404) {
      logger.error(`Error fetching data stream for ${name} - ${error.message}`);
      throw error;
    }
  }
  if (dataStreams.length > 0) {
    await updateDataStreamMappings({
      logger,
      esClient,
      totalFieldsLimit,
      indexNames: dataStreams.map((dataStream) => dataStream.name),
      writeIndexOnly,
      enableRollover,
      enableReindexing,
    });
  }
}
