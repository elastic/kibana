/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { engineRoutes } from './engine_routes';
import { eventsRoutes } from './events_routes';

export const detectionEngineRouteRepository = {
  ...engineRoutes,
  ...eventsRoutes,
};

/** Every route of the engine, typed; the browser client is built from it. */
export type DetectionEngineRouteRepository = typeof detectionEngineRouteRepository;
