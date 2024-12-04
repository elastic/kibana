/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { ActionDetailsRequestSchema } from '../../../../common/api/endpoint';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { ACTION_DETAILS_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { getActionDetailsById } from '../../services';
import { errorHandler } from '../error_handler';

/**
 * Registers the route for handling retrieval of Action Details
 * @param router
 * @param endpointContext
 */
export const registerActionDetailsRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  // Details for a given action id
  router.versioned
    .get({
      access: 'public',
      path: ACTION_DETAILS_ROUTE,
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
          request: ActionDetailsRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadSecuritySolution'] },
        endpointContext.logFactory.get('hostIsolationDetails'),
        getActionDetailsRequestHandler(endpointContext)
      )
    );
};

export const getActionDetailsRequestHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  TypeOf<typeof ActionDetailsRequestSchema.params>,
  never,
  never,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, req, res) => {
    try {
      return res.ok({
        body: {
          data: await getActionDetailsById(
            (
              await context.core
            ).elasticsearch.client.asInternalUser,
            endpointContext.service.getEndpointMetadataService(),
            req.params.action_id
          ),
        },
      });
    } catch (error) {
      return errorHandler(endpointContext.logFactory.get('EndpointActionDetails'), res, error);
    }
  };
};
