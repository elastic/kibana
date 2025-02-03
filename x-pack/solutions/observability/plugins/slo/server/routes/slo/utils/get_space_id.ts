/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { SLORoutesDependencies } from '../../types';

export const getSpaceId = async (
  plugins: SLORoutesDependencies['plugins'],
  request: KibanaRequest
) => {
  const spaces = await plugins.spaces.start();
  return (await spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';
};
