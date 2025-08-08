/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';

import { GetSuccessfulGenerationsSearchResult } from '../../get_successfull_generations_search_result';

// a map of connector IDs to their successful generations metadata
type SuccessfulGenerationsMetadata = Record<
  string,
  {
    averageSuccessfulDurationNanoseconds?: number;
    successfulGenerations?: number;
  }
>;

export const transformSuccessfulGenerationsSearchResult = ({
  logger,
  rawResponse,
}: {
  rawResponse: {
    aggregations: AggregationsAggregate | undefined;
  };
  logger: Logger;
}): SuccessfulGenerationsMetadata => {
  try {
    // Validate the raw response against the schema
    const parsed = GetSuccessfulGenerationsSearchResult.parse(rawResponse);

    // Transform the parsed response into the expected format
    return parsed.aggregations.successfull_generations_by_connector_id.buckets.reduce<SuccessfulGenerationsMetadata>(
      (acc, bucket) => {
        const connectorId = bucket.key;
        const successfulGenerations = bucket.successful_generations.value;
        const averageSuccessfulDurationNanoseconds =
          bucket.avg_event_duration_nanoseconds.value ?? undefined;

        return {
          ...acc,
          [connectorId]: {
            averageSuccessfulDurationNanoseconds,
            successfulGenerations,
          },
        };
      },
      {}
    );
  } catch (e) {
    const errorMessage = `Failed to parse search results in transformSuccessfulGenerationsSearchResult ${JSON.stringify(
      e.errors,
      null,
      2
    )}`;

    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
};
