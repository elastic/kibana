/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { ResourcesService } from './domain/resources_service';
import type { EntityStoreDependencies } from './domain/dependencies';

export const initDependencies = (ctx: PluginInitializerContext): EntityStoreDependencies => {
  const logger = ctx.logger.get('v2');
  const resourcesService = new ResourcesService(logger);

  return {
    resourcesService,
    logger,
  };
};
