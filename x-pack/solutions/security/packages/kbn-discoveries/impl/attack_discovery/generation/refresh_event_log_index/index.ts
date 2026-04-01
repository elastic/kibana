/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';

export const refreshEventLogIndex = async ({
  coreStart,
  esClient: preAuthenticatedEsClient,
  eventLogIndex,
  logger,
  request,
}: {
  coreStart: CoreStart;
  esClient?: ElasticsearchClient;
  eventLogIndex: string;
  logger: Logger;
  request: KibanaRequest;
}): Promise<void> => {
  /**
   * TEMPORARY FIX: Manually refresh the event log index so the event becomes searchable immediately
   * TODO: Replace with proper dataClient.refreshEventLogIndex() call
   */
  try {
    const esClient =
      preAuthenticatedEsClient ?? coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
    await esClient.indices.refresh({
      allow_no_indices: true,
      ignore_unavailable: true,
      index: eventLogIndex,
    });
    logger.info('Event log index refreshed successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to refresh event log index: ${message}`);
  }
};
