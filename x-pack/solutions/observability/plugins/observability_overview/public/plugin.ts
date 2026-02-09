/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type {
  AppMountParameters,
  CoreSetup,
  Plugin as PluginClass,
  PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { registerDataHandler } from './context/has_data_context/data_handler';

export interface ConfigSchema {
  unsafe: {
    alertDetails: {
      uptime: { enabled: false };
    };
  };

  managedOtlpServiceUrl: string;
}

export type ObservabilityOverviewPublicSetup = ReturnType<Plugin['setup']>;
export type ObservabilityOverviewPublicStart = ReturnType<Plugin['start']>;
export interface ObservabilityOverviewPublicPluginsSetup {
  serverless?: ServerlessPluginSetup;
  usageCollection?: UsageCollectionSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
}

export interface ObservabilityOverviewPublicPluginsStart {
  cases: CasesPublicStart;
  charts: ChartsPluginStart;
  cloud?: CloudStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  licensing: LicensingPluginStart;
  logsDataAccess: LogsDataAccessPluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  serverless?: ServerlessPluginStart;
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export class Plugin
  implements
    PluginClass<
      ObservabilityOverviewPublicSetup,
      ObservabilityOverviewPublicStart,
      ObservabilityOverviewPublicPluginsSetup,
      ObservabilityOverviewPublicPluginsStart
    >
{
  constructor(private readonly initContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(
    coreSetup: CoreSetup<ObservabilityOverviewPublicPluginsStart, ObservabilityOverviewPublicStart>,
    pluginsSetup: ObservabilityOverviewPublicPluginsSetup
  ) {
    const category = DEFAULT_APP_CATEGORIES.observability;
    const euiIconType = 'logoObservability';
    const kibanaVersion = this.initContext.env.packageInfo.version;

    const mount = async (params: AppMountParameters<unknown>) => {
      const { renderApp } = await import('./application/application');

      const [coreStart, pluginsStart] = await coreSetup.getStartServices();

      return renderApp({
        appMountParameters: params,
        core: coreStart,
        isDev: this.initContext.env.mode.dev,
        kibanaVersion,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: pluginsStart,
        usageCollection: pluginsSetup.usageCollection,
        isServerless: !!pluginsStart.serverless,
      });
    };

    coreSetup.application.register({
      appRoute: '/app/observabilityOverview',
      category,
      euiIconType,
      id: 'observabilityOverview',
      mount,
      order: 8000,
      title: i18n.translate('xpack.observabilityOverview.overviewLinkTitle', {
        defaultMessage: 'Overview',
      }),
      keywords: [
        'observability',
        'monitor',
        'logs',
        'metrics',
        'apm',
        'performance',
        'trace',
        'agent',
        'rum',
        'user',
        'experience',
      ],
      visibleIn: Boolean(pluginsSetup.serverless)
        ? ['home', 'kibanaOverview']
        : ['globalSearch', 'home', 'kibanaOverview', 'sideNav'],
    });

    return {
      dashboard: { register: registerDataHandler },
    };
  }

  public start() {
    return {};
  }
}
