/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { SCRIPTS_LIBRARY_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import type { EndpointAppContext } from '../../types';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { CreateScriptRequestBody } from '../../../../common/api/endpoint/scripts_library';
import { CreateScriptRequestSchema } from '../../../../common/api/endpoint/scripts_library';

export const getCreateScriptRequestHandler = (
  endpointAppServices: EndpointAppContextService
): RequestHandler<
  unknown,
  unknown,
  CreateScriptRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppServices.createLogger('createScriptRouteHandler');

  return async (context, req, res) => {
    logger.debug(`creating new script [${req.body.name}]`);

    return res.noContent();
  };
};

export const registerCreateScriptRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .post({
      access: 'public',
      path: SCRIPTS_LIBRARY_ROUTE,
      security: {
        authz: { requiredPrivileges: ['securitySolution'] },
        authc: { enabled: true },
      },
      options: {
        body: {
          accepts: ['multipart/form-data'],
          output: 'stream',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: CreateScriptRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteScriptsLibrary'] },
        endpointContext.logFactory.get('createScriptRoute'),
        getCreateScriptRequestHandler(endpointContext.service)
      )
    );
};
