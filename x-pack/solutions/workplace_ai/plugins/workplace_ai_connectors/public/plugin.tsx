/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters } from '@kbn/core/public';
import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type {
  WorkplaceAIConnectorsPluginSetup,
  WorkplaceAIConnectorsPluginSetupDependencies,
  WorkplaceAIConnectorsPluginStart,
  WorkplaceAIConnectorsPluginStartDependencies,
} from './types';
import { WORKPLACE_AI_CONNECTORS_ROUTE } from '../common';

export class WorkplaceAIConnectorsPlugin
  implements
    Plugin<
      WorkplaceAIConnectorsPluginSetup,
      WorkplaceAIConnectorsPluginStart,
      WorkplaceAIConnectorsPluginSetupDependencies,
      WorkplaceAIConnectorsPluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}
  setup(
    core: CoreSetup<WorkplaceAIConnectorsPluginStartDependencies, WorkplaceAIConnectorsPluginStart>
  ): WorkplaceAIConnectorsPluginSetup {
    core.application.register({
      id: 'workplace_ai_connectors',
      title: 'Connectors',
      category: DEFAULT_APP_CATEGORIES.workplaceAI,
      appRoute: WORKPLACE_AI_CONNECTORS_ROUTE,
      visibleIn: ['sideNav', 'globalSearch'],
      mount: async (params: AppMountParameters) => {
        const { renderApp } = await import('./application');
        const [coreStart, pluginsStart, services] = await core.getStartServices();
        return renderApp({ core: coreStart, plugins: pluginsStart, services, params });
      },
    });

    return {};
  }
  start(core: CoreStart): WorkplaceAIConnectorsPluginStart {
    return {};
  }
}
