/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  App,
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';

import { lazy } from 'react';
import { BehaviorSubject } from 'rxjs';
import type {
  MultiplayerPublicPluginsSetup,
  MultiplayerPublicPluginsStart,
  MultiplayerPublicSetup,
  MultiplayerPublicStart,
} from './types';
import { getLazyWithContextProviders } from './utils/get_lazy_with_context_providers';

export class MultiplayerPlugin
  implements
    Plugin<
      MultiplayerPublicSetup,
      MultiplayerPublicStart,
      MultiplayerPublicPluginsSetup,
      MultiplayerPublicPluginsStart
    >
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(private readonly initContext: PluginInitializerContext<{}>) {}

  public setup(
    core: CoreSetup<MultiplayerPublicPluginsStart, MultiplayerPublicStart>,
    plugins: MultiplayerPublicPluginsSetup
  ) {
    const kibanaVersion = this.initContext.env.packageInfo.version;

    const mount = async (params: AppMountParameters<unknown>) => {
      const { renderApp } = await import('./application');
      const [coreStart, pluginsStart] = await core.getStartServices();

      return renderApp({
        appMountParameters: params,
        core: coreStart,
        isDev: this.initContext.env.mode.dev,
        kibanaVersion,
        usageCollection: plugins.usageCollection,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: pluginsStart,
        isServerless: !!pluginsStart.serverless,
      });
    };
    const appUpdater$ = this.appUpdater$;

    const app: App = {
      id: 'multiplayer',
      title: 'multiplayer',
      order: 8002,
      updater$: appUpdater$,
      euiIconType: 'logoObservability',
      appRoute: '/app/multiplayer',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount,
      keywords: ['observability', 'multiplayer'],
    };
    // Register an application into the side navigation menu
    core.application.register(app);

    return {};
  }

  public start(core: CoreStart, plugins: MultiplayerPublicPluginsStart) {
    const kibanaVersion = this.initContext.env.packageInfo.version;

    const lazyWithContextProviders = getLazyWithContextProviders({
      core,
      isDev: this.initContext.env.mode.dev,
      kibanaVersion,
      ObservabilityPageTemplate: plugins.observabilityShared.navigation.PageTemplate,
      plugins,
      isServerless: !!plugins.serverless,
    });

    const getCreateMPFlyout = lazyWithContextProviders(
      lazy(() => import('./pages/sessions/sessions_flyout')),
      { spinnerSize: 'm' }
    );

    return {
      getCreateMPFlyout,
    };
  }

  public stop() {}
}
