/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID, type SpaceId } from '@kbn/core-spaces-common';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import type { TokenTrackingCoverage } from '../../../common/cost';
import type { SignificantEventsServer } from '../../types';

// The token usage tracking setting is global, so coverage is either every space or none.
const createCoverage = (enabled: boolean, totalSpaceCount: number): TokenTrackingCoverage => ({
  enabledSpaceCount: enabled ? totalSpaceCount : 0,
  totalSpaceCount,
  status: enabled ? 'full' : 'none',
});

const readTrackingEnabled = async ({
  request,
  server,
}: {
  request: KibanaRequest;
  server: SignificantEventsServer;
}): Promise<boolean> => {
  const soClient = server.core.savedObjects.getScopedClient(request);
  const globalUiSettingsClient = server.core.uiSettings.globalAsScopedToClient(soClient);
  return Boolean(await globalUiSettingsClient.get<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING));
};

export const resolveTokenTrackingCoverage = async ({
  request,
  server,
  logger,
}: {
  request: KibanaRequest;
  server: SignificantEventsServer;
  logger: Logger;
}): Promise<TokenTrackingCoverage> => {
  try {
    const enabled = await readTrackingEnabled({ request, server });
    const spacesClient = server.spaces?.spacesService.createSpacesClient(request);
    if (!spacesClient) {
      return createCoverage(enabled, 1);
    }

    const spaces = await spacesClient.getAll();
    const spaceIds = new Set<SpaceId>([DEFAULT_SPACE_ID, ...spaces.map((space) => space.id)]);
    return createCoverage(enabled, spaceIds.size);
  } catch (error) {
    logger.warn(
      `Unable to determine token tracking coverage: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return {
      status: 'unavailable',
      enabledSpaceCount: null,
      totalSpaceCount: null,
    };
  }
};
