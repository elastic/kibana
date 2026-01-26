/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { DeleteScriptRequestParams } from '../../../../common/api/endpoint/scripts_library';
import { DeleteScriptRequestSchema } from '../../../../common/api/endpoint/scripts_library';
import { errorHandler } from '../error_handler';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import type { EndpointAppContext } from '../../types';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { SCRIPTS_LIBRARY_ROUTE_ITEM } from '../../../../common/endpoint/constants';

export const deleteScriptRequestHandler = (
  endpointAppServices: EndpointAppContextService
): RequestHandler<
  DeleteScriptRequestParams,
  undefined,
  undefined,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppServices.createLogger('deleteScriptRouteHandler');

  return async (context, req, res) => {
    const scriptId = req.params.script_id;
    logger.debug(() => `Delete script id: ${scriptId}`);

    try {
      const spaceId = (await context.securitySolution).getSpaceId();
      const user = (await context.core).security.authc.getCurrentUser();
      const scriptsClient = endpointAppServices.getScriptsLibraryClient(
        spaceId,
        user?.username || 'unknown'
      );

      await scriptsClient.delete(scriptId);

      return res.ok();
    } catch (err) {
      return errorHandler(logger, res, err);
    }
  };
};

export const registerDeleteScriptRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .delete({
      access: 'public',
      path: SCRIPTS_LIBRARY_ROUTE_ITEM,
      security: {
        authz: { requiredPrivileges: ['securitySolution'] },
        authc: { enabled: true },
      },
      options: {
        availability: {
          since: '9.4.0',
          stability: 'stable',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: DeleteScriptRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteScriptsLibrary'] },
        endpointContext.logFactory.get('deleteScriptRoute'),
        deleteScriptRequestHandler(endpointContext.service)
      )
    );
};
