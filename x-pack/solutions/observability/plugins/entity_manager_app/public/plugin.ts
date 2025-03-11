/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import {
  App,
  AppMountParameters,
  AppStatus,
  AppUpdater,
  CoreSetup,
  DEFAULT_APP_CATEGORIES,
  PluginInitializerContext,
} from '@kbn/core/public';
import { Logger } from '@kbn/logging';
import { EntityClient } from '@kbn/entityManager-plugin/public';

import {
  EntityManagerAppPluginClass,
  EntityManagerPluginStart,
  EntityManagerPluginSetup,
} from './types';

export class Plugin implements EntityManagerAppPluginClass {
  public logger: Logger;
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(private readonly context: PluginInitializerContext<{}>) {
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup<EntityManagerPluginStart, {}>, pluginSetup: EntityManagerPluginSetup) {
    const kibanaVersion = this.context.env.packageInfo.version;

    const mount = async (params: AppMountParameters<unknown>) => {
      const { renderApp } = await import('./application');
      const [coreStart, pluginsStart] = await core.getStartServices();

      return renderApp({
        appMountParameters: params,
        core: coreStart,
        isDev: this.context.env.mode.dev,
        kibanaVersion,
        usageCollection: pluginSetup.usageCollection,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: pluginsStart,
        isServerless: !!pluginsStart.serverless,
        entityClient: new EntityClient(core),
      });
    };

    const appUpdater$ = this.appUpdater$;
    const app: App = {
      id: 'entity_manager',
      title: 'Entity Manager',
      order: 8002,
      updater$: appUpdater$,
      euiIconType: 'logoObservability',
      appRoute: '/app/entity_manager',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount,
      visibleIn: [],
      keywords: ['observability', 'monitor', 'entities'],
      status: AppStatus.inaccessible,
    };

    core.application.register(app);

    return {};
  }

  start() {
    return {};
  }

  stop() {}
}
