/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { brandSpaceId, DEFAULT_SPACE_ID, type SpaceId } from '@kbn/core-spaces-common';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import type { SignificantEventsServer } from '../../types';
import type { MaintenanceAccess } from './maintenance_access';
import { toMessage } from './to_message';

const SPACE_SO_TYPE = 'space';
/** Matches the default `xpack.spaces.maxSpaces`, so a typical deployment is one page. */
const SPACES_PAGE_SIZE = 1000;

/** Every space id via the internal client, for sweeps without a user request. */
const findAllSpaceIdsInternally = async (server: SignificantEventsServer): Promise<SpaceId[]> => {
  const finder = server.core.savedObjects
    .createInternalRepository([SPACE_SO_TYPE])
    .createPointInTimeFinder({ type: SPACE_SO_TYPE, perPage: SPACES_PAGE_SIZE, fields: [] });
  try {
    const ids: SpaceId[] = [];
    for await (const { saved_objects: spaces } of finder.find()) {
      ids.push(...spaces.map((space) => brandSpaceId(space.id)));
    }
    return ids;
  } finally {
    await finder.close();
  }
};

const listSpaceIds = async ({
  server,
  spaces,
  request,
  access,
}: {
  server: SignificantEventsServer;
  spaces: NonNullable<SignificantEventsServer['spaces']>;
  request: KibanaRequest;
  access: MaintenanceAccess;
}): Promise<SpaceId[]> => {
  switch (access) {
    case 'user': {
      // SpacesClient.getAll already loads every space SO (up to xpack.spaces.maxSpaces).
      // Space.id is already branded as SpaceId.
      const userSpaces = await spaces.spacesService.createSpacesClient(request).getAll();
      return userSpaces.map((space) => space.id);
    }
    case 'system':
      return findAllSpaceIdsInternally(server);
    default: {
      const unhandledAccess: never = access;
      throw new Error(`Unhandled maintenance access: ${unhandledAccess}`);
    }
  }
};

/**
 * Every space that exists, always including the default space, for callers that must not
 * act on a partial list. Without the spaces plugin only the default space exists. An
 * enumeration error is thrown rather than recorded.
 */
export const requireAllSpaceIds = async (server: SignificantEventsServer): Promise<SpaceId[]> => {
  if (!server.spaces) {
    return [DEFAULT_SPACE_ID];
  }
  return [...new Set([DEFAULT_SPACE_ID, ...(await findAllSpaceIdsInternally(server))])];
};

/**
 * Every space a maintenance sweep should cover, always including the default
 * space. Enumeration problems are recorded as failures rather than thrown.
 */
export const getAllSpaceIds = async ({
  server,
  request,
  access,
  failures,
}: {
  server: SignificantEventsServer;
  request: KibanaRequest;
  access: MaintenanceAccess;
  failures: SignificantEventsMaintenanceFailure[];
}): Promise<SpaceId[]> => {
  if (!server.spaces) {
    failures.push({
      target: 'spaces',
      error:
        'Spaces client is not available; only the default space was processed for per-space workflows',
    });
    return [DEFAULT_SPACE_ID];
  }
  try {
    const ids = await listSpaceIds({ server, spaces: server.spaces, request, access });
    return [...new Set([DEFAULT_SPACE_ID, ...ids])];
  } catch (error) {
    // Surface (not just log) the under-scoping so a sweep doesn't silently skip
    // per-space workflows in every space but the default.
    failures.push({
      target: 'spaces',
      error: `Failed to enumerate spaces; only the default space was processed: ${toMessage(
        error
      )}`,
    });
    return [DEFAULT_SPACE_ID];
  }
};
