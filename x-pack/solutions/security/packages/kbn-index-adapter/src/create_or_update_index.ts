/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexName } from '@elastic/elasticsearch/lib/api/types';
import type { IndicesSimulateIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { retryTransientEsErrors } from './retry_transient_es_errors';

interface UpdateIndexMappingsOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  indexNames: string[];
  totalFieldsLimit: number;
}

interface UpdateIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  indexName: string;
  totalFieldsLimit: number;
}

const updateTotalFieldLimitSetting = async ({
  logger,
  esClient,
  indexName,
  totalFieldsLimit,
}: UpdateIndexOpts) => {
  logger.debug(`Updating total field limit setting for ${indexName} data stream.`);

  try {
    const body = { 'index.mapping.total_fields.limit': totalFieldsLimit };
    await retryTransientEsErrors(() => esClient.indices.putSettings({ index: indexName, body }), {
      logger,
    });
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
const updateMapping = async ({ logger, esClient, indexName }: UpdateIndexOpts) => {
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
      () => esClient.indices.putMapping({ index: indexName, body: simulatedMapping }),
      { logger }
    );
  } catch (err) {
    logger.error(`Failed to PUT mapping for ${indexName}: ${err.message}`);
    throw err;
  }
};
/**
 * Updates the data stream mapping and total field limit setting
 */
const updateIndexMappings = async ({
  logger,
  esClient,
  totalFieldsLimit,
  indexNames,
}: UpdateIndexMappingsOpts) => {
  // Update total field limit setting of found indices
  // Other index setting changes are not updated at this time
  await Promise.all(
    indexNames.map((indexName) =>
      updateTotalFieldLimitSetting({ logger, esClient, totalFieldsLimit, indexName })
    )
  );
  // Update mappings of the found indices.
  await Promise.all(
    indexNames.map((indexName) => updateMapping({ logger, esClient, totalFieldsLimit, indexName }))
  );
};

export interface CreateOrUpdateIndexParams {
  name: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
}

export async function createOrUpdateIndex({
  logger,
  esClient,
  name,
  totalFieldsLimit,
}: CreateOrUpdateIndexParams): Promise<void> {
  logger.info(`Creating index - ${name}`);

  // check if index exists
  let indexExists = false;
  try {
    indexExists = await retryTransientEsErrors(
      () => esClient.indices.exists({ index: name, expand_wildcards: 'all' }),
      { logger }
    );
  } catch (error) {
    if (error?.statusCode !== 404) {
      logger.error(`Error fetching index for ${name} - ${error.message}`);
      throw error;
    }
  }

  // if a index exists, update the underlying mapping
  if (indexExists) {
    await updateIndexMappings({
      logger,
      esClient,
      indexNames: [name],
      totalFieldsLimit,
    });
  } else {
    try {
      await retryTransientEsErrors(() => esClient.indices.create({ index: name }), { logger });
    } catch (error) {
      if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        logger.error(`Error creating index ${name} - ${error.message}`);
        throw error;
      }
    }
  }
}

export interface CreateIndexParams {
  name: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}

export async function createIndex({ logger, esClient, name }: CreateIndexParams): Promise<void> {
  logger.debug(`Checking existence of index - ${name}`);

  // check if index exists
  let indexExists = false;
  try {
    indexExists = await retryTransientEsErrors(
      () => esClient.indices.exists({ index: name, expand_wildcards: 'all' }),
      {
        logger,
      }
    );
  } catch (error) {
    if (error?.statusCode !== 404) {
      logger.error(`Error fetching index for ${name} - ${error.message}`);
      throw error;
    }
  }

  // return if index already created
  if (indexExists) {
    return;
  }

  logger.info(`Creating index - ${name}`);
  try {
    await retryTransientEsErrors(() => esClient.indices.create({ index: name }), { logger });
  } catch (error) {
    if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
      logger.error(`Error creating index ${name} - ${error.message}`);
      throw error;
    }
  }
}

export interface CreateOrUpdateSpacesIndexParams {
  name: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
}

export async function updateIndices({
  logger,
  esClient,
  name,
  totalFieldsLimit,
}: CreateOrUpdateSpacesIndexParams): Promise<void> {
  logger.info(`Updating indices - ${name}`);

  // check if data stream exists
  let indices: IndexName[] = [];
  try {
    const response = await retryTransientEsErrors(
      () => esClient.indices.get({ index: name, expand_wildcards: 'all' }),
      { logger }
    );
    indices = Object.keys(response);
  } catch (error) {
    if (error?.statusCode !== 404) {
      logger.error(`Error fetching indices for ${name} - ${error.message}`);
      throw error;
    }
  }
  if (indices.length > 0) {
    await updateIndexMappings({
      logger,
      esClient,
      totalFieldsLimit,
      indexNames: indices,
    });
  }
}
