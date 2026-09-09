/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { INGEST_RECEIPTS_DATA_STREAM } from '../../../common/ingest_receipts';
import { getReceiptsIndexTemplate } from './receipts_index_template';

interface InstallReceiptsDestinationParams {
  esClient: ElasticsearchClient;
  logger: Logger;
}

const isAlreadyExistsError = (error: unknown): boolean =>
  isResponseError(error) && error.body?.error?.type === 'resource_already_exists_exception';

const createDataStreamIfMissing = async (esClient: ElasticsearchClient): Promise<void> => {
  try {
    await esClient.indices.createDataStream({ name: INGEST_RECEIPTS_DATA_STREAM });
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }
  }
};

export const installReceiptsDestination = async ({
  esClient,
  logger,
}: InstallReceiptsDestinationParams): Promise<void> => {
  const template = getReceiptsIndexTemplate();

  try {
    await pRetry(
      async () => {
        await esClient.indices.putIndexTemplate(template);
        await createDataStreamIfMissing(esClient);
      },
      {
        onFailedAttempt: (error) => {
          if (error.retriesLeft > 0) {
            logger.warn(
              `Could not install ingest receipts destination [${INGEST_RECEIPTS_DATA_STREAM}], retrying: ${error.message}`
            );
          }
        },
      }
    );
    logger.debug(`Ingest receipts destination [${INGEST_RECEIPTS_DATA_STREAM}] is installed`);
  } catch (error) {
    logger.error(
      `Could not install ingest receipts destination [${INGEST_RECEIPTS_DATA_STREAM}]: ${error.message}`
    );
  }
};
