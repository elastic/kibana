/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { registerInstall } from './install';
import type { EntityStoreDependencies } from '../domain/dependencies';

export const registerRoutes = (
  router: IRouter,
  { resourcesService, logger }: EntityStoreDependencies
) => {
  registerInstall(router, resourcesService, logger);
};
