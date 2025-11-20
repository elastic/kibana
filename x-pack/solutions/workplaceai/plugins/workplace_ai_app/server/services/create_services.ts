/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { LoggerFactory } from '@kbn/core/server';
import type { WorkplaceAIAppPluginStartDependencies } from '../types';
import type { WorkplaceAIAppConfig } from '../config';
import type { InternalServices } from './types';

interface CreateServicesParams {
  core: CoreStart;
  config: WorkplaceAIAppConfig;
  loggerFactory: LoggerFactory;
  pluginsDependencies: WorkplaceAIAppPluginStartDependencies;
}

export function createServices({
  core,
  config,
  loggerFactory,
  pluginsDependencies,
}: CreateServicesParams): InternalServices {
  return {};
}
