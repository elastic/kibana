/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

import type {
  WorkplaceAIServerlessPluginSetup,
  WorkplaceAIServerlessPluginStart,
  WorkplaceAIServerlessPluginSetupDeps,
  WorkplaceAIServerlessPluginStartDeps,
} from './types';
import { createNavigationTree } from './navigation_tree';

export class WorkplaceAIServerlessPlugin
  implements
    Plugin<
      WorkplaceAIServerlessPluginSetup,
      WorkplaceAIServerlessPluginStart,
      WorkplaceAIServerlessPluginSetupDeps,
      WorkplaceAIServerlessPluginStartDeps
    >
{
  constructor() {}

  public setup(
    core: CoreSetup,
    setupDeps: WorkplaceAIServerlessPluginSetupDeps
  ): WorkplaceAIServerlessPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    { serverless }: WorkplaceAIServerlessPluginStartDeps
  ): WorkplaceAIServerlessPluginStart {
    const navigationTree$ = of(createNavigationTree());

    serverless.initNavigation('workplaceai', navigationTree$);

    return {};
  }

  public stop() {}
}
