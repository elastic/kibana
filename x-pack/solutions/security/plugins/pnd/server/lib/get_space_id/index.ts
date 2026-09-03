/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export const DEFAULT_SPACE_ID = 'default';

/**
 * Resolve the space id from the request (security finding S9). The space is
 * always taken from the request, never from a route parameter, so a caller
 * cannot read or write another space's settings by spoofing an id.
 *
 * Falls back to the default space when the Spaces plugin is unavailable.
 */
export const getSpaceId = (spaces: SpacesPluginStart | undefined, request: KibanaRequest): string =>
  spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
