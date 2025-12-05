/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type {
  PatchUpdateRequestBody,
  PatchUpdateRequestParams,
} from '../../../../common/api/endpoint/scripts_library';
import { PatchUpdateRequestSchema } from '../../../../common/api/endpoint/scripts_library';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { SCRIPTS_LIBRARY_ROUTE_ITEM } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { stringify } from '../../utils/stringify';

export const getPatchUpdateScriptRequestHandler = (
  endpointAppServices: EndpointAppContextService
): RequestHandler<
  PatchUpdateRequestParams,
  undefined,
  PatchUpdateRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppServices.createLogger('patchUpdateScriptRouteHandler');

  return async (context, req, res) => {
    logger.debug(() => `Patch update script: ${stringify(req.params.script_id)}`);

    return res.noContent();
  };
};

export const registerPatchUpdateScriptRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .patch({
      access: 'public',
      path: SCRIPTS_LIBRARY_ROUTE_ITEM,
      security: {
        authz: { requiredPrivileges: ['securitySolution'] },
        authc: { enabled: true },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: PatchUpdateRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteScriptsLibrary'] },
        endpointContext.logFactory.get('patchUpdateScriptRoute'),
        getPatchUpdateScriptRequestHandler(endpointContext.service)
      )
    );
};
