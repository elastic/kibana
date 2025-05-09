/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core-security-common';
import { GetAttackDiscoveryGenerationsResponse } from '@kbn/elastic-assistant-common';
import type { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { get } from 'lodash/fp';

import { combineGenerationsWithSuccessMetadata } from '../combine_generations_with_success_metadata';
import { getSuccessfulGenerationsQuery } from '../get_successfull_generations_query';
import { transformGetAttackDiscoveryGenerationsSearchResult } from '../transforms/transform_get_attack_discovery_generations_search_result';
import { transformSuccessfulGenerationsSearchResult } from '../transforms/transform_successful_generations_search_result';

export const getAttackDiscoveryGenerations = async ({
  authenticatedUser,
  esClient,
  eventLogIndex,
  generationsQuery,
  getAttackDiscoveryGenerationsParams,
  logger,
  spaceId,
}: {
  authenticatedUser: AuthenticatedUser;
  esClient: ElasticsearchClient;
  eventLogIndex: string;
  getAttackDiscoveryGenerationsParams: {
    size: number;
    start?: string;
    end?: string;
  };
  generationsQuery: estypes.SearchRequest;
  logger: Logger;
  spaceId: string;
}): Promise<GetAttackDiscoveryGenerationsResponse> => {
  const { size, start, end } = getAttackDiscoveryGenerationsParams;

  const successfulGenerationsQuery = getSuccessfulGenerationsQuery({
    authenticatedUser,
    end,
    eventLogIndex,
    size,
    spaceId,
    start,
  });

  // Build an msearch query to get both generations and successful generations
  // in a single request, where:
  // 1. The first search is for the generations
  // 2. The second search is for the successful generations (metadata)
  const mSearchQueryBody = {
    searches: [
      {
        allow_no_indices: generationsQuery.allow_no_indices,
        index: eventLogIndex,
        ignore_unavailable: generationsQuery.ignore_unavailable,
      },
      {
        aggs: generationsQuery.aggs,
        query: generationsQuery.query,
        size: generationsQuery.size,
      },
      {
        allow_no_indices: successfulGenerationsQuery.allow_no_indices,
        index: eventLogIndex,
        ignore_unavailable: successfulGenerationsQuery.ignore_unavailable,
      },
      {
        aggs: successfulGenerationsQuery.aggs,
        query: successfulGenerationsQuery.query,
        size: successfulGenerationsQuery.size,
      },
    ],
    ignore_unavailable: true,
  };

  const msearchResults = await esClient.msearch(mSearchQueryBody);

  const generationsResponse = msearchResults.responses[0];
  const successfulGenerationsResponse = msearchResults.responses[1];

  // transform the generations response:
  const rawGenerationsResponse = {
    aggregations: get('aggregations', generationsResponse),
  };
  const transformedGenerations = transformGetAttackDiscoveryGenerationsSearchResult({
    logger,
    rawResponse: rawGenerationsResponse,
  });

  // transform the successful generations response:
  const rawSuccessfulGenerationsResponse = {
    aggregations: get('aggregations', successfulGenerationsResponse),
  };
  const successfulGenerationsMetadata = transformSuccessfulGenerationsSearchResult({
    logger,
    rawResponse: rawSuccessfulGenerationsResponse,
  });

  // Combine the transformed generations with the successful generations metadata:
  return combineGenerationsWithSuccessMetadata({
    transformedGenerations,
    successfulGenerationsMetadata,
  });
};
