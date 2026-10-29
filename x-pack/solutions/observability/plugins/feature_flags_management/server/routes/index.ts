/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { GetServices } from '../types';
import { registerAppsRoutes } from './apps_routes';
import { registerEnvironmentsRoutes } from './environments_routes';
import { registerFlagsRoutes } from './flags_routes';
import { registerObservedContextsRoutes } from './observed_contexts_routes';

export const registerRoutes = (router: IRouter, getServices: GetServices): void => {
  registerEnvironmentsRoutes(router, getServices);
  registerAppsRoutes(router, getServices);
  registerFlagsRoutes(router, getServices);
  registerObservedContextsRoutes(router, getServices);
};
