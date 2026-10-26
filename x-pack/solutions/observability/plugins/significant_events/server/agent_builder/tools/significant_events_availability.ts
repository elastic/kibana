/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ToolAvailabilityConfig, ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { SignificantEventsServer } from '../../types';
import { assertSignificantEventsAccess } from '../../routes/utils/assert_significant_events_access';
import { assertCanManageSignificantEvents } from '../../routes/utils/assert_can_manage_significant_events';

/**
 * Hides a tool while significant events are not accessible. With `requireManagePrivilege`, it is
 * also hidden from users without the Nightshift manage privilege, so they are never asked to
 * confirm a change that would fail.
 */
export const createSignificantEventsAvailability = ({
  server,
  logger,
  requireManagePrivilege = false,
}: {
  server: SignificantEventsServer;
  logger: Logger;
  requireManagePrivilege?: boolean;
}): ToolAvailabilityConfig => ({
  // The privilege check depends on the user, so its result cannot be cached per space.
  cacheMode: requireManagePrivilege ? 'none' : 'space',
  handler: async ({ request }): Promise<ToolAvailabilityResult> => {
    try {
      await assertSignificantEventsAccess({
        server,
        licensing: server.licensing,
      });
      if (requireManagePrivilege) {
        await assertCanManageSignificantEvents({ request, server });
      }
      return { status: 'available' };
    } catch (error) {
      if (error instanceof Error) {
        logger.debug(error.stack ?? error.message);
      } else {
        logger.debug(String(error));
      }
      return {
        status: 'unavailable',
        reason:
          error instanceof Error
            ? error.message
            : 'Significant events access is not available in the current context',
      };
    }
  },
});
