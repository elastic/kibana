/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, AppDeepLinkLocations } from '@kbn/core/public';
import {
  type AppMountParameters,
  type AppUpdater,
  type CoreStart,
  type AppDeepLink,
  DEFAULT_APP_CATEGORIES,
  AppStatus,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { MetricsExplorerLocatorParams } from '@kbn/observability-shared-plugin/common';
import { METRICS_EXPLORER_LOCATOR_ID } from '@kbn/observability-shared-plugin/common';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  from,
  of,
  switchMap,
  map,
  firstValueFrom,
} from 'rxjs';
import {
  ASSET_DETAILS_LOCATOR_ID,
  INVENTORY_LOCATOR_ID,
  type AssetDetailsLocatorParams,
  type InventoryLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import type { NavigationEntry } from '@kbn/observability-shared-plugin/public';
import { OBSERVABILITY_LOGS_EXPLORER_APP_ID } from '@kbn/deeplinks-observability/constants';
import type { InfraPublicConfig } from '../common/plugin_config_types';
import { createInventoryMetricRuleType } from './alerting/inventory';
import { createLogThresholdRuleType } from './alerting/log_threshold';
import { createMetricThresholdRuleType } from './alerting/metric_threshold';
import { LOG_STREAM_EMBEDDABLE } from './components/log_stream/constants';
import { createMetricsFetchData, createMetricsHasData } from './metrics_overview_fetchers';
import { registerFeatures } from './register_feature';
import { InventoryViewsService } from './services/inventory_views';
import { MetricsExplorerViewsService } from './services/metrics_explorer_views';
import { TelemetryService } from './services/telemetry';
import type {
  InfraClientCoreSetup,
  InfraClientCoreStart,
  InfraClientPluginClass,
  InfraClientSetupDeps,
  InfraClientStartDeps,
  InfraClientStartExports,
} from './types';
import { getLogsHasDataFetcher, getLogsOverviewDataFetcher } from './utils/logs_overview_fetchers';
import {
  hostsTitle,
  inventoryTitle,
  logsTitle,
  metricsExplorerTitle,
  metricsTitle,
} from './translations';
import type { LogsAppRoutes, LogsRoute } from './pages/logs/routes';
import { getLogsAppRoutes } from './pages/logs/routes';

export class Plugin implements InfraClientPluginClass {
  public config: InfraPublicConfig;
  private inventoryViews: InventoryViewsService;
  private metricsExplorerViews?: MetricsExplorerViewsService;
  private telemetry: TelemetryService;
  private kibanaVersion: string;
  private isServerlessEnv: boolean;
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(context: PluginInitializerContext<InfraPublicConfig>) {
    this.config = context.config.get();

    this.inventoryViews = new InventoryViewsService();
    this.metricsExplorerViews = this.config.featureFlags.metricsExplorerEnabled
      ? new MetricsExplorerViewsService()
      : undefined;
    this.telemetry = new TelemetryService();
    this.kibanaVersion = context.env.packageInfo.version;
    this.isServerlessEnv = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(core: InfraClientCoreSetup, pluginsSetup: InfraClientSetupDeps) {
    if (pluginsSetup.home) {
      registerFeatures(pluginsSetup.home);
    }

    const assetDetailsLocator =
      pluginsSetup.share.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);
    const inventoryLocator =
      pluginsSetup.share.url.locators.get<InventoryLocatorParams>(INVENTORY_LOCATOR_ID);
    const metricsExplorerLocator =
      pluginsSetup.share.url.locators.get<MetricsExplorerLocatorParams>(
        METRICS_EXPLORER_LOCATOR_ID
      );

    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createInventoryMetricRuleType({ assetDetailsLocator, inventoryLocator })
    );

    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createMetricThresholdRuleType({ assetDetailsLocator, metricsExplorerLocator })
    );

    if (this.config.featureFlags.logsUIEnabled) {
      // fetchData `appLink` redirects to logs explorer
      pluginsSetup.observability.dashboard.register({
        appName: 'infra_logs',
        hasData: getLogsHasDataFetcher(core.getStartServices),
        fetchData: getLogsOverviewDataFetcher(core.getStartServices),
      });
    }

    pluginsSetup.observability.dashboard.register({
      appName: 'infra_metrics',
      hasData: createMetricsHasData(core.getStartServices),
      fetchData: createMetricsFetchData(core.getStartServices),
    });
    pluginsSetup.logsShared.logViews.setLogViewsStaticConfig({
      messageFields: this.config.sources?.default?.fields?.message,
    });

    const startDep$AndAccessibleFlag$ = from(core.getStartServices()).pipe(
      switchMap(([{ application }]) =>
        combineLatest([of(application), getLogsExplorerAccessible$(application)])
      )
    );

    const logRoutes = getLogsAppRoutes();

    /** !! Need to be kept in sync with the deepLinks in x-pack/solutions/observability/plugins/infra/public/plugin.ts */
    pluginsSetup.observabilityShared.navigation.registerSections(
      startDep$AndAccessibleFlag$.pipe(
        map(([application, isLogsExplorerAccessible]) => {
          const { infrastructure, logs } = application.capabilities;
          return [
            ...(logs.show
              ? [
                  {
                    label: logsTitle,
                    sortKey: 200,
                    entries: getLogsNavigationEntries({
                      isLogsExplorerAccessible,
                      config: this.config,
                      routes: logRoutes,
                    }),
                  },
                ]
              : []),
            ...(infrastructure.show
              ? [
                  {
                    label: metricsTitle,
                    sortKey: 300,
                    entries: [
                      {
                        label: inventoryTitle,
                        app: 'metrics',
                        path: '/inventory',
                      },
                      ...(this.config.featureFlags.metricsExplorerEnabled
                        ? [
                            {
                              label: metricsExplorerTitle,
                              app: 'metrics',
                              path: '/explorer',
                            },
                          ]
                        : []),
                      {
                        label: hostsTitle,
                        app: 'metrics',
                        path: '/hosts',
                      },
                    ],
                  },
                ]
              : []),
          ];
        })
      )
    );

    pluginsSetup.embeddable.registerReactEmbeddableFactory(LOG_STREAM_EMBEDDABLE, async () => {
      const { getLogStreamEmbeddableFactory } = await import(
        './components/log_stream/log_stream_react_embeddable'
      );
      const [coreStart, pluginDeps, pluginStart] = await core.getStartServices();
      return getLogStreamEmbeddableFactory({
        coreStart,
        pluginDeps,
        pluginStart,
      });
    });

    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createLogThresholdRuleType(core, pluginsSetup.share.url)
    );

    if (this.config.featureFlags.logsUIEnabled) {
      core.application.register({
        id: 'logs',
        title: i18n.translate('xpack.infra.logs.pluginTitle', {
          defaultMessage: 'Logs',
        }),
        euiIconType: 'logoObservability',
        order: 8100,
        appRoute: '/app/logs',
        deepLinks: Object.values(logRoutes),
        category: DEFAULT_APP_CATEGORIES.observability,
        mount: async (params: AppMountParameters) => {
          // mount callback should not use setup dependencies, get start dependencies instead
          const [coreStart, plugins, pluginStart] = await core.getStartServices();

          const isLogsExplorerAccessible = await firstValueFrom(
            getLogsExplorerAccessible$(coreStart.application)
          );

          const { renderApp } = await import('./apps/logs_app');
          return renderApp(coreStart, plugins, pluginStart, isLogsExplorerAccessible, params);
        },
      });
    }

    // !! Need to be kept in sync with the routes in x-pack/solutions/observability/plugins/infra/public/pages/metrics/index.tsx
    const getInfraDeepLinks = ({
      metricsExplorerEnabled,
    }: {
      metricsExplorerEnabled: boolean;
    }): AppDeepLink[] => {
      const visibleIn: AppDeepLinkLocations[] = ['globalSearch'];

      return [
        {
          id: 'inventory',
          title: inventoryTitle,
          path: '/inventory',
          visibleIn,
        },
        {
          id: 'hosts',
          title: i18n.translate('xpack.infra.homePage.metricsHostsTabTitle', {
            defaultMessage: 'Hosts',
          }),
          path: '/hosts',
          visibleIn,
        },
        ...(metricsExplorerEnabled
          ? [
              {
                id: 'metrics-explorer',
                title: i18n.translate('xpack.infra.homePage.metricsExplorerTabTitle', {
                  defaultMessage: 'Metrics Explorer',
                }),
                path: '/explorer',
              },
            ]
          : []),
        {
          id: 'settings',
          title: i18n.translate('xpack.infra.homePage.settingsTabTitle', {
            defaultMessage: 'Settings',
          }),
          path: '/settings',
        },
        {
          id: 'assetDetails',
          title: '', // Internal deep link, not shown in the UI. Title is dynamically set in the app.
          path: '/detail',
          visibleIn: [],
        },
      ];
    };

    core.application.register({
      id: 'metrics',
      title: i18n.translate('xpack.infra.metrics.pluginTitle', {
        defaultMessage: 'Infrastructure',
      }),
      euiIconType: 'logoObservability',
      order: 8200,
      appRoute: '/app/metrics',
      category: DEFAULT_APP_CATEGORIES.observability,
      updater$: this.appUpdater$,
      deepLinks: getInfraDeepLinks({
        metricsExplorerEnabled: this.config.featureFlags.metricsExplorerEnabled,
      }),
      mount: async (params: AppMountParameters) => {
        // mount callback should not use setup dependencies, get start dependencies instead
        const [coreStart, plugins, pluginStart] = await core.getStartServices();
        const { renderApp } = await import('./apps/metrics_app');

        const isCloudEnv = !!pluginsSetup.cloud?.isCloudEnabled;
        const isServerlessEnv = pluginsSetup.cloud?.isServerlessEnabled || this.isServerlessEnv;
        return renderApp(
          coreStart,
          { ...plugins, licenseManagement: pluginsSetup.licenseManagement },
          pluginStart,
          this.config,
          params,
          {
            kibanaVersion: this.kibanaVersion,
            isCloudEnv,
            isServerlessEnv,
          }
        );
      },
    });
    startDep$AndAccessibleFlag$.subscribe(([_applicationStart, _isLogsExplorerAccessible]) => {
      this.appUpdater$.next(() => ({
        deepLinks: getInfraDeepLinks({
          metricsExplorerEnabled: this.config.featureFlags.metricsExplorerEnabled,
        }),
      }));
    });

    // Setup telemetry events
    this.telemetry.setup({ analytics: core.analytics });
    return {};
  }

  start(core: InfraClientCoreStart, plugins: InfraClientStartDeps) {
    const { http } = core;
    const inventoryViews = this.inventoryViews.start({ http });
    const metricsExplorerViews = this.metricsExplorerViews?.start({ http });
    const telemetry = this.telemetry.start();

    const startContract: InfraClientStartExports = {
      inventoryViews,
      metricsExplorerViews,
      telemetry,
    };

    return startContract;
  }

  stop() {}
}

const getLogsNavigationEntries = ({
  isLogsExplorerAccessible,
  config,
  routes,
}: {
  isLogsExplorerAccessible: boolean;
  config: InfraPublicConfig;
  routes: LogsAppRoutes;
}) => {
  const entries: NavigationEntry[] = [];

  if (!config.featureFlags.logsUIEnabled) return entries;

  if (isLogsExplorerAccessible) {
    entries.push({
      label: 'Discover',
      app: 'observability-logs-explorer',
      path: '/',
    });
  }

  // Display always Logs Anomalies and Logs Categories entries
  entries.push(createNavEntryFromRoute(routes.logsAnomalies));
  entries.push(createNavEntryFromRoute(routes.logsCategories));

  return entries;
};

const getLogsExplorerAccessible$ = (application: CoreStart['application']) => {
  const { applications$ } = application;
  return applications$.pipe(
    map(
      (apps) =>
        (apps.get(OBSERVABILITY_LOGS_EXPLORER_APP_ID)?.status ?? AppStatus.inaccessible) ===
        AppStatus.accessible
    ),
    distinctUntilChanged()
  );
};

const createNavEntryFromRoute = ({ path, title }: LogsRoute): NavigationEntry => ({
  app: 'logs',
  label: title,
  path,
});
