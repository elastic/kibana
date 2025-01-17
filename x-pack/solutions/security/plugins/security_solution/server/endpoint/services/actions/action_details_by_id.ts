/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { fetchActionRequestById } from './utils/fetch_action_request_by_id';
import type { FetchActionResponsesResult } from './utils/fetch_action_responses';
import { fetchActionResponses } from './utils/fetch_action_responses';
import {
  mapToNormalizedActionRequest,
  getAgentHostNamesWithIds,
  createActionDetailsRecord,
} from './utils';
import type { ActionDetails } from '../../../../common/endpoint/types';
import { EndpointError, isEndpointError } from '../../../../common/endpoint/errors';
import { NotFoundError } from '../../errors';
import type { EndpointMetadataService } from '../metadata';

/**
 * Get Action Details for a single action id
 * @param esClient
 * @param metadataService
 * @param actionId
 */
export const getActionDetailsById = async <T extends ActionDetails = ActionDetails>(
  esClient: ElasticsearchClient,
  metadataService: EndpointMetadataService,
  actionId: string
): Promise<T> => {
  let normalizedActionRequest: ReturnType<typeof mapToNormalizedActionRequest> | undefined;
  let actionResponses: FetchActionResponsesResult;

  try {
    // Get both the Action Request(s) and action Response(s)
    const [actionRequestEsDoc, actionResponseResult] = await Promise.all([
      // Get the action request(s)
      fetchActionRequestById(esClient, actionId),

      // Get all responses
      fetchActionResponses({ esClient, actionIds: [actionId] }),
    ]);

    actionResponses = actionResponseResult;
    normalizedActionRequest = mapToNormalizedActionRequest(actionRequestEsDoc);
  } catch (error) {
    if (isEndpointError(error)) {
      throw error;
    }

    throw new EndpointError(error.message, error);
  }

  // If action id was not found, error out
  if (!normalizedActionRequest) {
    throw new NotFoundError(`Action with id '${actionId}' not found.`);
  }

  // get host metadata info with queried agents
  const agentsHostInfo =
    normalizedActionRequest.agentType === 'endpoint'
      ? await getAgentHostNamesWithIds({
          esClient,
          metadataService,
          agentIds: normalizedActionRequest.agents,
        })
      : {};

  return createActionDetailsRecord<T>(normalizedActionRequest, actionResponses, agentsHostInfo);
};
