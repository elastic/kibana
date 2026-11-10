/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { Plugin } = await import('./plugin');
  return new Plugin(initializerContext);
};

export { config } from './config';

export type { DigitalExperienceServerRouteRepository } from './routes/get_global_digital_experience_route_repository';
