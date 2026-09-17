/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../register_routes';

/**
 * Registers the threat-intel hunt routes (run hunt, get hunt status, list
 * hunt reports). Empty for now: individual routes land in Phases 2-7 as the
 * hunt pipeline is lifted from the mustard prototype.
 */
export const registerThreatIntelRoutes = (_deps: RouteDependencies): void => {
  // Phase 2+ routes register here.
};
