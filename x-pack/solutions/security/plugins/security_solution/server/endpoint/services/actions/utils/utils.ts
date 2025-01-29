/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EcsError } from '@elastic/ecs';
import moment from 'moment/moment';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { FetchActionResponsesResult } from '../..';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../../common/endpoint/service/response_actions/constants';
import {
  ENDPOINT_ACTION_RESPONSES_DS,
  ENDPOINT_ACTIONS_DS,
  failedFleetActionErrorCode,
} from '../../../../../common/endpoint/constants';
import type {
  ActionDetails,
  ActivityLogAction,
  ActivityLogActionResponse,
  ActivityLogEntry,
  EndpointAction,
  EndpointActionDataParameterTypes,
  EndpointActionResponse,
  EndpointActionResponseDataOutput,
  EndpointActivityLogAction,
  EndpointActivityLogActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  WithAllKeys,
} from '../../../../../common/endpoint/types';
import { ActivityLogItemTypes } from '../../../../../common/endpoint/types';
import type { EndpointMetadataService } from '../../metadata';

/**
 * Type guard to check if a given Action is in the shape of the Endpoint Action.
 * @param item
 */
export const isLogsEndpointAction = (
  item: LogsEndpointAction | EndpointAction
): item is LogsEndpointAction => {
  return 'EndpointActions' in item && 'user' in item && 'agent' in item && '@timestamp' in item;
};

/**
 * Type guard to track if a given action response is in the shape of the Endpoint Action Response (from the endpoint index)
 * @param item
 */
export const isLogsEndpointActionResponse = (
  item: EndpointActionResponse | LogsEndpointActionResponse
): item is LogsEndpointActionResponse => {
  return 'EndpointActions' in item && 'agent' in item;
};

export interface NormalizedActionRequest {
  id: string;
  type: 'ACTION_REQUEST';
  agentType: ResponseActionAgentType;
  expiration: string;
  agents: string[];
  createdBy: string;
  createdAt: string;
  command: ResponseActionsApiCommandNames;
  comment?: string;
  parameters?: EndpointActionDataParameterTypes;
  alertIds?: string[];
  ruleId?: string;
  ruleName?: string;
  error?: EcsError;
  /** Host info that might have been stored along with the Action Request (ex. 3rd party EDR actions) */
  hosts: ActionDetails['hosts'];
}

/**
 * Given an Action record - either a fleet action or an endpoint action - this utility
 * will return a normalized data structure based on those two types, which
 * will avoid us having to either cast or do type guards against the two different
 * types of action request.
 */
export const mapToNormalizedActionRequest = (
  actionRequest: EndpointAction | LogsEndpointAction
): NormalizedActionRequest => {
  const type = 'ACTION_REQUEST';
  if (isLogsEndpointAction(actionRequest)) {
    return {
      agents: Array.isArray(actionRequest.agent.id)
        ? actionRequest.agent.id
        : [actionRequest.agent.id],
      agentType: actionRequest.EndpointActions.input_type,
      command: actionRequest.EndpointActions.data.command,
      comment: actionRequest.EndpointActions.data.comment,
      createdBy: actionRequest.user.id,
      createdAt: actionRequest['@timestamp'],
      expiration: actionRequest.EndpointActions.expiration,
      id: actionRequest.EndpointActions.action_id,
      type,
      parameters: actionRequest.EndpointActions.data.parameters,
      alertIds: actionRequest.EndpointActions.data.alert_id,
      ruleId: actionRequest.rule?.id,
      ruleName: actionRequest.rule?.name,
      error: actionRequest.error,
      hosts: actionRequest.EndpointActions.data.hosts ?? {},
    };
  }

  // Else, it's a Fleet Endpoint Action record
  return {
    agents: actionRequest.agents,
    agentType: actionRequest.input_type,
    command: actionRequest.data.command,
    comment: actionRequest.data.comment,
    createdBy: actionRequest.user_id,
    createdAt: actionRequest['@timestamp'],
    expiration: actionRequest.expiration,
    id: actionRequest.action_id,
    type,
    parameters: actionRequest.data.parameters,
    hosts: {},
  };
};

/**
 * Maps the list of fetch action responses (from both Endpoint and Fleet indexes) to a Map
 * whose keys are the action ID and value is the set of responses for that action id
 * @param actionResponses
 */
export const mapResponsesByActionId = (
  actionResponses: FetchActionResponsesResult
): { [actionId: string]: FetchActionResponsesResult } => {
  return [...actionResponses.endpointResponses, ...actionResponses.fleetResponses].reduce<{
    [actionId: string]: FetchActionResponsesResult;
  }>((acc, response) => {
    const actionId = getActionIdFromActionResponse(response);

    if (!acc[actionId]) {
      acc[actionId] = {
        endpointResponses: [],
        fleetResponses: [],
      };
    }

    if (isLogsEndpointActionResponse(response)) {
      acc[actionId].endpointResponses.push(response);
    } else {
      acc[actionId].fleetResponses.push(response);
    }

    return acc;
  }, {});
};

type ActionCompletionInfo = Pick<
  Required<ActionDetails>,
  'isCompleted' | 'completedAt' | 'wasSuccessful' | 'errors' | 'outputs' | 'agentState'
>;

export const getActionCompletionInfo = <
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TResponseMeta extends {} = {}
>(
  /** The normalized action request */
  action: NormalizedActionRequest,
  /** List of responses (from both Endpoint and Fleet) */
  actionResponses: FetchActionResponsesResult<TOutputContent, TResponseMeta>
): ActionCompletionInfo => {
  const agentIds = action.agents;
  const completedInfo: ActionCompletionInfo = {
    completedAt: undefined,
    errors: undefined,
    outputs: {},
    agentState: {},
    isCompleted: Boolean(agentIds.length),
    wasSuccessful: Boolean(agentIds.length),
  };

  const responsesByAgentId: ActionResponseByAgentId = mapActionResponsesByAgentId(actionResponses);

  for (const agentId of agentIds) {
    const agentResponses = responsesByAgentId[agentId];

    // Set the overall Action to not completed if at least
    // one of the agent responses is not complete yet.
    if (!agentResponses || !agentResponses.isCompleted) {
      completedInfo.isCompleted = false;
      completedInfo.wasSuccessful = false;
    }

    // individual agent state
    completedInfo.agentState[agentId] = {
      isCompleted: false,
      wasSuccessful: false,
      errors: undefined,
      completedAt: undefined,
    };

    // Store the outputs and agent state for any agent that sent a response
    if (agentResponses) {
      completedInfo.agentState[agentId].isCompleted = agentResponses.isCompleted;
      completedInfo.agentState[agentId].wasSuccessful = agentResponses.wasSuccessful;
      completedInfo.agentState[agentId].completedAt = agentResponses.completedAt;
      completedInfo.agentState[agentId].errors = agentResponses.errors;

      if (
        agentResponses.endpointResponse &&
        agentResponses.endpointResponse.EndpointActions.data.output
      ) {
        completedInfo.outputs[agentId] =
          agentResponses.endpointResponse.EndpointActions.data.output;
      }
    }
  }

  // If completed, then get the completed at date and determine if action as a whole was successful or not
  if (completedInfo.isCompleted) {
    const responseErrors: ActionCompletionInfo['errors'] = [];

    for (const normalizedAgentResponse of Object.values(responsesByAgentId)) {
      if (
        !completedInfo.completedAt ||
        completedInfo.completedAt < (normalizedAgentResponse.completedAt ?? '')
      ) {
        completedInfo.completedAt = normalizedAgentResponse.completedAt;
      }

      if (!normalizedAgentResponse.wasSuccessful) {
        completedInfo.wasSuccessful = false;
        responseErrors.push(
          ...(normalizedAgentResponse.errors ? normalizedAgentResponse.errors : [])
        );
      }
    }

    if (responseErrors.length) {
      completedInfo.errors = responseErrors;
    }
  }

  // If the action request has an Error, then we'll never get actual response from all of the agents
  // to which this action sent. In this case, we adjust the completion information to all be "complete"
  // and un-successful
  if (action.error?.message) {
    const errorMessage = action.error.message;

    completedInfo.completedAt = action.createdAt;
    completedInfo.isCompleted = true;
    completedInfo.wasSuccessful = false;
    completedInfo.errors = [errorMessage];

    Object.values(completedInfo.agentState).forEach((agentState) => {
      agentState.completedAt = action.createdAt;
      agentState.isCompleted = true;
      agentState.wasSuccessful = false;
      agentState.errors = [errorMessage];
    });
  }

  return completedInfo;
};

export const getActionStatus = ({
  expirationDate,
  isCompleted,
  wasSuccessful,
}: {
  expirationDate: string;
  isCompleted: boolean;
  wasSuccessful: boolean;
}): { status: ActionDetails['status']; isExpired: boolean } => {
  const isExpired = !isCompleted && expirationDate < new Date().toISOString();
  const status = isExpired
    ? 'failed'
    : isCompleted
    ? wasSuccessful
      ? 'successful'
      : 'failed'
    : 'pending';

  return { isExpired, status };
};

interface NormalizedAgentActionResponse<
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TResponseMeta extends {} = {}
> {
  isCompleted: boolean;
  completedAt: undefined | string;
  wasSuccessful: boolean;
  errors: undefined | string[];
  fleetResponse: undefined | EndpointActionResponse;
  endpointResponse: undefined | LogsEndpointActionResponse<TOutputContent, TResponseMeta>;
}

type ActionResponseByAgentId = Record<string, NormalizedAgentActionResponse>;

/**
 * Given a list of Action Responses, it will return a Map where keys are the Agent ID and
 * value is a object having information about the action responses associated with that agent id
 * @param actionResponses
 */
const mapActionResponsesByAgentId = <
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TResponseMeta extends {} = {}
>(
  actionResponses: FetchActionResponsesResult<TOutputContent, TResponseMeta>
): ActionResponseByAgentId => {
  const response = [
    ...actionResponses.endpointResponses,
    ...actionResponses.fleetResponses,
  ].reduce<ActionResponseByAgentId>((acc, actionResponseRecord) => {
    const agentId = getAgentIdFromActionResponse(actionResponseRecord);

    if (!acc[agentId]) {
      acc[agentId] = {
        isCompleted: false,
        completedAt: undefined,
        wasSuccessful: false,
        errors: undefined,
        fleetResponse: undefined,
        endpointResponse: undefined,
      };
    }

    if (isLogsEndpointActionResponse(actionResponseRecord)) {
      acc[agentId].endpointResponse = actionResponseRecord;
    } else {
      acc[agentId].fleetResponse = actionResponseRecord;
    }

    return acc;
  }, {});

  for (const agentNormalizedResponse of Object.values(response)) {
    agentNormalizedResponse.isCompleted =
      // Action is complete if an Endpoint Action Response was received
      Boolean(agentNormalizedResponse.endpointResponse) ||
      // OR:
      // If we did not have an endpoint response and the Fleet response has `error`, then
      // action is complete. Elastic Agent was unable to deliver the action request to the
      // endpoint, so we are unlikely to ever receive an Endpoint Response.
      Boolean(agentNormalizedResponse.fleetResponse?.error);

    // When completed, calculate additional properties about the action
    if (agentNormalizedResponse.isCompleted) {
      if (agentNormalizedResponse.endpointResponse) {
        agentNormalizedResponse.completedAt =
          agentNormalizedResponse.endpointResponse?.['@timestamp'];
        agentNormalizedResponse.wasSuccessful = true;
      } else if (
        // Check if perhaps the Fleet action response returned an error, in which case, the Fleet Agent
        // failed to deliver the Action to the Endpoint. If that's the case, we are not going to get
        // a Response from endpoint, thus mark the Action as completed and use the Fleet Message's
        // timestamp for the complete data/time.
        agentNormalizedResponse.fleetResponse &&
        agentNormalizedResponse.fleetResponse.error
      ) {
        agentNormalizedResponse.isCompleted = true;
        agentNormalizedResponse.completedAt = agentNormalizedResponse.fleetResponse['@timestamp'];
      }

      const errors: NormalizedAgentActionResponse['errors'] = [];

      // only one of the errors should be in there
      if (agentNormalizedResponse.endpointResponse?.error?.message) {
        errors.push(
          `Endpoint action response error: ${agentNormalizedResponse.endpointResponse.error.message}`
        );
      }

      if (agentNormalizedResponse.fleetResponse?.error) {
        errors.push(`Fleet action response error: ${agentNormalizedResponse.fleetResponse.error}`);
      }

      if (errors.length) {
        agentNormalizedResponse.wasSuccessful = false;
        agentNormalizedResponse.errors = errors;
      }
    }
  }

  return response;
};

/**
 * Given an Action response, this will return the Agent ID for that action response.
 * @param actionResponse
 */
export const getAgentIdFromActionResponse = (
  actionResponse: EndpointActionResponse | LogsEndpointActionResponse
): string => {
  if (isLogsEndpointActionResponse(actionResponse)) {
    return Array.isArray(actionResponse.agent.id)
      ? actionResponse.agent.id[0]
      : actionResponse.agent.id;
  }

  return actionResponse.agent_id;
};

/**
 * Given an Action response from either Endpoint or Fleet, utility will return its action id
 * @param actionResponse
 */
export const getActionIdFromActionResponse = (
  actionResponse: EndpointActionResponse | LogsEndpointActionResponse
): string => {
  if (isLogsEndpointActionResponse(actionResponse)) {
    return actionResponse.EndpointActions.action_id;
  }

  return actionResponse.action_id;
};

// common helpers used by old and new log API
export const getDateFilters = ({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}): QueryDslQueryContainer[] => {
  const dateFilters: QueryDslQueryContainer[] = [];
  if (startDate) {
    dateFilters.push({ range: { '@timestamp': { gte: startDate } } });
  }
  if (endDate) {
    dateFilters.push({ range: { '@timestamp': { lte: endDate } } });
  }
  return dateFilters;
};

export const getUniqueLogData = (activityLogEntries: ActivityLogEntry[]): ActivityLogEntry[] => {
  // find the error responses for actions that didn't make it to fleet index
  const onlyResponsesForFleetErrors: string[] = activityLogEntries.reduce<string[]>((acc, curr) => {
    if (
      curr.type === ActivityLogItemTypes.RESPONSE &&
      curr.item.data.error?.code === failedFleetActionErrorCode
    ) {
      acc.push(curr.item.data.EndpointActions.action_id);
    }
    return acc;
  }, []);

  // all actions and responses minus endpoint actions.
  const nonEndpointActionsDocs = activityLogEntries.filter(
    (e) => e.type !== ActivityLogItemTypes.ACTION
  );

  // only endpoint actions that match the error responses
  const onlyEndpointActionsDocWithoutFleetActions: ActivityLogEntry[] = activityLogEntries.filter(
    (e) =>
      e.type === ActivityLogItemTypes.ACTION &&
      onlyResponsesForFleetErrors.includes(
        (e.item.data as LogsEndpointAction).EndpointActions.action_id
      )
  );

  // join the error actions and the rest
  return [...nonEndpointActionsDocs, ...onlyEndpointActionsDocWithoutFleetActions];
};

const matchesDsNamePattern = ({
  dataStreamName,
  index,
}: {
  dataStreamName: string;
  index: string;
}): boolean => index.includes(dataStreamName);

export const categorizeResponseResults = ({
  results,
}: {
  results: Array<estypes.SearchHit<EndpointActionResponse | LogsEndpointActionResponse>>;
}): Array<ActivityLogActionResponse | EndpointActivityLogActionResponse> => {
  return results?.length
    ? results?.map((e) => {
        const isResponseDoc: boolean = matchesDsNamePattern({
          dataStreamName: ENDPOINT_ACTION_RESPONSES_DS,
          index: e._index,
        });
        return isResponseDoc
          ? {
              type: ActivityLogItemTypes.RESPONSE,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              item: { id: e._id!, data: e._source as LogsEndpointActionResponse },
            }
          : {
              type: ActivityLogItemTypes.FLEET_RESPONSE,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              item: { id: e._id!, data: e._source as EndpointActionResponse },
            };
      })
    : [];
};

export const categorizeActionResults = ({
  results,
}: {
  results: Array<estypes.SearchHit<EndpointAction | LogsEndpointAction>>;
}): Array<ActivityLogAction | EndpointActivityLogAction> => {
  return results?.length
    ? results?.map((e) => {
        const isActionDoc: boolean = matchesDsNamePattern({
          dataStreamName: ENDPOINT_ACTIONS_DS,
          index: e._index,
        });
        return isActionDoc
          ? {
              type: ActivityLogItemTypes.ACTION,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              item: { id: e._id!, data: e._source as LogsEndpointAction },
            }
          : {
              type: ActivityLogItemTypes.FLEET_ACTION,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              item: { id: e._id!, data: e._source as EndpointAction },
            };
      })
    : [];
};

// for 8.4+ we only search on endpoint actions index
// and thus there are only endpoint actions in the results
export const formatEndpointActionResults = (
  results: Array<estypes.SearchHit<LogsEndpointAction>>
): EndpointActivityLogAction[] => {
  return results?.length
    ? results?.map((e) => {
        return {
          type: ActivityLogItemTypes.ACTION,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          item: { id: e._id!, data: e._source as LogsEndpointAction },
        };
      })
    : [];
};

export const getAgentHostNamesWithIds = async ({
  esClient,
  agentIds,
  metadataService,
}: {
  esClient: ElasticsearchClient;
  agentIds: string[];
  metadataService: EndpointMetadataService;
}): Promise<{ [id: string]: string }> => {
  // get host metadata docs with queried agents
  const metaDataDocs = await metadataService.findHostMetadataForFleetAgents([...new Set(agentIds)]);
  // agent ids and names from metadata
  // map this into an object as {id1: name1, id2: name2} etc
  const agentsMetadataInfo = agentIds.reduce<{ [id: string]: string }>((acc, id) => {
    acc[id] = metaDataDocs.find((doc) => doc.agent.id === id)?.host.hostname ?? '';
    return acc;
  }, {});

  return agentsMetadataInfo;
};

export const createActionDetailsRecord = <T extends ActionDetails = ActionDetails>(
  actionRequest: NormalizedActionRequest,
  actionResponses: FetchActionResponsesResult,
  agentHostInfo: Record<string, string>
): T => {
  const { isCompleted, completedAt, wasSuccessful, errors, outputs, agentState } =
    getActionCompletionInfo(actionRequest, actionResponses);

  const { isExpired, status } = getActionStatus({
    expirationDate: actionRequest.expiration,
    isCompleted,
    wasSuccessful,
  });

  const actionDetails: WithAllKeys<ActionDetails> = {
    action: actionRequest.id,
    id: actionRequest.id,
    agentType: actionRequest.agentType,
    agents: actionRequest.agents,
    hosts: actionRequest.agents.reduce<ActionDetails['hosts']>((acc, id) => {
      acc[id] = { name: agentHostInfo[id] || actionRequest.hosts[id]?.name || '' };
      return acc;
    }, {}),
    command: actionRequest.command,
    startedAt: actionRequest.createdAt,
    isCompleted,
    completedAt,
    wasSuccessful,
    errors,
    isExpired,
    status,
    outputs,
    agentState,
    createdBy: actionRequest.createdBy,
    comment: actionRequest.comment,
    parameters: actionRequest.parameters,
    alertIds: actionRequest.alertIds,
    ruleId: actionRequest.ruleId,
    ruleName: actionRequest.ruleName,
  };

  return actionDetails as T;
};

export const getActionRequestExpiration = (): string => {
  return moment().add(2, 'weeks').toISOString();
};
