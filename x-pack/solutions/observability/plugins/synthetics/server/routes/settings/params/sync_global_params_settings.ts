/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { disableSyncPrivateLocationTask } from '../../../tasks/sync_private_locations_monitors_task';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { SyntheticsRestApiRouteFactory } from '../../types';

export const syncParamsSettingsParamsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.SYNC_GLOBAL_PARAMS_SETTINGS,
  validate: {
    body: schema.object({
      enable: schema.boolean(),
    }),
  },
  writeAccess: true,
  handler: async ({ server, request }): Promise<any> => {
    const { enable } = request.body as { enable: boolean };
    await disableSyncPrivateLocationTask({ server, disableAutoSync: !enable });
    return { success: true };
  },
});
