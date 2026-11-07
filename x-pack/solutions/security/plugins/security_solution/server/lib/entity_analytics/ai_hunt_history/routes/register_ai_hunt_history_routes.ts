/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { createHuntRoute } from './create_hunt';
import { listHuntsRoute } from './list_hunts';
import { getHuntRoute } from './get_hunt';
import { patchHuntRoute } from './patch_hunt';
import { deleteHuntRoute } from './delete_hunt';

export const registerAiHuntHistoryRoutes = ({ router, logger }: EntityAnalyticsRoutesDeps) => {
  createHuntRoute(router, logger);
  listHuntsRoute(router, logger);
  getHuntRoute(router, logger);
  patchHuntRoute(router, logger);
  deleteHuntRoute(router, logger);
};
