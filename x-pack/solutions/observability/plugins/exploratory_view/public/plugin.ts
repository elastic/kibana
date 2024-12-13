/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import {
  AnalyticsServiceSetup,
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin as PluginClass,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import { getExploratoryViewEmbeddable } from './components/shared/exploratory_view/embeddable';
import { createExploratoryViewUrl } from './components/shared/exploratory_view/configurations/exploratory_view_url';
import getAppDataView from './utils/observability_data_views/get_app_data_view';
import { registerDataHandler } from './data_handler';
import { APP_ROUTE } from './constants';

export interface ExploratoryViewPublicPluginsSetup {
  data: DataPublicPluginSetup;
  share: SharePluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
  home?: HomePublicPluginSetup;
}

export interface ExploratoryViewPublicPluginsStart {
  cases: CasesPublicStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
  embeddable: EmbeddableStart;

  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
  security: SecurityPluginStart;
  share: SharePluginStart;
  spaces?: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  usageCollection: UsageCollectionSetup;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  home?: HomePublicPluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
}

export type ExploratoryViewPublicSetup = ReturnType<Plugin['setup']>;
export type ExploratoryViewPublicStart = ReturnType<Plugin['start']>;

export class Plugin
  implements
    PluginClass<
      ExploratoryViewPublicSetup,
      ExploratoryViewPublicStart,
      ExploratoryViewPublicPluginsSetup,
      ExploratoryViewPublicPluginsStart
    >
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  private analyticsService?: AnalyticsServiceSetup;

  constructor(private readonly initContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<ExploratoryViewPublicPluginsStart, ExploratoryViewPublicStart>,
    plugins: ExploratoryViewPublicPluginsSetup
  ) {
    const appUpdater$ = this.appUpdater$;

    core.application.register({
      appRoute: APP_ROUTE,
      category: DEFAULT_APP_CATEGORIES.observability,
      euiIconType: 'logoObservability',
      id: 'exploratory-view',
      mount: async (params: AppMountParameters<unknown>) => {
        const { renderApp } = await import('./application');
        const [coreStart, pluginsStart] = await core.getStartServices();

        return renderApp({
          core: coreStart,
          appMountParameters: params,
          plugins: { ...pluginsStart },
          usageCollection: plugins.usageCollection,
          isDev: this.initContext.env.mode.dev,
        });
      },
      title: i18n.translate('xpack.exploratoryView.appTitle', {
        defaultMessage: 'Exploratory View',
      }),
      visibleIn: [],
      updater$: appUpdater$,
      keywords: [
        'observability',
        'monitor',
        'logs',
        'metrics',
        'apm',
        'performance',
        'trace',
        'rum',
        'user',
        'experience',
      ],
    });

    this.analyticsService = core.analytics;

    return {
      register: registerDataHandler,
    };
  }

  public start(coreStart: CoreStart, pluginsStart: ExploratoryViewPublicPluginsStart) {
    return {
      createExploratoryViewUrl,
      getAppDataView: getAppDataView(pluginsStart.dataViews),
      ExploratoryViewEmbeddable: getExploratoryViewEmbeddable(
        { ...coreStart, ...pluginsStart },
        this.analyticsService
      ),
    };
  }
}
