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
import { runCleanUpTaskNow } from '../../../tasks/clean_up_package_policies_task';

export const cleanupPrivateLocationRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_CLEANUP,
  validate: {
    query: z.strictObject({
      // Kept for API compatibility; the clean up no longer keeps a latch to reset.
      hasAlreadyDoneCleanup: queryBoolean.optional(),
    }),
  },
  requiredPrivileges: [PRIVATE_LOCATION_WRITE_API],
  handler: async (routeContext) => {
    const { server, response } = routeContext;

    try {
      await runCleanUpTaskNow(server);
    } catch (error) {
      // Reporting success here would claim cleanup was scheduled when it was not,
      // leaving the caller to wait on work that only happens whenever the periodic
      // task next runs.
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
