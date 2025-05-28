/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { ResponseActionsClient } from '../../services';
import { getResponseActionsClient, NormalizedExternalConnectorClient } from '../../services';
import { errorHandler } from '../error_handler';
import { CUSTOM_SCRIPTS_ROUTE } from '../../../../common/endpoint/constants';
import type { CustomScriptsRequestQueryParams } from '../../../../common/api/endpoint/custom_scripts/get_custom_scripts_route';
import { CustomScriptsRequestSchema } from '../../../../common/api/endpoint/custom_scripts/get_custom_scripts_route';

import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';

/**
 * Registers the custom scripts route
 * @param router - Security solution plugin router
 * @param endpointContext - Endpoint app context
 */
export const registerCustomScriptsRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: CUSTOM_SCRIPTS_ROUTE,
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
          request: CustomScriptsRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadSecuritySolution'] },
        endpointContext.logFactory.get('customScriptsRoute'),
        getCustomScriptsRouteHandler(endpointContext)
      )
    );
};

/**
 * Creates a handler for the custom scripts route
 * @param endpointContext - Endpoint app context
 * @returns Request handler for custom scripts
 */
export const getCustomScriptsRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  never,
  CustomScriptsRequestQueryParams,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('customScriptsRoute');

  return async (context, request, response) => {
    const { agentType = 'endpoint' } = request.query;

    logger.debug(`Retrieving custom scripts for: agentType ${agentType}`);

    try {
      const coreContext = await context.core;
      const user = coreContext.security.authc.getCurrentUser();
      const esClient = coreContext.elasticsearch.client.asInternalUser;
      const connectorActions = (await context.actions).getActionsClient();
      const spaceId = (await context.securitySolution).getSpaceId();
      const responseActionsClient: ResponseActionsClient = getResponseActionsClient(agentType, {
        esClient,
        spaceId,
        endpointService: endpointContext.service,
        username: user?.username || 'unknown',
        connectorActions: new NormalizedExternalConnectorClient(connectorActions, logger),
      });

      const data = await responseActionsClient.getCustomScripts();

      return response.ok({ body: data });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
