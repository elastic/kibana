/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { SecuritySolutionEssPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin(_initializerContext: PluginInitializerContext) {
  return new SecuritySolutionEssPlugin();
}

export type { SecuritySolutionEssPluginSetup, SecuritySolutionEssPluginStart } from './types';
