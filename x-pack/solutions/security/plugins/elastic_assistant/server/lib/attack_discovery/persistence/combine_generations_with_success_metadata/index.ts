/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetAttackDiscoveryGenerationsResponse } from '@kbn/elastic-assistant-common';

export const combineGenerationsWithSuccessMetadata = ({
  successfulGenerationsMetadata,
  transformedGenerations,
}: {
  successfulGenerationsMetadata: Record<
    string,
    {
      averageSuccessfulDurationNanoseconds?: number;
      successfulGenerations?: number;
    }
  >;
  transformedGenerations: GetAttackDiscoveryGenerationsResponse;
}): GetAttackDiscoveryGenerationsResponse => {
  const { generations } = transformedGenerations;

  const combinedGenerations = generations.map((generation) => {
    const { connector_id: connectorId } = generation;
    const successMetadata = successfulGenerationsMetadata[connectorId];

    return {
      ...generation,
      ...(successMetadata != null
        ? {
            connector_stats: {
              average_successful_duration_nanoseconds:
                successMetadata.averageSuccessfulDurationNanoseconds,
              successful_generations: successMetadata.successfulGenerations,
            },
          }
        : {}),
    };
  });

  return { generations: combinedGenerations };
};
