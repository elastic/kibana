/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  AppMountParameters,
} from '@kbn/core/public';
import { BehaviorSubject, from } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';

import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type {
  ExploratoryViewPublicSetup,
  ExploratoryViewPublicStart,
} from '@kbn/exploratory-view-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';

import { FleetStart } from '@kbn/fleet-plugin/public';
import {
  enableLegacyUptimeApp,
  FetchDataParams,
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import { AppStatus, AppUpdater } from '@kbn/core-application-browser';
import {
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantPublicSetup,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { PLUGIN } from '../common/constants/plugin';
import { UptimeConfig } from '../common/config';
import {
  LazySyntheticsPolicyCreateExtension,
  LazySyntheticsPolicyEditExtension,
} from './legacy_uptime/components/fleet_package';
import { LazySyntheticsCustomAssetsExtension } from './legacy_uptime/components/fleet_package/lazy_synthetics_custom_assets_extension';
import {
  legacyAlertTypeInitializers,
  uptimeAlertTypeInitializers,
} from './legacy_uptime/lib/alert_types';
import { setStartServices } from './kibana_services';
import { UptimeOverviewLocatorDefinition } from './locators/overview';
import { UptimeDataHelper } from './legacy_uptime/app/uptime_overview_fetcher';

export interface ClientPluginsSetup {
  home?: HomePublicPluginSetup;
  data: DataPublicPluginSetup;
  exploratoryView: ExploratoryViewPublicSetup;
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
  share: SharePluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  cloud?: CloudSetup;
}

export interface ClientPluginsStart {
  fleet: FleetStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  discover: DiscoverStart;
  inspector: InspectorPluginStart;
  embeddable: EmbeddableStart;
  exploratoryView: ExploratoryViewPublicStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  cases: CasesPublicStart;
  dataViews: DataViewsPublicPluginStart;
  spaces?: SpacesPluginStart;
  cloud?: CloudStart;
  appName: string;
  storage: IStorageWrapper;
  application: CoreStart['application'];
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  docLinks: DocLinksStart;
  uiSettings: CoreStart['uiSettings'];
  usageCollection: UsageCollectionStart;
  charts: ChartsPluginStart;
}

export interface UptimePluginServices extends Partial<CoreStart> {
  embeddable: EmbeddableStart;
  data: DataPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  storage: IStorageWrapper;
}

export type ClientSetup = void;
export type ClientStart = void;

export class UptimePlugin
  implements Plugin<ClientSetup, ClientStart, ClientPluginsSetup, ClientPluginsStart>
{
  constructor(private readonly initContext: PluginInitializerContext<UptimeConfig>) {
    this.experimentalFeatures =
      this.initContext.config.get().experimental || this.experimentalFeatures;
  }

  private uptimeAppUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private experimentalFeatures: UptimeConfig['experimental'] = {
    ruleFormV2Enabled: false,
  };

  public setup(core: CoreSetup<ClientPluginsStart, unknown>, plugins: ClientPluginsSetup): void {
    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: PLUGIN.ID,
        title: PLUGIN.TITLE,
        description: PLUGIN.DESCRIPTION,
        icon: 'uptimeApp',
        path: '/app/uptime',
        showOnHomePage: false,
        category: 'data',
      });
    }
    const getUptimeDataHelper = async () => {
      const [coreStart] = await core.getStartServices();
      return UptimeDataHelper(coreStart);
    };

    plugins.observability.dashboard.register({
      appName: 'uptime',
      hasData: async () => {
        const dataHelper = await getUptimeDataHelper();
        const status = await dataHelper.indexStatus();
        return { hasData: status.indexExists, indices: status.indices };
      },
      fetchData: async (params: FetchDataParams) => {
        const dataHelper = await getUptimeDataHelper();
        return await dataHelper.overviewData(params);
      },
    });

    plugins.exploratoryView.register({
      appName: 'uptime',
      hasData: async () => {
        const dataHelper = await getUptimeDataHelper();
        const status = await dataHelper.indexStatus();
        return { hasData: status.indexExists, indices: status.indices };
      },
      fetchData: async (params: FetchDataParams) => {
        const dataHelper = await getUptimeDataHelper();
        return await dataHelper.overviewData(params);
      },
    });

    const appKeywords = [
      'Synthetics',
      'availability',
      'browser',
      'checks',
      'digital',
      'reachability',
      'reachable',
      'response duration',
      'response time',
      'monitors',
      'outside in',
      'performance',
      'pings',
      'web performance',
      'web perf',
    ];

    core.application.register({
      id: PLUGIN.ID,
      euiIconType: 'logoObservability',

      order: 8400,
      title: PLUGIN.TITLE,
      category: DEFAULT_APP_CATEGORIES.observability,
      keywords: appKeywords,
      deepLinks: [
        { id: 'Down monitors', title: 'Down monitors', path: '/?statusFilter=down' },
        { id: 'Certificates', title: 'TLS Certificates', path: '/certificates' },
        { id: 'Settings', title: 'Settings', path: '/settings' },
      ],
      mount: async (params: AppMountParameters) => {
        const [coreStart, corePlugins] = await core.getStartServices();
        const { renderApp } = await import('./legacy_uptime/app/render_app');
        return renderApp(
          coreStart,
          plugins,
          corePlugins,
          params,
          this.initContext.env.mode.dev,
          this.experimentalFeatures
        );
      },
      updater$: this.uptimeAppUpdater,
    });
  }

  public start(coreStart: CoreStart, pluginsStart: ClientPluginsStart): void {
    const { registerExtension } = pluginsStart.fleet;
    setStartServices(coreStart);
    registerUptimeFleetExtensions(registerExtension);

    setUptimeAppStatus(
      this.initContext.env.packageInfo.version,
      coreStart,
      pluginsStart,
      this.uptimeAppUpdater
    );
  }

  public stop(): void {}
}

function registerUptimeRoutesWithNavigation(coreStart: CoreStart, plugins: ClientPluginsStart) {
  async function getUptimeSections() {
    if (coreStart.application.capabilities.uptime?.show) {
      plugins.share.url.locators.create(new UptimeOverviewLocatorDefinition());

      return [
        {
          label: 'Uptime',
          sortKey: 500,
          entries: [
            {
              label: i18n.translate('xpack.uptime.overview.uptimeHeading', {
                defaultMessage: 'Uptime Monitors',
              }),
              app: 'uptime',
              path: '/',
              matchFullPath: true,
              ignoreTrailingSlash: true,
            },
            {
              label: i18n.translate('xpack.uptime.certificatesPage.heading', {
                defaultMessage: 'TLS Certificates',
              }),
              app: 'uptime',
              path: '/certificates',
              matchFullPath: true,
            },
          ],
        },
      ];
    }
    return [];
  }
  plugins.observabilityShared.navigation.registerSections(from(getUptimeSections()));
}

function registerUptimeFleetExtensions(registerExtension: FleetStart['registerExtension']) {
  registerExtension({
    package: 'synthetics',
    view: 'package-policy-create',
    Component: LazySyntheticsPolicyCreateExtension,
  });

  registerExtension({
    package: 'synthetics',
    view: 'package-policy-edit',
    useLatestPackageVersion: true,
    Component: LazySyntheticsPolicyEditExtension,
  });

  registerExtension({
    package: 'synthetics',
    view: 'package-detail-assets',
    Component: LazySyntheticsCustomAssetsExtension,
  });
}

function setUptimeAppStatus(
  stackVersion: string,
  coreStart: CoreStart,
  pluginsStart: ClientPluginsStart,
  updater: BehaviorSubject<AppUpdater>
) {
  const isEnabled = coreStart.uiSettings.get<boolean>(enableLegacyUptimeApp);
  if (isEnabled) {
    registerUptimeRoutesWithNavigation(coreStart, pluginsStart);
    registerAlertRules(coreStart, pluginsStart, stackVersion, false);
    updater.next(() => ({ status: AppStatus.accessible }));
  } else {
    const hasUptimePrivileges = coreStart.application.capabilities.uptime?.show;
    if (hasUptimePrivileges) {
      const indexStatusPromise = UptimeDataHelper(coreStart).indexStatus('now-7d/d', 'now/d');
      indexStatusPromise.then((indexStatus) => {
        if (indexStatus.indexExists) {
          registerUptimeRoutesWithNavigation(coreStart, pluginsStart);
          updater.next(() => ({ status: AppStatus.accessible }));
          registerAlertRules(coreStart, pluginsStart, stackVersion, false);
        } else {
          updater.next(() => ({ status: AppStatus.inaccessible }));
          registerAlertRules(coreStart, pluginsStart, stackVersion, true);
        }
      });
    }
  }
}

function registerAlertRules(
  coreStart: CoreStart,
  pluginsStart: ClientPluginsStart,
  stackVersion: string,
  isHidden = false
) {
  uptimeAlertTypeInitializers.forEach((init) => {
    const { observabilityRuleTypeRegistry } = pluginsStart.observability;

    const alertInitializer = init({
      isHidden,
      stackVersion,
      core: coreStart,
      plugins: pluginsStart,
    });
    if (!pluginsStart.triggersActionsUi.ruleTypeRegistry.has(alertInitializer.id)) {
      observabilityRuleTypeRegistry.register(alertInitializer);
    }
  });

  legacyAlertTypeInitializers.forEach((init) => {
    const alertInitializer = init({
      isHidden,
      stackVersion,
      core: coreStart,
      plugins: pluginsStart,
    });
    if (!pluginsStart.triggersActionsUi.ruleTypeRegistry.has(alertInitializer.id)) {
      pluginsStart.triggersActionsUi.ruleTypeRegistry.register(alertInitializer);
    }
  });
}
