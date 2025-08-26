/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type {
  PendingActionsRequestQueryParams,
  PendingActionsResponse,
} from '../../../../common/api/endpoint/actions/status';
import { PendingActionsRequestQuerySchema } from '../../../../common/api/endpoint/actions/status';
import { PENDING_ACTIONS_ROUTE } from '../../../../common/endpoint/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { errorHandler } from '../error_handler';
import { getActionList } from '../../services/actions';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { ACTIONS_SEARCH_PAGE_SIZE } from '../../services/actions/constants';

export function registerPendingActionsRoute(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  const logger = endpointContext.logFactory.get('pendingActionsHandler');

  router.versioned
    .get({
      access: 'internal',
      path: PENDING_ACTIONS_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: PendingActionsRequestQuerySchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadActionsLogManagement'] },
        logger,
        pendingActionsRequestHandler(endpointContext)
      )
    );
}

function pendingActionsRequestHandler(
  endpointContext: EndpointAppContext
): RequestHandler<
  unknown,
  PendingActionsRequestQueryParams,
  unknown,
  SecuritySolutionRequestHandlerContext
> {
  const logger = endpointContext.logFactory.get('pendingActionsHandler');

  return async (context, req, res) => {
    try {
      const coreContext = await context.core;
      const user = coreContext.security.authc.getCurrentUser();
      const spaceId = (await context.securitySolution).getSpaceId();

      const { agentType, endpointId, page = 1, pageSize = 10 } = req.query;

      const { data: allActions } = await getActionList({
        spaceId,
        endpointService: endpointContext.service,
        unExpiredOnly: true,
        elasticAgentIds: endpointId ? [endpointId] : undefined,
        agentTypes: agentType ? [agentType as ResponseActionAgentType] : undefined,
        userIds: user?.username ? [user.username] : undefined,
        pageSize: ACTIONS_SEARCH_PAGE_SIZE, // Get all actions first, then filter and paginate
      });

      // Filter to only incomplete actions (pending)
      const pendingActions = allActions.filter((action) => {
        return Object.values(action.agentState).some((agentState) => !agentState.isCompleted);
      });

      // Convert to the expected response format
      const convertedActions = pendingActions.map((action) => ({
        id: action.id,
        command: action.command,
        isCompleted: false,
        wasSuccessful: false,
        status: 'pending' as const,
        createdBy: action.createdBy,
        '@timestamp': action.startedAt,
        agents: action.agents.map((agentId: string) => ({
          agent: { id: agentId },
          host: { name: action.hosts?.[agentId]?.name || agentId },
        })),
        comment: action.comment,
        parameters: action.parameters,
      }));

      // Apply pagination to the filtered results
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedActions = convertedActions.slice(startIndex, endIndex);

      const filteredResponse: PendingActionsResponse = {
        data: paginatedActions,
        total: convertedActions.length,
        page,
        pageSize,
      };

      return res.ok({
        body: filteredResponse,
      });
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
}
