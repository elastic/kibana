/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../register_routes';
import { registerHuntReadinessRoute } from './readiness';

/**
 * Registers the threat-intel hunt routes (readiness, run hunt, get hunt
 * status, list hunt reports). Remaining routes land in Phases 3-7 as the
 * hunt pipeline is lifted from the mustard prototype.
 */
export const registerThreatIntelRoutes = (deps: RouteDependencies): void => {
  registerHuntReadinessRoute(deps);
};
