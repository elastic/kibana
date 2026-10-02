/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/** Retired Significant Events history stream; events now live in `.rule-events`. */
export const LEGACY_EVENTS_DATA_STREAM = '.significant_events-events';

const isNotFound = (error: unknown): boolean =>
  (error as { meta?: { statusCode?: number } })?.meta?.statusCode === 404;

/**
 * Deletes the retired `.significant_events-events` data stream and its index template. History is
 * not backfilled into `.rule-events`. Idempotent: a missing stream or template is not an error,
 * so it is safe to run on every start. Failures are logged and never block plugin start.
 */
export const deleteLegacyEventsDataStream = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  const deleteIgnoringNotFound = async (label: string, run: () => Promise<unknown>) => {
    try {
      await run();
      logger.info(`Deleted retired ${label} ${LEGACY_EVENTS_DATA_STREAM}`);
    } catch (error) {
      if (isNotFound(error)) {
        return;
      }
      logger.warn(
        `Failed to delete retired ${label} ${LEGACY_EVENTS_DATA_STREAM}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  await deleteIgnoringNotFound('data stream', () =>
    esClient.indices.deleteDataStream({ name: LEGACY_EVENTS_DATA_STREAM })
  );
  await deleteIgnoringNotFound('index template', () =>
    esClient.indices.deleteIndexTemplate({ name: LEGACY_EVENTS_DATA_STREAM })
  );
};
