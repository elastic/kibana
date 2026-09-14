/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  IndicesCreateRequest,
  IndicesCreateResponse,
  IndicesIndexSettings,
} from '@elastic/elasticsearch/lib/api/types';
import { retryTransientEsErrors } from './retry_transient_es_errors';

/**
 * It's check for index existence, and create index
 * or update existing index mappings
 */
export const createOrUpdateIndex = async ({
  esClient,
  logger,
  options,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  options: IndicesCreateRequest;
}): Promise<IndicesCreateResponse | void> => {
  try {
    const isIndexExist = await esClient.indices.exists({
      index: options.index,
    });
    if (isIndexExist) {
      const response = await esClient.indices.get({
        index: options.index,
      });
      const indices = Object.keys(response ?? {});
      logger.info(`${options.index} already exist`);
      const mappingPromises = options.mappings
        ? indices.map(async (index) => {
            try {
              await retryTransientEsErrors(
                () => esClient.indices.putMapping({ index, ...options.mappings }),
                { logger }
              );
              logger.info(`Updated mappings for ${index}`);
            } catch (err) {
              logger.error(`Failed to PUT mapping for index ${index}: ${err.message}`);
            }
          })
        : [];

      const settingPromises = options.settings
        ? indices.map(async (index) => {
            try {
              await retryTransientEsErrors(
                () =>
                  esClient.indices.putSettings({
                    index,
                    settings: {
                      ...options.settings,
                    },
                  }),
                { logger }
              );
              logger.info(`Updated settings for ${index}`);
            } catch (err) {
              logger.error(`Failed to PUT settings for index ${index}: ${err.message}`);
            }
          })
        : [];

      await Promise.all([...mappingPromises, ...settingPromises]);
    } else {
      const { auto_expand_replicas: autoExpandReplicas, ...createSettings } =
        options.settings ?? {};

      try {
        await esClient.indices.create({ ...options, settings: createSettings });
      } catch (err) {
        // If the index already exists, we can ignore the error
        if (err?.meta?.body?.error?.type === 'resource_already_exists_exception') {
          logger.info(`${options.index} already exists`);
        } else {
          throw err;
        }
      }

      if (autoExpandReplicas !== undefined) {
        await applyAutoExpandReplicasSettings(esClient, logger, options.index, autoExpandReplicas);
      }
    }
  } catch (err) {
    const error = transformError(err);
    const fullErrorMessage = `Failed to create index: ${options.index}: ${error.message}`;
    logger.error(fullErrorMessage);
    throw new Error(fullErrorMessage);
  }
};

/**
 * On serverless, 'auto_expand_replicas' is not allowed. So to prevent crashing the index creations,
 * we apply the settings as a separate, best-effort update after the index is known to exist.
 */
const applyAutoExpandReplicasSettings = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  index: string,
  autoExpandReplicas: IndicesIndexSettings['auto_expand_replicas']
): Promise<void> => {
  try {
    await esClient.indices.putSettings({
      index,
      settings: { auto_expand_replicas: autoExpandReplicas },
    });
  } catch (err) {
    logger.debug(`Could not set auto_expand_replicas for ${index}: ${err.message}`);
  }
};
