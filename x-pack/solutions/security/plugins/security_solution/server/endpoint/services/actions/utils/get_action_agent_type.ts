/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { LogsEndpointAction } from '../../../../../common/endpoint/types';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import { catchAndWrapError } from '../../../utils';
import { NotFoundError } from '../../../errors';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';

/**
 * Returns the `agentType` for a given response action
 */
export const getActionAgentType = async (
  esClient: ElasticsearchClient,
  actionId: string
): Promise<{ agentType: ResponseActionAgentType }> => {
  const response = await esClient
    .search<LogsEndpointAction>({
      index: ENDPOINT_ACTIONS_INDEX,
      body: {
        query: {
          bool: {
            filter: [{ term: { action_id: actionId } }],
          },
        },
      },
      _source: ['EndpointActions.input_type'],
      size: 1,
    })
    .catch(catchAndWrapError);

  if (!response?.hits?.hits[0]?._source?.EndpointActions.input_type) {
    throw new NotFoundError(`Action id [${actionId}] not found`, response);
  }

  return { agentType: response.hits.hits[0]._source.EndpointActions.input_type };
};
