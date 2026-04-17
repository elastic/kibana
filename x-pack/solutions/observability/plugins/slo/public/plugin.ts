/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  App,
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { DefaultClientOptions } from '@kbn/server-route-repository-client';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import { SLOS_BASE_PATH } from '@kbn/slo-shared-plugin/common/locators/paths';
import { lazy } from 'react';
import { BehaviorSubject } from 'rxjs';
import { PLUGIN_NAME, sloAppId } from '../common';
import type { ExperimentalFeatures, SLOConfig } from '../common/config';
import type { SLORouteRepository } from '../server/routes/get_slo_server_route_repository';
import { registerEmbeddables } from './register_embeddables';
import { SloDetailsLocatorDefinition } from './locators/slo_details';
import { SloDetailsHistoryLocatorDefinition } from './locators/slo_details_history';
import { SloEditLocatorDefinition } from './locators/slo_edit';
import { SloListLocatorDefinition } from './locators/slo_list';
import { registerBurnRateRuleType } from './rules/register_burn_rate_rule_type';
import type {
  SLOPublicPluginsSetup,
  SLOPublicPluginsStart,
  SLOPublicSetup,
  SLOPublicStart,
} from './types';
import { SloTelemetryService } from './services/telemetry';
import { getLazyWithContextProviders } from './utils/get_lazy_with_context_providers';

export class SLOPlugin
  implements Plugin<SLOPublicSetup, SLOPublicStart, SLOPublicPluginsSetup, SLOPublicPluginsStart>
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private readonly telemetryService = new SloTelemetryService();
  private experimentalFeatures: ExperimentalFeatures = {
    ruleFormV2: { enabled: false },
    compositeSlo: { enabled: false },
  };

  constructor(private readonly initContext: PluginInitializerContext<SLOConfig>) {
    this.experimentalFeatures =
      this.initContext.config.get().experimental ?? this.experimentalFeatures;
  }

  public setup(
    core: CoreSetup<SLOPublicPluginsStart, SLOPublicStart>,
    plugins: SLOPublicPluginsSetup
  ) {
    const kibanaVersion = this.initContext.env.packageInfo.version;

    this.telemetryService.setup(core.analytics);

    const sloClient = createRepositoryClient<SLORouteRepository, DefaultClientOptions>(core);

    const sloDetailsLocator = plugins.share.url.locators.create(new SloDetailsLocatorDefinition());
    const sloDetailsHistoryLocator = plugins.share.url.locators.create(
      new SloDetailsHistoryLocatorDefinition()
    );
    const sloEditLocator = plugins.share.url.locators.create(new SloEditLocatorDefinition());
    const sloListLocator = plugins.share.url.locators.create(new SloListLocatorDefinition());

    const mount = async (params: AppMountParameters<unknown>) => {
      const { renderApp } = await import('./application');
      const [coreStart, pluginsStart] = await core.getStartServices();
      const { observabilityRuleTypeRegistry } = pluginsStart.observability;

      return renderApp({
        appMountParameters: params,
        core: coreStart,
        isDev: this.initContext.env.mode.dev,
        observabilityRuleTypeRegistry,
        kibanaVersion,
        usageCollection: plugins.usageCollection,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: pluginsStart,
        isServerless: !!pluginsStart.serverless,
        experimentalFeatures: this.experimentalFeatures,
        sloClient,
        telemetry: this.telemetryService.start(coreStart.analytics),
      });
    };
    const appUpdater$ = this.appUpdater$;
    const app: App = {
      id: sloAppId,
      title: PLUGIN_NAME,
      order: 8002,
      updater$: appUpdater$,
      euiIconType: 'logoObservability',
      appRoute: SLOS_BASE_PATH,
      category: DEFAULT_APP_CATEGORIES.observability,
      mount,
      keywords: ['observability', 'monitor', 'slos'],
    };
    // Register an application into the side navigation menu
    core.application.register(app);

    const registerRules = async () => {
      const [coreStart, pluginsStart] = await core.getStartServices();
      const lazyWithContextProviders = getLazyWithContextProviders({
        core: coreStart,
        isDev: this.initContext.env.mode.dev,
        kibanaVersion,
        observabilityRuleTypeRegistry: pluginsStart.observability.observabilityRuleTypeRegistry,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: pluginsStart,
        isServerless: !!plugins.serverless,
        experimentalFeatures: this.experimentalFeatures,
        sloClient,
      });

      registerBurnRateRuleType(
        plugins.observability.observabilityRuleTypeRegistry,
        lazyWithContextProviders
      );
    };
    registerRules();

    registerEmbeddables({
      core,
      plugins,
      sloClient,
      kibanaVersion,
    });

    return {
      sloDetailsLocator,
      sloDetailsHistoryLocator,
      sloEditLocator,
      sloListLocator,
    };
  }

  public start(core: CoreStart, plugins: SLOPublicPluginsStart) {
    const kibanaVersion = this.initContext.env.packageInfo.version;

    const sloClient = createRepositoryClient<SLORouteRepository, DefaultClientOptions>(core);

    const lazyWithContextProviders = getLazyWithContextProviders({
      core,
      isDev: this.initContext.env.mode.dev,
      kibanaVersion,
      observabilityRuleTypeRegistry: plugins.observability.observabilityRuleTypeRegistry,
      ObservabilityPageTemplate: plugins.observabilityShared.navigation.PageTemplate,
      plugins,
      isServerless: !!plugins.serverless,
      experimentalFeatures: this.experimentalFeatures,
      sloClient,
      telemetry: this.telemetryService.start(core.analytics),
    });

    const getCreateSLOFormFlyout = lazyWithContextProviders(
      lazy(() => import('./pages/slo_edit/shared_flyout/create_slo_form_flyout')),
      { spinnerSize: 'm' }
    );

    const getSLODetailsFlyout = lazyWithContextProviders(
      lazy(() => import('./pages/slo_details/shared_flyout/slo_details_flyout')),
      { spinnerSize: 'm' }
    );

    plugins.discoverShared.features.registry.register({
      id: 'observability-create-slo',
      createSLOFlyout: getCreateSLOFormFlyout,
    });

    return {
      getCreateSLOFormFlyout,
      getSLODetailsFlyout,
    };
  }

  public stop() {}
}
