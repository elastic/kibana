/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { CancelActionRequestBody } from '../../../../../common/api/endpoint';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import type { EndpointAppContext } from '../../../types';
import { fetchActionRequestById } from '../../../services/actions/utils/fetch_action_request_by_id';
import { getRequiredCancelPermissions } from '../../../../../common/endpoint/service/authz/authz';
import { EndpointAuthorizationError } from '../../../errors';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';

/**
 * Validates command-specific permissions for cancel operations.
 * This function is used as additional authorization check after baseline permissions are verified.
 *
 * @param context - Security solution request handler context
 * @param request - Kibana request containing the cancel action parameters
 * @param endpointContext - Endpoint app context
 * @param logger - Logger instance
 */
export const validateCommandSpecificCancelPermissions = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest,
  endpointContext: EndpointAppContext,
  logger: Logger
): Promise<void> => {
  const spaceId = (await context.securitySolution).getSpaceId();
  const actionId = (request.body as CancelActionRequestBody).parameters.id;

  // Fetch the action to be cancelled to determine its command type
  const actionToCancel = await fetchActionRequestById(endpointContext.service, spaceId, actionId);

  if (!actionToCancel) {
    throw new CustomHttpRequestError(`Action with id '${actionId}' not found.`, 404);
  }

  // Get the command type from the action
  const command = actionToCancel.EndpointActions?.data?.command;
  if (!command) {
    logger.warn(`Action ${actionId} missing command information`);
    throw new CustomHttpRequestError(
      `Unable to determine command type for action '${actionId}'`,
      400
    );
  }

  // Get required permissions for this specific command
  let requiredPermissions;
  try {
    requiredPermissions = getRequiredCancelPermissions(command);
  } catch (error) {
    logger.warn(`Unknown command type for cancel authorization: ${command}`);
    throw new EndpointAuthorizationError({
      message: `Cancel operation not supported for command type: ${command}`,
    });
  }

  // Check command-specific authorization (baseline permission already checked by withEndpointAuthz)
  const endpointAuthz = await (await context.securitySolution).getEndpointAuthz();
  const hasCommandPermission = endpointAuthz[requiredPermissions];

  if (!hasCommandPermission) {
    logger.warn(
      `User lacks command-specific permission '${requiredPermissions}' for cancel action`
    );
    throw new EndpointAuthorizationError(
      {
        need_all: [requiredPermissions],
      },
      `User lacks command-specific permission '${requiredPermissions}' to cancel '${command}' action.`
    );
  }
};
