/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { brandSpaceId, DEFAULT_SPACE_ID, type SpaceId } from '@kbn/core-spaces-common';
import type { SignificantEventsServer } from '../../types';
import { toMessage } from './to_message';

const SPACE_SO_TYPE = 'space';
/** Only a page size, not a cap: the point-in-time finder pages through every space. */
const SPACES_PAGE_SIZE = 1000;

/**
 * Every space id via the internal client, for sweeps without a user request. This reads the
 * Spaces plugin's own `space` saved object type, so it must stay in sync with that plugin.
 */
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

/**
 * Every space that exists, always including the default space. Pause, flag-off pause,
 * reassert and reset all act on every space, and a partial list would leave the missed
 * spaces running, so an enumeration error is thrown instead of falling back to the default
 * space. Without the spaces plugin only the default space exists.
 */
export const requireAllSpaceIds = async (server: SignificantEventsServer): Promise<SpaceId[]> => {
  if (!server.spaces) {
    return [DEFAULT_SPACE_ID];
  }
  try {
    // The default space is forced in because it always exists but may not be listed yet.
    return [...new Set([DEFAULT_SPACE_ID, ...(await findAllSpaceIdsInternally(server))])];
  } catch (error) {
    throw new Error(`Could not list spaces: ${toMessage(error)}`, { cause: error });
  }
};
