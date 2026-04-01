/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real implementation added in PR 4
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';

export const fetchAnonymizationFields = async (_params: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}): Promise<AnonymizationFieldResponse[]> => {
  throw new Error('Not implemented — real implementation added in PR 4');
};
