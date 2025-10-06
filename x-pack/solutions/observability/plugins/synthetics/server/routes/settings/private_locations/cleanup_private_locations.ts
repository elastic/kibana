/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { resetSyncPrivateCleanUpState } from '../../../tasks/sync_private_locations_monitors_task';

export const cleanupPrivateLocationRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_CLEANUP,
  validate: {},
  requiredPrivileges: [PRIVATE_LOCATION_WRITE_API],
  handler: async (routeContext) => {
    const { server } = routeContext;

    await resetSyncPrivateCleanUpState({ server });

    return {
      success: true,
      message: 'Task to start clean up has been started, it may take a while.',
    };
  },
});
