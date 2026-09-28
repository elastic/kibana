/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../register_routes';
import { registerHuntIndexScopeRoute } from './index_scope';
import { registerHuntForThreatRoute } from './hunt_for_threat';
import { registerHuntBehaviorRoute } from './hunt_behavior';
import { registerCandidatesRoute } from './candidates';
import { registerHuntCoordinatorRoute } from './hunt_coordinator';

/** Registers the hunt routes (index_scope, Tier 1, Tier 2, coordinator, candidates). */
export const registerHuntRoutes = (deps: RouteDependencies): void => {
  registerHuntIndexScopeRoute(deps);
  registerHuntForThreatRoute(deps);
  registerHuntBehaviorRoute(deps);
  registerCandidatesRoute(deps);
  registerHuntCoordinatorRoute(deps);
};
