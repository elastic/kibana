/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';
import type { SyntheticsRestApiRouteFactory } from '../../types';

export const syncParamsSyntheticsParamsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.SYNC_GLOBAL_PARAMS,
  validate: {},
  options: {
    // 5 minutes
    timeout: {
      payload: 1000 * 60 * 5,
    },
  },
  writeAccess: true,
  handler: async ({ syntheticsMonitorClient, server, spaceId }): Promise<any> => {
    const soClient = server.coreStart.savedObjects.createInternalRepository();

    const allPrivateLocations = await getPrivateLocations(soClient);

    if (allPrivateLocations.length > 0) {
      await asyncGlobalParamsPropagation({
        server,
        paramsSpacesToSync: [spaceId],
      });
    }

    return { success: true };
  },
});
