/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TrialCompanionRoutesDeps } from './types';
import { registerGetNBARoute, registerPostNBADismissRoute } from './routes/nba_routes';

export const registerTrialCompanionRoutes = (deps: TrialCompanionRoutesDeps) => {
  if (deps.enabled) {
    registerGetNBARoute(deps);
    registerPostNBADismissRoute(deps);
  }
};
