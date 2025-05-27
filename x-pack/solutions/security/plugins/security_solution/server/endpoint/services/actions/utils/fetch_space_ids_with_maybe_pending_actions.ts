/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { catchAndWrapError } from '../../../utils';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import type { EndpointAppContextService } from '../../../endpoint_app_context_services';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { stringify } from '../../../utils/stringify';

/**
 * Returns the ES query that can be used to match action requests that may still be pending
 * @param agentType
 */
export const getUnExpiredActionsEsQuery = (
  agentType: ResponseActionAgentType
): QueryDslQueryContainer => {
  return {
    bool: {
      must: {
        // Only actions for this agent type
        term: { 'EndpointActions.input_type': agentType },
      },
      must_not: {
        // No action requests that have an `error` property defined
        exists: { field: 'error' },
      },
      filter: [
        // We only want actions requests whose expiration date is greater than now
        { range: { 'EndpointActions.expiration': { gte: 'now' } } },
      ],
    },
  };
};

/**
 * Fetches all the space IDS associated with response actions of a given agent type that may still be
 * pending. ("may" because we don't actually calculate if they are here)
 */
export const fetchSpaceIdsWithMaybePendingActions = async (
  endpointService: EndpointAppContextService,
  agentType: ResponseActionAgentType
): Promise<string[]> => {
  if (!endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
    return [DEFAULT_SPACE_ID];
  }

  const logger = endpointService.createLogger('fetchSpaceIdsWithMaybePendingActions');
  const esClient = endpointService.getInternalEsClient();

  const esSearchRequest: SearchRequest = {
    index: ENDPOINT_ACTIONS_INDEX,
    query: getUnExpiredActionsEsQuery(agentType),
    _source: false,
    size: 0,
    aggs: {
      spaceIds: {
        terms: {
          field: 'originSpaceId',
          size: 10000,
        },
      },
    },
    ignore_unavailable: true,
  };

  logger.debug(
    () =>
      `Searching for spaces ids of possibly pending action for agent type [${agentType}]\n${stringify(
        esSearchRequest
      )}`
  );

  const searchResult = await esClient
    .search<unknown, { spaceIds: { buckets: Array<{ key: string }> } }>(esSearchRequest)
    .catch(catchAndWrapError);

  logger.debug(() => `Search Results: ${stringify(searchResult)}`);

  return (searchResult.aggregations?.spaceIds.buckets ?? []).map(({ key }) => key);
};
