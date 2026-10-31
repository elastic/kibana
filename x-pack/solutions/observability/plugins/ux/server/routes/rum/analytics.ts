/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RumAnalyticsStatus } from '../../../common/rum_sessions';
import { emptyRumAnalyticsStatus } from '../../../common/rum_sessions';
import { createUxServerRoute } from '../create_ux_server_route';
import { readSessionReplaySettings } from '../session_replay/settings';
import {
  ensureRumRollups,
  extractEsErrorMessage,
  getRumAnalyticsStatus,
} from '../../transforms/rum_sessions';

export const getRumAnalyticsStatusRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/analytics_status',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async ({ context }): Promise<RumAnalyticsStatus> => {
    const { elasticsearch } = await context.core;
    try {
      return await getRumAnalyticsStatus(elasticsearch.client.asInternalUser);
    } catch {
      return emptyRumAnalyticsStatus();
    }
  },
});

export const installRumRollupsRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/analytics_status/_install',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async ({ context, core, logger }): Promise<RumAnalyticsStatus> => {
    const { elasticsearch } = await context.core;
    try {
      const coreStart = await core.start();
      const settings = await readSessionReplaySettings(
        coreStart.savedObjects.createInternalRepository()
      );
      return await ensureRumRollups({
        client: elasticsearch.client.asCurrentUser,
        logger,
        syncDelay: settings.syncDelay,
      });
    } catch (error) {
      const message = extractEsErrorMessage(error);
      logger.error(`Failed to install the RUM rollups: ${message}`);
      throw new Error(message);
    }
  },
});
