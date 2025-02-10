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
import { DefaultClientOptions, createRepositoryClient } from '@kbn/server-route-repository-client';
import { lazy } from 'react';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { PLUGIN_NAME, sloAppId } from '../common';
import { ExperimentalFeatures, SLOConfig } from '../common/config';
import { SLOS_BASE_PATH } from '../common/locators/paths';
import type { SLORouteRepository } from '../server/routes/get_slo_server_route_repository';
import { SLO_ALERTS_EMBEDDABLE_ID } from './embeddable/slo/alerts/constants';
import { SLO_BURN_RATE_EMBEDDABLE_ID } from './embeddable/slo/burn_rate/constants';
import { SLO_ERROR_BUDGET_ID } from './embeddable/slo/error_budget/constants';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from './embeddable/slo/overview/constants';
import { SloOverviewEmbeddableState } from './embeddable/slo/overview/types';
import { SloDetailsLocatorDefinition } from './locators/slo_details';
import { SloEditLocatorDefinition } from './locators/slo_edit';
import { SloListLocatorDefinition } from './locators/slo_list';
import { registerBurnRateRuleType } from './rules/register_burn_rate_rule_type';
import type {
  SLOPublicPluginsSetup,
  SLOPublicPluginsStart,
  SLOPublicSetup,
  SLOPublicStart,
} from './types';
import { getLazyWithContextProviders } from './utils/get_lazy_with_context_providers';
import { registerSloUiActions } from './ui_actions/register_ui_actions';

export class SLOPlugin
  implements Plugin<SLOPublicSetup, SLOPublicStart, SLOPublicPluginsSetup, SLOPublicPluginsStart>
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private experimentalFeatures: ExperimentalFeatures = { ruleFormV2: { enabled: false } };

  constructor(private readonly initContext: PluginInitializerContext<SLOConfig>) {
    this.experimentalFeatures =
      this.initContext.config.get().experimental ?? this.experimentalFeatures;
  }

  public setup(
    core: CoreSetup<SLOPublicPluginsStart, SLOPublicStart>,
    plugins: SLOPublicPluginsSetup
  ) {
    const kibanaVersion = this.initContext.env.packageInfo.version;

    const sloClient = createRepositoryClient<SLORouteRepository, DefaultClientOptions>(core);

    const sloDetailsLocator = plugins.share.url.locators.create(new SloDetailsLocatorDefinition());
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

    const registerEmbeddables = async () => {
      const licensing = plugins.licensing;
      const license = await firstValueFrom(licensing.license$);

      const hasPlatinumLicense = license.hasAtLeast('platinum');
      if (hasPlatinumLicense) {
        const [coreStart, pluginsStart] = await core.getStartServices();

        pluginsStart.dashboard.registerDashboardPanelPlacementSetting(
          SLO_OVERVIEW_EMBEDDABLE_ID,
          (serializedState: SloOverviewEmbeddableState | undefined) => {
            if (serializedState?.showAllGroupByInstances || serializedState?.groupFilters) {
              return { width: 24, height: 8 };
            }
            return { width: 12, height: 8 };
          }
        );
        pluginsStart.dashboard.registerDashboardPanelPlacementSetting(
          SLO_BURN_RATE_EMBEDDABLE_ID,
          () => {
            return { width: 14, height: 7 };
          }
        );

        plugins.embeddable.registerReactEmbeddableFactory(SLO_OVERVIEW_EMBEDDABLE_ID, async () => {
          const { getOverviewEmbeddableFactory } = await import(
            './embeddable/slo/overview/slo_embeddable_factory'
          );
          return getOverviewEmbeddableFactory({ coreStart, pluginsStart, sloClient });
        });

        plugins.embeddable.registerReactEmbeddableFactory(SLO_ALERTS_EMBEDDABLE_ID, async () => {
          const { getAlertsEmbeddableFactory } = await import(
            './embeddable/slo/alerts/slo_alerts_embeddable_factory'
          );

          return getAlertsEmbeddableFactory({ coreStart, pluginsStart, sloClient, kibanaVersion });
        });

        plugins.embeddable.registerReactEmbeddableFactory(SLO_ERROR_BUDGET_ID, async () => {
          const { getErrorBudgetEmbeddableFactory } = await import(
            './embeddable/slo/error_budget/error_budget_react_embeddable_factory'
          );
          return getErrorBudgetEmbeddableFactory({
            coreStart,
            pluginsStart,
            sloClient,
          });
        });

        plugins.embeddable.registerReactEmbeddableFactory(SLO_BURN_RATE_EMBEDDABLE_ID, async () => {
          const { getBurnRateEmbeddableFactory } = await import(
            './embeddable/slo/burn_rate/burn_rate_react_embeddable_factory'
          );
          return getBurnRateEmbeddableFactory({
            coreStart,
            pluginsStart,
            sloClient,
          });
        });

        registerSloUiActions(plugins.uiActions, coreStart, pluginsStart, sloClient);
      }
    };
    registerEmbeddables();

    return {
      sloDetailsLocator,
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
    });

    const getCreateSLOFlyout = lazyWithContextProviders(
      lazy(() => import('./pages/slo_edit/shared_flyout/slo_add_form_flyout')),
      { spinnerSize: 'm' }
    );

    plugins.discoverShared.features.registry.register({
      id: 'observability-create-slo',
      createSLOFlyout: getCreateSLOFlyout,
    });

    return {
      getCreateSLOFlyout,
    };
  }

  public stop() {}
}
