/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type {
  ActionResponsesRequestOptions,
  ActionResponsesRequestStrategyResponse,
  ResponseActionsQueries,
} from '../../../../../../common/search_strategy/endpoint/response_actions';

import { buildActionResultsQuery } from './query.action_results.dsl';
import type { EndpointFactory } from '../../types';

export const actionResults: EndpointFactory<ResponseActionsQueries.results> = {
  buildDsl: (options: ActionResponsesRequestOptions) => buildActionResultsQuery(options),
  parse: async (options, response): Promise<ActionResponsesRequestStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildActionResultsQuery(options))],
    };

    const responded =
      response.rawResponse?.aggregations?.aggs.responses_by_action_id?.doc_count ?? 0;

    // We should get just one agent id, but just in case we get more than one, we'll use the length
    const agentsWithPendingActions = options.agents - responded;
    const isExpired = !options.expiration ? true : new Date(options.expiration) < new Date();
    const isCompleted = isExpired || agentsWithPendingActions <= 0;

    const aggsBuckets =
      response.rawResponse?.aggregations?.aggs.responses_by_action_id?.responses.buckets;
    const successful = aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0;

    const wasSuccessful = responded === successful;

    // TODO use getActionsStatus() - this requires a refactor of the function to accept isExpired
    const status = isExpired
      ? 'failed'
      : isCompleted
      ? wasSuccessful
        ? 'successful'
        : 'failed'
      : 'pending';

    return {
      ...response,
      edges: response.rawResponse.hits.hits,
      isCompleted,
      wasSuccessful: responded === successful,
      isExpired,
      inspect,
      status,
    };
  },
};
