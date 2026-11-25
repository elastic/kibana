/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, KibanaRequest, Logger } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { DEFAULT_SPACE_ID, type SpaceId } from '@kbn/core-spaces-common';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import pLimit from 'p-limit';
import type { TokenTrackingCoverage } from '../../../common/cost';
import type { SignificantEventsServer } from '../../types';

const TRACKING_SETTINGS_READ_CONCURRENCY = 10;

const createCoverage = (
  enabledSpaceCount: number,
  totalSpaceCount: number
): TokenTrackingCoverage => ({
  enabledSpaceCount,
  totalSpaceCount,
  status:
    enabledSpaceCount === 0 ? 'none' : enabledSpaceCount === totalSpaceCount ? 'full' : 'partial',
});

const requestForSpace = (request: KibanaRequest, spaceId: SpaceId): KibanaRequest => {
  const fakeRawRequest: FakeRawRequest = {
    headers: request.headers,
    path: '/',
    spaceId,
  };
  return kibanaRequestFactory(fakeRawRequest);
};

const readTrackingEnabled = async ({
  request,
  server,
  spaceId,
}: {
  request: KibanaRequest;
  server: SignificantEventsServer;
  spaceId: SpaceId;
}): Promise<boolean> => {
  const spaceRequest = requestForSpace(request, spaceId);
  const soClient = server.core.savedObjects.getScopedClient(spaceRequest);
  const uiSettingsClient = server.core.uiSettings.asScopedToClient(soClient);
  return Boolean(await uiSettingsClient.get<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING));
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
    const spacesClient = server.spaces?.spacesService.createSpacesClient(request);
    if (!spacesClient) {
      const enabled = await readTrackingEnabled({
        request,
        server,
        spaceId: DEFAULT_SPACE_ID,
      });
      return createCoverage(enabled ? 1 : 0, 1);
    }

    const spaces = await spacesClient.getAll();
    const spaceIds = [...new Set<SpaceId>([DEFAULT_SPACE_ID, ...spaces.map((space) => space.id)])];
    const limit = pLimit(TRACKING_SETTINGS_READ_CONCURRENCY);
    const enabledBySpace = await Promise.all(
      spaceIds.map((spaceId) => limit(() => readTrackingEnabled({ request, server, spaceId })))
    );
    const enabledSpaceCount = enabledBySpace.filter(Boolean).length;
    return createCoverage(enabledSpaceCount, spaceIds.length);
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
