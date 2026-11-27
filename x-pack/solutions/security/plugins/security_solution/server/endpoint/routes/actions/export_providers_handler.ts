/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { errorHandler } from '../error_handler';
import { EXPORT_PROVIDERS_ROUTE } from '../../../../common/endpoint/constants';
import type { ExportProvidersRequestQueryParams } from '../../../../common/api/endpoint/export_providers/get_export_providers_route';
import { ExportProvidersRequestSchema } from '../../../../common/api/endpoint/export_providers/get_export_providers_route';
import type { ExportProvidersApiResponse } from '../../../../common/endpoint/types';
import { getExportProvidersForAgent } from '../../services/actions/export_providers/get_export_providers_for_agent';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';

/**
 * Registers the export providers route
 * @param router - Security solution plugin router
 * @param endpointContext - Endpoint app context
 */
export const registerExportProvidersRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: EXPORT_PROVIDERS_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: ExportProvidersRequestSchema,
        },
      },
      withEndpointAuthz(
        { any: ['canWriteFileOperations', 'canWriteExecuteOperations'] },
        endpointContext.logFactory.get('exportProvidersRoute'),
        getExportProvidersRouteHandler(endpointContext)
      )
    );
};

/**
 * Creates a handler for the export providers route
 * @param endpointContext - Endpoint app context
 * @returns Request handler for export providers
 */
export const getExportProvidersRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  never,
  ExportProvidersRequestQueryParams,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('exportProvidersRouteHandler');

  return async (context, request, response) => {
    const { agentId } = request.query;

    try {
      const spaceId = (await context.securitySolution).getSpaceId();
      const providers = await getExportProvidersForAgent({
        endpointService: endpointContext.service,
        spaceId,
        agentId,
      });

      const body: ExportProvidersApiResponse = {
        data: providers.map(({ id, type, account_name, container }) => ({
          id,
          type,
          account_name,
          container,
        })),
      };

      return response.ok({ body });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
