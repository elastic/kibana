/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import type {
  SequentWorkflowsSetup,
  SequentWorkflowsStart,
  SequentWorkflowsSetupDeps,
  SequentWorkflowsStartDeps,
} from './types';
import { defineRoutes } from './routes';

const FEATURE_CONFIG: KibanaFeatureConfig = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  category: { id: 'security', label: 'Security' },
  app: [PLUGIN_ID],
  privileges: {
    all: {
      app: [PLUGIN_ID],
      savedObject: { all: [], read: [] },
      ui: ['show'],
    },
    read: {
      app: [PLUGIN_ID],
      savedObject: { all: [], read: [] },
      ui: ['show'],
    },
  },
};

export class SequentWorkflowsPlugin
  implements
    Plugin<
      SequentWorkflowsSetup,
      SequentWorkflowsStart,
      SequentWorkflowsSetupDeps,
      SequentWorkflowsStartDeps
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: SequentWorkflowsSetupDeps): SequentWorkflowsSetup {
    this.logger.debug('Sequent Workflows: setup');

    plugins.features.registerKibanaFeature(FEATURE_CONFIG);

    const router = core.http.createRouter();
    defineRoutes(router, core, this.logger);

    return {};
  }

  public start(_core: CoreStart): SequentWorkflowsStart {
    this.logger.debug('Sequent Workflows: start');
    return {};
  }

  public stop() {
    this.logger.debug('Sequent Workflows: stop');
  }
}
