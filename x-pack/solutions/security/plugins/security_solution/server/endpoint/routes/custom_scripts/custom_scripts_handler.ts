/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { errorHandler } from '../error_handler';
import { CUSTOM_SCRIPTS_ROUTE } from '../../../../common/endpoint/constants';
import { getCustomScriptsClient } from '../../services/custom_scripts/clients/get_custom_scripts_client';
import type { CustomScriptsRequestQueryParams } from '../../../../common/api/endpoint/custom_scripts/get_custom_scripts_route';
import { CustomScriptsRequestSchema } from '../../../../common/api/endpoint/custom_scripts/get_custom_scripts_route';

import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';

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

    // Note: because our API schemas are defined as module static variables (as opposed to a
    //        `getter` function), we need to include this additional validation here, since
    //        `agent_type` is included in the schema independent of the feature flag
    if (
      (agentType === 'sentinel_one' &&
        !endpointContext.experimentalFeatures.responseActionsSentinelOneV1Enabled) ||
      (agentType === 'crowdstrike' &&
        !endpointContext.experimentalFeatures.crowdstrikeRunScriptEnabled)
    ) {
      return errorHandler(
        logger,
        response,
        new CustomHttpRequestError(`[request query.agent_type]: feature is disabled`, 400)
      );
    }

    try {
      const [securitySolutionPlugin, corePlugin, actionsPlugin] = await Promise.all([
        context.securitySolution,
        context.core,
        context.actions,
      ]);
      const esClient = corePlugin.elasticsearch.client.asInternalUser;
      const spaceId = endpointContext.service.experimentalFeatures
        .endpointManagementSpaceAwarenessEnabled
        ? securitySolutionPlugin.getSpaceId()
        : undefined;
      const soClient = endpointContext.service.savedObjects.createInternalScopedSoClient({
        spaceId,
      });
      const connectorActionsClient = actionsPlugin.getActionsClient();
      const customScriptsClient = getCustomScriptsClient(agentType, {
        esClient,
        soClient,
        connectorActionsClient,
        endpointService: endpointContext.service,
      });
      const data = await customScriptsClient.getCustomScripts();

      return response.ok({ body: data });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
