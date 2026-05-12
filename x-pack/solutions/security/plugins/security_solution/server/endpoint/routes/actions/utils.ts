/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';
import { get } from 'lodash';
import type { KibanaRequest } from '@kbn/core/server';
import type { MemoryDumpActionRequestBody } from '../../../../common/api/endpoint/actions/response_actions/memory_dump';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import { isActionSupportedByAgentType } from '../../../../common/endpoint/service/response_actions/is_response_action_supported';
import { EndpointAuthorizationError } from '../../errors';
import { fetchActionRequestById } from '../../services/actions/utils/fetch_action_request_by_id';
import { checkCancelPermission } from '../../../../common/endpoint/service/authz/cancel_authz_utils';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type { EndpointAppContext } from '../../types';
import type {
  CancelActionRequestBody,
  ResponseActionsRequestBody,
  ExecuteActionRequestBody,
  SuspendProcessRequestBody,
  KillProcessRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
  ScanActionRequestBody,
  RunScriptActionRequestBody,
} from '../../../../common/api/endpoint';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';
import type { ActionDetails } from '../../../../common/endpoint/types';
import type { ResponseActionsClient } from '../../services';
import { responseActionsWithLegacyActionProperty } from '../../services/actions/constants';

type CommandsWithFileAccess = Readonly<
  Record<ResponseActionsApiCommandNames, Readonly<Record<ResponseActionAgentType, boolean>>>
>;

// FYI: this object here should help to quickly catch instances where we might forget to update the
//      authz on the file info/download apis when a response action needs to support file downloads.
const COMMANDS_WITH_ACCESS_TO_FILES: CommandsWithFileAccess = deepFreeze<CommandsWithFileAccess>({
  'get-file': {
    endpoint: true,
    sentinel_one: true,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
  execute: {
    endpoint: true,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
  'running-processes': {
    endpoint: false,
    sentinel_one: true,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
  upload: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
  scan: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
  isolate: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
  unisolate: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
  'kill-process': {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
  'suspend-process': {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
  runscript: {
    endpoint: true,
    sentinel_one: true,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
  cancel: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
  'memory-dump': {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
});

/**
 * Returns boolean indicating if the response action has access to files.
 * NOTE that this utility DOES NOT check privileges.
 * @param agentType
 * @param action
 */
export const doesActionHaveFileAccess = (
  agentType: ResponseActionAgentType,
  action: ResponseActionsApiCommandNames
): boolean => {
  return get(COMMANDS_WITH_ACCESS_TO_FILES, `${action}.${agentType}`, false);
};

/**
 * Checks to ensure that the user has the correct authz for the response action associated with the action id.
 *
 * FYI: Additional check is needed because the File info and download APIs are used by multiple response actions,
 *      thus we want to ensure that we don't allow access to file associated with response actions the user does
 *      not have authz to.
 *
 * @param context
 * @param request
 */
export const ensureUserHasAuthzToFilesForAction = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest
): Promise<void> => {
  const securitySolution = await context.securitySolution;
  const spaceId = securitySolution.getSpaceId();
  const endpointService = securitySolution.getEndpointService();
  const userAuthz = await securitySolution.getEndpointAuthz();
  const logger = endpointService.createLogger('ensureUserHasAuthzToFilesForAction');
  const { action_id: actionId } = request.params as { action_id: string };

  logger.debug(`Validating action id [${actionId}] has access to files in space [${spaceId}]`);

  const {
    EndpointActions: {
      data: { command },
      input_type: agentType,
    },
  } = await fetchActionRequestById(endpointService, spaceId, actionId);

  logger.debug(`Action [${actionId}] is for command [${command}] with agentType [${agentType}]`);

  // Check if command is supported by the agent type
  if (!isActionSupportedByAgentType(agentType, command, 'manual')) {
    throw new CustomHttpRequestError(
      `Response action [${command}] not supported for agent type [${agentType}]`,
      400
    );
  }

  // Check if the command is marked as having access to files
  if (!get(COMMANDS_WITH_ACCESS_TO_FILES, `${command}.${agentType}`, false)) {
    throw new CustomHttpRequestError(
      `Response action [${command}] for agent type [${agentType}] does not support file downloads`,
      400
    );
  }

  let hasAuthzToCommand = false;

  switch (command) {
    case 'get-file':
      hasAuthzToCommand = userAuthz.canWriteFileOperations;
      break;

    case 'execute':
      hasAuthzToCommand = userAuthz.canWriteExecuteOperations;
      break;

    case 'running-processes':
      hasAuthzToCommand = userAuthz.canGetRunningProcesses;
      break;

    case 'runscript':
      hasAuthzToCommand = userAuthz.canWriteExecuteOperations;
      break;
    case 'cancel':
      hasAuthzToCommand = userAuthz.canCancelAction;
      break;
  }

  if (!hasAuthzToCommand) {
    throw new EndpointAuthorizationError();
  }
};

/**
 * Executes a response action using the appropriate client method based on the command type
 */
export const executeResponseAction = async (
  command: ResponseActionsApiCommandNames,
  requestBody: ResponseActionsRequestBody,
  responseActionsClient: ResponseActionsClient
): Promise<ActionDetails> => {
  switch (command) {
    case 'isolate':
      return responseActionsClient.isolate(requestBody);
    case 'unisolate':
      return responseActionsClient.release(requestBody);
    case 'running-processes':
      return responseActionsClient.runningProcesses(requestBody);
    case 'execute':
      return responseActionsClient.execute(requestBody as ExecuteActionRequestBody);
    case 'suspend-process':
      return responseActionsClient.suspendProcess(requestBody as SuspendProcessRequestBody);
    case 'kill-process':
      return responseActionsClient.killProcess(requestBody as KillProcessRequestBody);
    case 'get-file':
      return responseActionsClient.getFile(requestBody as ResponseActionGetFileRequestBody);
    case 'upload':
      return responseActionsClient.upload(requestBody as UploadActionApiRequestBody);
    case 'scan':
      return responseActionsClient.scan(requestBody as ScanActionRequestBody);
    case 'runscript':
      return responseActionsClient.runscript(requestBody as RunScriptActionRequestBody);
    case 'cancel':
      return responseActionsClient.cancel(requestBody as CancelActionRequestBody);
    case 'memory-dump':
      return responseActionsClient.memoryDump(requestBody as MemoryDumpActionRequestBody);
    default:
      throw new CustomHttpRequestError(
        `No handler found for response action command: [${command}]`,
        501
      );
  }
};

/**
 * Builds the standardized response object for response actions
 */
export const buildResponseActionResult = (
  command: ResponseActionsApiCommandNames,
  action: ActionDetails
): { body: { action?: string; data: ActionDetails } } => {
  const { action: actionId, ...data } = action;
  const legacyResponseData = responseActionsWithLegacyActionProperty.includes(command)
    ? {
        action: actionId ?? data.id ?? '',
      }
    : {};

  return {
    body: {
      ...legacyResponseData,
      data,
    },
  };
};

/**
 * Creates additional authorization checks function for cancel action.
 * Business logic validation has been moved to the service layer (validateRequest).
 * This function only handles HTTP-specific authorization checks.
 */
export const createCancelActionAdditionalChecks = (endpointContext: EndpointAppContext) => {
  return async (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest
  ): Promise<void> => {
    const { parameters } = request.body as CancelActionRequestBody;
    const actionId = parameters.id;
    const logger = endpointContext.logFactory.get('cancelActionAdditionalChecks');
    // Get space ID from context
    const spaceId = (await context.securitySolution).getSpaceId();

    // Fetch original action to determine command type and agent type
    const originalAction = await fetchActionRequestById(endpointContext.service, spaceId, actionId);

    if (!originalAction) {
      throw new CustomHttpRequestError(`Action with id '${actionId}' not found.`, 404);
    }

    // Extract command and agent type from original action
    const command = originalAction.EndpointActions?.data?.command;
    const agentType = originalAction.EndpointActions?.input_type;

    if (!command) {
      logger.error(`Action ${actionId} missing command information for ${agentType}`);
      throw new CustomHttpRequestError(
        `Unable to determine command type for action '${actionId}'`,
        500
      );
    }

    if (!agentType) {
      logger.error(`Action ${actionId} missing agent type information for ${command}`);
      throw new CustomHttpRequestError(
        `Unable to determine agent type for action '${actionId}'`,
        500
      );
    }

    // Use utility to check if cancellation is allowed
    const endpointAuthz = await (await context.securitySolution).getEndpointAuthz();
    const canCancel = checkCancelPermission(
      endpointAuthz,
      endpointContext.experimentalFeatures,
      agentType,
      command
    );

    if (!canCancel) {
      throw new EndpointAuthorizationError();
    }
  };
};
