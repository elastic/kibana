/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { isServerless } from '@kbn/profiling-data-access-plugin/server';
import type { ProfilingStatus } from '@kbn/profiling-utils';
import type { RouteRegisterParameters } from '..';
import { getRoutePaths } from '../../../common';
import { handleRouteHandlerError } from '../../utils/handle_route_error_handler';
import { getHasSetupPrivileges } from '../universal_profiling/setup/lib/get_has_setup_privileges';

export function registerStatusRoute({ router, logger, dependencies }: RouteRegisterParameters) {
  const { buildFlavor, setup, start } = dependencies;

  /*
  Whether the user can run the Universal Profiling setup is computed here rather than in the
  `profilingDataAccess` status service: the check needs the security plugin and the incoming
  `KibanaRequest`, and it describes the setup action this plugin owns. Keeping it here avoids
  loading the security dependency into the data access plugin, which other plugins consume.
  */
  const getCanSetupUniversalProfiling = async (request: KibanaRequest): Promise<boolean> => {
    if (isServerless(buildFlavor)) {
      return false;
    }

    return start.security
      ? getHasSetupPrivileges({ securityPluginStart: start.security, request })
      : true;
  };

  router.get(
    {
      path: getRoutePaths().Status,
      security: {
        authz: {
          requiredPrivileges: ['profiling'],
        },
      },
      validate: false,
    },
    async (context, request, response) => {
      try {
        const core = await context.core;

        const [status, canSetup] = await Promise.all([
          start.profilingDataAccess.services.getStatus({
            esClient: core.elasticsearch.client,
            soClient: core.savedObjects.client,
            spaceId: setup.spaces?.spacesService?.getSpaceId(request),
            abortSignal: getRequestAbortedSignal(request.events.aborted$),
          }),
          getCanSetupUniversalProfiling(request),
        ]);

        const body: ProfilingStatus = {
          ...status,
          universalProfiling: { ...status.universalProfiling, canSetup },
        };

        return response.ok({ body });
      } catch (error) {
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while checking the profiling status',
        });
      }
    }
  );
}
