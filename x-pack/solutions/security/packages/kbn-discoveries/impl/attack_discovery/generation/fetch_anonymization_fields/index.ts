/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';

/**
 * Fetches space-specific anonymization fields from the AI Assistant
 * anonymization fields index. These fields configure which alert fields
 * are allowed to be sent to the model and which should be anonymized.
 *
 * Throws if no anonymization fields are found or if none are allowed,
 * using error messaging similar to `throwIfInvalidAnonymization` in the
 * public Attack Discovery API.
 */
export const fetchAnonymizationFields = async ({
  esClient,
  logger,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}): Promise<AnonymizationFieldResponse[]> => {
  const index = `.kibana-elastic-ai-assistant-anonymization-fields-${spaceId}`;

  logger.debug(() => `Fetching anonymization fields from index: ${index} for space: ${spaceId}`);

  let fields: AnonymizationFieldResponse[];

  try {
    const response = await esClient.search({
      index,
      query: { match_all: {} },
      size: 1000,
    });

    fields = response.hits.hits
      .filter((hit) => hit._source !== undefined)
      .map((hit) => {
        const source = hit._source as Record<string, unknown>;
        return {
          allowed: source.allowed as boolean,
          anonymized: source.anonymized as boolean,
          createdAt: source.created_at as string | undefined,
          createdBy: source.created_by as string | undefined,
          field: source.field as string,
          id: hit._id ?? '',
          namespace: source.namespace as string | undefined,
          timestamp: source['@timestamp'] as string | undefined,
          updatedAt: source.updated_at as string | undefined,
          updatedBy: source.updated_by as string | undefined,
        };
      });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    throw new Error(
      `Failed to fetch anonymization fields for space '${spaceId}': ${errorMessage}. ` +
        'Anonymization fields must be configured to generate Attack discoveries.'
    );
  }

  if (fields.length === 0 || fields.every((field) => field.allowed === false)) {
    throw new Error(
      `No anonymization fields found for space '${spaceId}'. ` +
        'Anonymization fields must be configured to generate Attack discoveries.'
    );
  }

  logger.debug(() => `Fetched ${fields.length} anonymization fields for space: ${spaceId}`);

  return fields;
};
