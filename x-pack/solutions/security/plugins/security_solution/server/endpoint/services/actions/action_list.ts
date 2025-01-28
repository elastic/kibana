/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { fetchActionRequests } from './utils/fetch_action_requests';
import type { FetchActionResponsesResult } from './utils/fetch_action_responses';
import { fetchActionResponses } from './utils/fetch_action_responses';
import { ENDPOINT_DEFAULT_PAGE_SIZE } from '../../../../common/endpoint/constants';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import type { ActionListApiResponse, LogsEndpointAction } from '../../../../common/endpoint/types';
import type {
  ResponseActionAgentType,
  ResponseActionStatus,
  ResponseActionsApiCommandNames,
  ResponseActionType,
} from '../../../../common/endpoint/service/response_actions/constants';

import {
  createActionDetailsRecord,
  getAgentHostNamesWithIds,
  mapResponsesByActionId,
  mapToNormalizedActionRequest,
} from './utils';
import type { EndpointMetadataService } from '../metadata';
import { ACTIONS_SEARCH_PAGE_SIZE } from './constants';

interface OptionalFilterParams {
  agentTypes?: ResponseActionAgentType[];
  commands?: string[];
  elasticAgentIds?: string[];
  endDate?: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  userIds?: string[];
  /** Will filter out the action requests so that only those show `expiration` date is greater than now */
  unExpiredOnly?: boolean;
  /** list of action Ids that should have outputs */
  withOutputs?: string[];
  /** Include automated response actions */
  types?: string[];
}

/**
 * Similar to #getActionList but takes statuses filter options
 * Retrieve a list of all (at most 10k) Actions from index (`ActionDetails`)
 * filter out action details based on statuses filter options
 */
export const getActionListByStatus = async ({
  agentTypes,
  commands,
  elasticAgentIds,
  esClient,
  endDate,
  logger,
  metadataService,
  page: _page,
  pageSize,
  startDate,
  statuses,
  userIds,
  unExpiredOnly = false,
  types,
  withOutputs,
}: OptionalFilterParams & {
  statuses: ResponseActionStatus[];
  esClient: ElasticsearchClient;
  logger: Logger;
  metadataService: EndpointMetadataService;
}): Promise<ActionListApiResponse> => {
  const size = pageSize ?? ENDPOINT_DEFAULT_PAGE_SIZE;
  const page = _page ?? 1;

  const { actionDetails: allActionDetails } = await getActionDetailsList({
    agentTypes,
    commands,
    elasticAgentIds,
    esClient,
    endDate,
    from: 0,
    logger,
    metadataService,
    size: ACTIONS_SEARCH_PAGE_SIZE,
    startDate,
    userIds,
    unExpiredOnly,
    types,
    withOutputs,
  });

  // filter out search results based on status filter options
  const actionDetailsByStatus = allActionDetails.filter((detail) =>
    statuses.includes(detail.status)
  );

  return {
    page,
    pageSize: size,
    startDate,
    endDate,
    agentTypes,
    elasticAgentIds,
    userIds,
    commands,
    statuses,
    // for size 20 -> page 1: (0, 20), page 2: (20, 40) ...etc
    data: actionDetailsByStatus.slice((page - 1) * size, size * page),
    total: actionDetailsByStatus.length,
  };
};

/**
 * Retrieve a list of Actions (`ActionDetails`)
 */
export const getActionList = async ({
  agentTypes,
  commands,
  elasticAgentIds,
  esClient,
  endDate,
  logger,
  metadataService,
  page: _page,
  pageSize,
  startDate,
  userIds,
  unExpiredOnly = false,
  withOutputs,
  types,
}: OptionalFilterParams & {
  esClient: ElasticsearchClient;
  logger: Logger;
  metadataService: EndpointMetadataService;
}): Promise<ActionListApiResponse> => {
  const size = pageSize ?? ENDPOINT_DEFAULT_PAGE_SIZE;
  const page = _page ?? 1;
  // # of hits to skip
  const from = (page - 1) * size;

  const { actionDetails, totalRecords } = await getActionDetailsList({
    agentTypes,
    commands,
    elasticAgentIds,
    esClient,
    endDate,
    from,
    logger,
    metadataService,
    size,
    startDate,
    userIds,
    unExpiredOnly,
    withOutputs,
    types,
  });

  return {
    page,
    pageSize: size,
    startDate,
    endDate,
    agentTypes,
    elasticAgentIds,
    userIds,
    commands,
    statuses: undefined,
    data: actionDetails,
    total: totalRecords,
  };
};

export type GetActionDetailsListParam = OptionalFilterParams & {
  esClient: ElasticsearchClient;
  from: number;
  logger: Logger;
  size: number;
};
const getActionDetailsList = async ({
  agentTypes,
  commands,
  elasticAgentIds,
  esClient,
  endDate,
  from,
  logger,
  metadataService,
  size,
  startDate,
  userIds,
  unExpiredOnly,
  withOutputs,
  types,
}: GetActionDetailsListParam & {
  metadataService: EndpointMetadataService;
}): Promise<{
  actionDetails: ActionListApiResponse['data'];
  totalRecords: number;
}> => {
  let actionRequests: LogsEndpointAction[] = [];
  let totalRecords: number = 0;

  try {
    const { data, total } = await fetchActionRequests({
      agentTypes,
      commands: commands as ResponseActionsApiCommandNames[],
      esClient,
      elasticAgentIds,
      startDate,
      endDate,
      from,
      size,
      userIds,
      unExpiredOnly,
      types: types as ResponseActionType[],
      logger,
    });

    actionRequests = data;
    totalRecords = total;
  } catch (error) {
    // all other errors
    const err = new CustomHttpRequestError(
      error.meta?.meta?.body?.error?.reason ??
        `Unknown error while fetching action requests (${error.message})`,
      error.meta?.meta?.statusCode ?? 500,
      error
    );
    logger.error(err);
    throw err;
  }

  if (!totalRecords) {
    return { actionDetails: [], totalRecords: 0 };
  }

  const normalizedActionRequests = actionRequests.map(mapToNormalizedActionRequest);
  const agentIds: string[] = [];
  const actionReqIds = normalizedActionRequests.map((actionReq) => {
    agentIds.push(...actionReq.agents);
    return actionReq.id;
  });
  let actionResponses: FetchActionResponsesResult;
  let agentsHostInfo: { [id: string]: string };

  try {
    // get all responses for given action Ids and agent Ids
    // and get host metadata info with queried agents
    [actionResponses, agentsHostInfo] = await Promise.all([
      fetchActionResponses({ esClient, agentIds: elasticAgentIds, actionIds: actionReqIds }),

      getAgentHostNamesWithIds({
        esClient,
        metadataService,
        agentIds,
      }),
    ]);
  } catch (error) {
    // all other errors
    const err = new CustomHttpRequestError(
      error.meta?.meta?.body?.error?.reason ??
        `Unknown error while fetching action responses (${error.message})`,
      error.meta?.meta?.statusCode ?? 500,
      error
    );
    logger.error(err);
    throw err;
  }

  const responsesByActionId = mapResponsesByActionId(actionResponses);
  const actionDetails: ActionListApiResponse['data'] = normalizedActionRequests.map((action) => {
    const actionRecord = createActionDetailsRecord(
      action,
      responsesByActionId[action.id] ?? { fleetResponses: [], endpointResponses: [] },
      agentsHostInfo
    );

    if (withOutputs && !withOutputs.includes(action.id)) {
      delete actionRecord.outputs;
    }

    return actionRecord;
  });

  return { actionDetails, totalRecords };
};
