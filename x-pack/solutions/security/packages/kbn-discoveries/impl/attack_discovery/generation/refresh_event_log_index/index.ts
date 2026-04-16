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
   * Refreshes the event log index so newly written events are immediately searchable.
   *
   * We intentionally use the request-scoped (asCurrentUser) client — or the
   * pre-authenticated alerting-framework client for scheduled runs — rather than
   * an internal/elevated client. The operation must stay within the privilege
   * boundary of the authenticated user / rule API key.
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
