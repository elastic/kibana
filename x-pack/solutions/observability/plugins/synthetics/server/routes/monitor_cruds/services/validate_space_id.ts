/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { RouteContext } from '../../types';

export const validateSpaceId = async (routeContext: RouteContext) => {
  const { server, request, spaceId } = routeContext;
  // If the spaceId is the default space, return it, it always exists
  if (spaceId === DEFAULT_SPACE_ID) {
    return spaceId;
  }
  const { id } = (await server.spaces?.spacesService.getActiveSpace(request)) ?? {
    id: DEFAULT_SPACE_ID,
  };
  return id;
};
