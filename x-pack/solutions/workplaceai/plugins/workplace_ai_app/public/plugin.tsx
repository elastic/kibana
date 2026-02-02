/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type {
  WorkplaceAIAppPluginSetup,
  WorkplaceAIAppPluginStart,
  WorkplaceAIAppPluginSetupDependencies,
  WorkplaceAIAppPluginStartDependencies,
  WorkplaceAIClientConfig,
} from './types';
import { registerApp } from './application';
import { type WorkplaceAIServices } from './services';
import { createRerankStepDefinition } from './steps';

export class WorkplaceAIAppPlugin
  implements
    Plugin<
      WorkplaceAIAppPluginSetup,
      WorkplaceAIAppPluginStart,
      WorkplaceAIAppPluginSetupDependencies,
      WorkplaceAIAppPluginStartDependencies
    >
{
  private services?: WorkplaceAIServices;
  private readonly logger: Logger;
  private readonly config: WorkplaceAIClientConfig;

  constructor(context: PluginInitializerContext<WorkplaceAIClientConfig>) {
    this.config = context.config.get();
    this.services = { config: this.config };
    this.logger = context.logger.get('workplaceai.app.public');
  }

  public setup(
    core: CoreSetup<WorkplaceAIAppPluginStartDependencies, WorkplaceAIAppPluginStart>,
    pluginsSetup: WorkplaceAIAppPluginSetupDependencies
  ): WorkplaceAIAppPluginSetup {
    pluginsSetup.workflowsExtensions.registerStepDefinition(createRerankStepDefinition(core));

    registerApp({
      core,
      getServices: () => {
        if (!this.services) {
          throw new Error('getServices called before plugin start');
        }
        return this.services;
      },
    });

    return {};
  }

  public start(
    { http }: CoreStart,
    pluginsStart: WorkplaceAIAppPluginStartDependencies
  ): WorkplaceAIAppPluginStart {
    this.logger.info('WorkplaceAIAppPlugin started.');
    return {};
  }

  public stop() {}
}
