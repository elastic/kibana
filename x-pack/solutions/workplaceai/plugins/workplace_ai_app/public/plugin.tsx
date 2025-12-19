/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import type {
  WorkplaceAIAppPluginSetup,
  WorkplaceAIAppPluginStart,
  WorkplaceAIAppPluginSetupDependencies,
  WorkplaceAIAppPluginStartDependencies,
} from './types';
import { registerApp } from './application';
import { type WorkplaceAIServices } from './services';
import { WORKPLACE_AI_APP_ID } from '../common/features';

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

  constructor(context: PluginInitializerContext) {
    this.services = {};
    this.logger = context.logger.get('workplaceai.app.public');
  }

  public setup(
    core: CoreSetup<WorkplaceAIAppPluginStartDependencies, WorkplaceAIAppPluginStart>,
    { dataSourcesRegistry, home }: WorkplaceAIAppPluginSetupDependencies
  ): WorkplaceAIAppPluginSetup {
    registerApp({
      core,
      getServices: () => {
        if (!this.services) {
          throw new Error('getServices called before plugin start');
        }
        return this.services;
      },
    });

    // Register Workplace AI solution on home page
    if (home) {
      home.featureCatalogue.registerSolution({
        id: 'workplaceAI', // Must match the category ID from DEFAULT_APP_CATEGORIES.workplaceAI
        title: i18n.translate('xpack.workplaceai.solution.title', {
          defaultMessage: 'Workplace AI',
        }),
        description: i18n.translate('xpack.workplaceai.solution.description', {
          defaultMessage:
            'Build intelligent workplace experiences with AI-powered search, chat, and automation.',
        }),
        icon: 'logoElasticsearch',
        path: `/app/${WORKPLACE_AI_APP_ID}`,
        order: 400,
      });
    }

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
