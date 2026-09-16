/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ExecutionError } from '@kbn/workflows/server';
import type { StepHandlerContext, PollHandlerContext } from '@kbn/workflows-extensions/server';
import type { EndpointAuthz } from '../../../common/endpoint/types/authz';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import { getActionDetailsById } from '../../endpoint/services/actions';

export const pollActionStateSchema = z.object({
  action_id: z.string(),
});

/**
 * Asserts the workflow user holds a given endpoint privilege, then returns an
 * authenticated internal response-actions client together with the current spaceId.
 * Throws `ExecutionError` with type `'PermissionError'` when the privilege is absent.
 */
export const getAuthorizedResponseActionsClient = async (
  endpointAppContextService: EndpointAppContextService,
  context: StepHandlerContext,
  authzKey: keyof EndpointAuthz
) => {
  const spaceId = context.contextManager.getContext().workflow.spaceId;
  const request = context.contextManager.getFakeRequest();

  // The internal response-actions client runs as an automated, unsecured
  // client and skips the per-user privilege checks the HTTP route enforces
  // via `withEndpointAuthz()`. Assert the caller's privilege here so
  // reaching the API via workflow step cannot bypass endpoint RBAC.
  const authz = await endpointAppContextService.getEndpointAuthz(request);
  if (!authz[authzKey]) {
    throw new ExecutionError({
      type: 'PermissionError',
      message: `The workflow user does not have the ${authzKey} endpoint privilege.`,
    });
  }

  // Attribute the action to the initiating analyst (falls back to the
  // default system user when the current user cannot be resolved) so the
  // Response Actions audit trail records who requested it, not `elastic`.
  const username = endpointAppContextService.getCurrentUsername(request);
  const client = endpointAppContextService.getInternalResponseActionsClient({
    spaceId,
    username,
    agentType: 'endpoint',
    isAutomated: false,
  });

  return { client };
};

/**
 * Shared `poll` implementation for response-action steps. Reads `action_id` from
 * the poll state, waits for the action to complete, and returns the standard output shape.
 */
export const pollResponseAction = async (
  endpointAppContextService: EndpointAppContextService,
  context: PollHandlerContext<z.ZodType, z.ZodObject, typeof pollActionStateSchema>,
  actionLabel: string
) => {
  const spaceId = context.contextManager.getContext().workflow.spaceId;
  const actionId = context.state?.action_id;

  if (!actionId) {
    throw new ExecutionError({
      type: 'ValidationError',
      message: 'Missing action_id in poll state.',
    });
  }

  const details = await getActionDetailsById(endpointAppContextService, spaceId, actionId);

  if (!details.isCompleted) {
    return undefined;
  }

  return {
    output: {
      action_id: details.id,
      status: details.status,
      was_successful: details.wasSuccessful,
      message: details.wasSuccessful
        ? `${actionLabel} completed successfully. Action ID: ${details.id}`
        : `${actionLabel} failed. Action ID: ${details.id}`,
    },
  };
};
