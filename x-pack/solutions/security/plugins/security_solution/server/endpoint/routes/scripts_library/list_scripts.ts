/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { ListScriptsRequestSchema } from '../../../../common/api/endpoint/scripts_library/list_scripts';
import { stringify } from '../../utils/stringify';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import type { EndpointAppContext } from '../../types';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { SCRIPTS_LIBRARY_ROUTE } from '../../../../common/endpoint/constants';

export const getListScriptsRequestHandler = (
  endpointAppServices: EndpointAppContextService
): RequestHandler<unknown, unknown, unknown, SecuritySolutionRequestHandlerContext> => {
  const logger = endpointAppServices.createLogger('listScriptsRouteHandler');

  return async (context, req, res) => {
    logger.debug(() => `Get list of script: ${stringify(req.query)}`);

    return res.noContent();
  };
};

export const registerListScriptsRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .get({
      access: 'public',
      path: SCRIPTS_LIBRARY_ROUTE,
      security: {
        authz: { requiredPrivileges: ['securitySolution'] },
        authc: { enabled: true },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: ListScriptsRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadScriptsLibrary'] },
        endpointContext.logFactory.get('listScriptsRoute'),
        getListScriptsRequestHandler(endpointContext.service)
      )
    );
};
