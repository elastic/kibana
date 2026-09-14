/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { queryBoolean } from '../../zod_query';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { resetSyncPrivateCleanUpState } from '../../../tasks/sync_private_locations_monitors_task';

export const cleanupPrivateLocationRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_CLEANUP,
  validate: {
    query: z.object({
      hasAlreadyDoneCleanup: queryBoolean.optional(),
    }),
  },
  requiredPrivileges: [PRIVATE_LOCATION_WRITE_API],
  handler: async (routeContext) => {
    const { server, request, response } = routeContext;
    const { hasAlreadyDoneCleanup } = request.query;

    try {
      await resetSyncPrivateCleanUpState({ server, hasAlreadyDoneCleanup });
    } catch (error) {
      // Reporting success here would claim cleanup was scheduled when it was not,
      // leaving the caller to wait on work that only happens whenever the periodic
      // sync next runs.
      return response.customError({
        statusCode: 500,
        body: {
          message: `Failed to schedule private location cleanup: ${error.message}`,
        },
      });
    }

    return {
      success: true,
      message: 'Task to start clean up has been started, it may take a while.',
    };
  },
});
