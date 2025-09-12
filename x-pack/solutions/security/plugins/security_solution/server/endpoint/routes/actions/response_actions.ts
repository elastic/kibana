/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';
import {
  EndpointActionGetFileSchema,
  ExecuteActionRequestSchema,
  GetProcessesRouteRequestSchema,
  IsolateRouteRequestSchema,
  KillProcessRouteRequestSchema,
  type ResponseActionsRequestBody,
  ScanActionRequestSchema,
  SuspendProcessRouteRequestSchema,
  UnisolateRouteRequestSchema,
  UploadActionRequestSchema,
  RunScriptActionRequestSchema,
  CancelActionRequestSchema,
  type CancelActionRequestBody,
} from '../../../../common/api/endpoint';

import {
  CANCEL_ROUTE,
  EXECUTE_ROUTE,
  GET_FILE_ROUTE,
  GET_PROCESSES_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  KILL_PROCESS_ROUTE,
  RUN_SCRIPT_ROUTE,
  SCAN_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  UNISOLATE_HOST_ROUTE_V2,
  UPLOAD_ROUTE,
} from '../../../../common/endpoint/constants';
import type {
  ResponseActionParametersWithProcessData,
  ResponseActionsExecuteParameters,
  ResponseActionScanParameters,
  EndpointActionDataParameterTypes,
  ActionDetails,
  ResponseActionRunScriptParameters,
} from '../../../../common/endpoint/types';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { stringify } from '../../utils/stringify';
import { errorHandler } from '../error_handler';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import type { ResponseActionsClient } from '../../services';
import { getResponseActionsClient, NormalizedExternalConnectorClient } from '../../services';
import { executeResponseAction, buildResponseActionResult } from './utils';
import { checkCancelPermission } from '../../../../common/endpoint/service/authz/cancel_authz_utils';
import { EndpointAuthorizationError } from '../../errors';
import { fetchActionRequestById } from '../../services/actions/utils/fetch_action_request_by_id';

export function registerResponseActionRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  const logger = endpointContext.logFactory.get('hostIsolation');

  router.versioned
    .post({
      access: 'public',
      path: ISOLATE_HOST_ROUTE_V2,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: IsolateRouteRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canIsolateHost'] },
        logger,
        responseActionRequestHandler(endpointContext, 'isolate')
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: UNISOLATE_HOST_ROUTE_V2,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: UnisolateRouteRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canUnIsolateHost'] },
        logger,
        responseActionRequestHandler(endpointContext, 'unisolate')
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: KILL_PROCESS_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: KillProcessRouteRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canKillProcess'] },
        logger,
        responseActionRequestHandler<ResponseActionParametersWithProcessData>(
          endpointContext,
          'kill-process'
        )
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: SUSPEND_PROCESS_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: SuspendProcessRouteRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canSuspendProcess'] },
        logger,
        responseActionRequestHandler<ResponseActionParametersWithProcessData>(
          endpointContext,
          'suspend-process'
        )
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: GET_PROCESSES_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: GetProcessesRouteRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canGetRunningProcesses'] },
        logger,
        responseActionRequestHandler(endpointContext, 'running-processes')
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: GET_FILE_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: EndpointActionGetFileSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteFileOperations'] },
        logger,
        responseActionRequestHandler(endpointContext, 'get-file')
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: EXECUTE_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: ExecuteActionRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteExecuteOperations'] },
        logger,
        responseActionRequestHandler<ResponseActionsExecuteParameters>(endpointContext, 'execute')
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: UPLOAD_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        authRequired: true,

        body: {
          accepts: ['multipart/form-data'],
          output: 'stream',
          maxBytes: endpointContext.serverConfig.maxUploadResponseActionFileBytes,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: UploadActionRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteFileOperations'] },
        logger,
        responseActionRequestHandler<ResponseActionsExecuteParameters>(endpointContext, 'upload')
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: SCAN_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: ScanActionRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteScanOperations'] },
        logger,
        responseActionRequestHandler<ResponseActionScanParameters>(endpointContext, 'scan')
      )
    );
  router.versioned
    .post({
      access: 'public',
      path: RUN_SCRIPT_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: RunScriptActionRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteExecuteOperations'] },
        logger,
        responseActionRequestHandler<ResponseActionRunScriptParameters>(
          endpointContext,
          'runscript'
        )
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: CANCEL_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: CancelActionRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canAccessResponseConsole'] }, // Use base permission for middleware
        logger,
        cancelActionHandler(endpointContext)
      )
    );
}

/**
 * Custom cancel action handler that uses utility functions for dynamic permission checking
 * instead of static authorization middleware.
 */
function cancelActionHandler(
  endpointContext: EndpointAppContext
): RequestHandler<unknown, unknown, CancelActionRequestBody, SecuritySolutionRequestHandlerContext> {
  return async (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest<unknown, unknown, CancelActionRequestBody>,
    response: KibanaResponseFactory
  ) => {
    const cancelActionLogger = endpointContext.logFactory.get('cancelActionHandler');
    const { parameters } = request.body;
    const actionId = parameters.action_id;

    try {
      // Get space ID from context
      const spaceId = (await context.securitySolution).getSpaceId();

      // Fetch original action to determine command type and agent type
      const originalAction = await fetchActionRequestById(
        endpointContext.service,
        spaceId,
        actionId
      );

      if (!originalAction) {
        return errorHandler(
          cancelActionLogger,
          response,
          new CustomHttpRequestError(`Action with id '${actionId}' not found.`, 404)
        );
      }

      // Validate that endpoint_id (if provided) is associated with the original action
      const requestEndpointId = request.body.endpoint_ids?.[0];
      if (requestEndpointId && originalAction.agent?.id) {
        const originalActionAgentIds = Array.isArray(originalAction.agent.id)
          ? originalAction.agent.id
          : [originalAction.agent.id];
        if (!originalActionAgentIds.includes(requestEndpointId)) {
          return errorHandler(
            cancelActionLogger,
            response,
            new CustomHttpRequestError(
              `Endpoint '${requestEndpointId}' is not associated with action '${actionId}'`,
              403
            )
          );
        }
      }

      // Extract command and agent type from original action
      const command = originalAction.EndpointActions?.data?.command;
      const agentType = originalAction.EndpointActions?.input_type;

      if (!command) {
        cancelActionLogger.warn(`Action ${actionId} missing command information`);
        return errorHandler(
          cancelActionLogger,
          response,
          new CustomHttpRequestError(
            `Unable to determine command type for action '${actionId}'`,
            500
          )
        );
      }

      if (!agentType) {
        cancelActionLogger.warn(`Action ${actionId} missing agent type information`);
        return errorHandler(
          cancelActionLogger,
          response,
          new CustomHttpRequestError(`Unable to determine agent type for action '${actionId}'`, 500)
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
        return errorHandler(cancelActionLogger, response, new EndpointAuthorizationError());
      }

      // Proceed with existing cancellation logic using the standard response action handler
      return responseActionRequestHandler(endpointContext, 'cancel')(context, request, response);
    } catch (error) {
      return errorHandler(cancelActionLogger, response, error);
    }
  };
}

function responseActionRequestHandler<T extends EndpointActionDataParameterTypes>(
  endpointContext: EndpointAppContext,
  command: ResponseActionsApiCommandNames
): RequestHandler<
  unknown,
  unknown,
  ResponseActionsRequestBody,
  SecuritySolutionRequestHandlerContext
> {
  const logger = endpointContext.logFactory.get('responseActionsHandler');

  return async (context, req, res) => {
    logger.debug(() => `response action [${command}]:\n${stringify(req.body)}`);

    try {
      const experimentalFeatures = endpointContext.experimentalFeatures;

      // Note:  because our API schemas are defined as module static variables (as opposed to a
      //        `getter` function), we need to include this additional validation here, since
      //        `agent_type` is included in the schema independent of the feature flag
      if (isThirdPartyFeatureDisabled(req.body.agent_type, command, experimentalFeatures)) {
        return errorHandler(
          logger,
          res,
          new CustomHttpRequestError(`[request body.agent_type]: feature is disabled`, 400)
        );
      }

      const coreContext = await context.core;
      const user = coreContext.security.authc.getCurrentUser();
      const esClient = coreContext.elasticsearch.client.asInternalUser;
      const casesClient = await endpointContext.service.getCasesClient(req);
      const connectorActions = (await context.actions).getActionsClient();
      const spaceId = (await context.securitySolution).getSpaceId();
      const responseActionsClient: ResponseActionsClient = getResponseActionsClient(
        req.body.agent_type || 'endpoint',
        {
          esClient,
          casesClient,
          spaceId,
          endpointService: endpointContext.service,
          username: user?.username || 'unknown',
          connectorActions: new NormalizedExternalConnectorClient(connectorActions, logger),
        }
      );

      const action: ActionDetails = await executeResponseAction(
        command,
        req.body,
        responseActionsClient
      );

      const result = buildResponseActionResult(command, action);
      return res.ok(result);
    } catch (err) {
      return errorHandler(logger, res, err);
    }
  };
}

function isThirdPartyFeatureDisabled(
  agentType: ResponseActionAgentType | undefined,
  command: ResponseActionsApiCommandNames,
  experimentalFeatures: EndpointAppContext['experimentalFeatures']
): boolean {
  if (
    agentType === 'sentinel_one' &&
    command === 'runscript' &&
    !experimentalFeatures.responseActionsSentinelOneRunScriptEnabled
  ) {
    return true;
  }

  if (
    (agentType === 'sentinel_one' && !experimentalFeatures.responseActionsSentinelOneV1Enabled) ||
    (agentType === 'crowdstrike' &&
      !experimentalFeatures.responseActionsCrowdstrikeManualHostIsolationEnabled) ||
    (agentType === 'microsoft_defender_endpoint' &&
      !experimentalFeatures.responseActionsMSDefenderEndpointEnabled)
  ) {
    return true;
  }

  return false;
}
