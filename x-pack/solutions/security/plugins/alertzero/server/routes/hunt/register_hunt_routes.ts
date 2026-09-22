/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../register_routes';
import { registerHuntReadinessRoute } from './readiness';
import { registerHuntForThreatRoute } from './hunt_for_threat';
import { registerHuntBehaviorRoute } from './hunt_behavior';
import { registerCandidatesRoute } from './candidates';
import { registerHuntCoordinatorRoute } from './hunt_coordinator';
import { registerCorrelateRoute } from './correlate';

/** Registers the hunt routes (readiness, Tier 1, Tier 2, coordinator, candidates, correlate). */
export const registerHuntRoutes = (deps: RouteDependencies): void => {
  registerHuntReadinessRoute(deps);
  registerHuntForThreatRoute(deps);
  registerHuntBehaviorRoute(deps);
  registerCandidatesRoute(deps);
  registerHuntCoordinatorRoute(deps);
  registerCorrelateRoute(deps);
};
