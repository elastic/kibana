/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  Logger,
  SavedObjectsServiceStart,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/server';
import { ENTERPRISE_SEARCH_APP_ID } from '@kbn/deeplinks-search';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';

import {
  ENTERPRISE_SEARCH_OVERVIEW_PLUGIN,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  ELASTICSEARCH_PLUGIN,
  ANALYTICS_PLUGIN,
  SEARCH_EXPERIENCES_PLUGIN,
  ENTERPRISE_SEARCH_RELEVANCE_LOGS_SOURCE_ID,
  ENTERPRISE_SEARCH_AUDIT_LOGS_SOURCE_ID,
  ENTERPRISE_SEARCH_ANALYTICS_LOGS_SOURCE_ID,
  VECTOR_SEARCH_PLUGIN,
  SEMANTIC_SEARCH_PLUGIN,
  AI_SEARCH_PLUGIN,
  APPLICATIONS_PLUGIN,
  SEARCH_PRODUCT_NAME,
  SEARCH_INDICES,
  SEARCH_INDICES_START,
} from '../common/constants';

import {
  websiteSearchGuideId,
  databaseSearchGuideId,
  websiteSearchGuideConfig,
  databaseSearchGuideConfig,
} from '../common/guided_onboarding/search_guide_config';

import { AS_TELEMETRY_NAME } from './collectors/app_search/telemetry';
import { registerTelemetryUsageCollector as registerCNTelemetryUsageCollector } from './collectors/connectors/telemetry';
import {
  ES_TELEMETRY_NAME,
  registerTelemetryUsageCollector as registerESTelemetryUsageCollector,
} from './collectors/enterprise_search/telemetry';
import { WS_TELEMETRY_NAME } from './collectors/workplace_search/telemetry';
import { registerEnterpriseSearchIntegrations } from './integrations';

import { registerEnterpriseSearchRoutes } from './routes/enterprise_search';
import { registerAnalyticsRoutes } from './routes/enterprise_search/analytics';
import { registerApiKeysRoutes } from './routes/enterprise_search/api_keys';
import { registerConfigDataRoute } from './routes/enterprise_search/config_data';
import { registerConnectorRoutes } from './routes/enterprise_search/connectors';
import { registerStatsRoutes } from './routes/enterprise_search/stats';
import { registerTelemetryRoute } from './routes/enterprise_search/telemetry';

import { appSearchTelemetryType } from './saved_objects/app_search/telemetry';
import { enterpriseSearchTelemetryType } from './saved_objects/enterprise_search/telemetry';
import { workplaceSearchTelemetryType } from './saved_objects/workplace_search/telemetry';

import { GlobalConfigService } from './services/global_config_service';
import type { PluginsSetup, PluginsStart, RouteDependencies } from './types';
import { uiSettings as enterpriseSearchUISettings } from './ui_settings';

import { getConnectorsSearchResultProvider } from './utils/connectors_search_result_provider';
import { getIndicesSearchResultProvider } from './utils/indices_search_result_provider';
import { getSearchResultProvider } from './utils/search_result_provider';

import { ConfigType } from '.';

export class EnterpriseSearchPlugin implements Plugin<void, void, PluginsSetup, PluginsStart> {
  private readonly config: ConfigType;
  private readonly logger: Logger;
  private readonly globalConfigService: GlobalConfigService;

  /**
   * Exposed services
   */

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ConfigType>();
    this.globalConfigService = new GlobalConfigService();
    this.logger = initializerContext.logger.get();
  }

  public setup(
    { elasticsearch, http, savedObjects, getStartServices, uiSettings }: CoreSetup<PluginsStart>,
    {
      usageCollection,
      features,
      globalSearch,
      logsShared,
      customIntegrations,
      ml,
      licensing,
      guidedOnboarding,
      cloud,
      searchConnectors,
    }: PluginsSetup
  ) {
    this.globalConfigService.setup(elasticsearch.legacy.config$, cloud);
    const config = this.config;
    const log = this.logger;
    const PLUGIN_IDS = [
      ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.ID,
      ENTERPRISE_SEARCH_CONTENT_PLUGIN.ID,
      ELASTICSEARCH_PLUGIN.ID,
      SEARCH_EXPERIENCES_PLUGIN.ID,
      VECTOR_SEARCH_PLUGIN.ID,
      SEMANTIC_SEARCH_PLUGIN.ID,
      AI_SEARCH_PLUGIN.ID,
      SEARCH_INDICES,
      SEARCH_INDICES_START,
    ];
    const isCloud = !!cloud?.cloudId;

    if (customIntegrations) {
      registerEnterpriseSearchIntegrations(
        config,
        customIntegrations,
        http.staticAssets.getPluginAssetHref('images/crawler.svg')
      );
    }

    /**
     * Register space/feature control
     */
    features.registerKibanaFeature({
      id: ENTERPRISE_SEARCH_APP_ID,
      name: SEARCH_PRODUCT_NAME,
      order: 0,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['kibana', ...PLUGIN_IDS],
      catalogue: PLUGIN_IDS,
      privileges: {
        all: {
          app: ['kibana', ...PLUGIN_IDS],
          api: [],
          catalogue: PLUGIN_IDS,
          savedObject: {
            all: [ES_TELEMETRY_NAME, AS_TELEMETRY_NAME, WS_TELEMETRY_NAME],
            read: [ES_TELEMETRY_NAME, AS_TELEMETRY_NAME, WS_TELEMETRY_NAME],
          },
          ui: [],
        },
        read: {
          disabled: true,
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });
    features.registerKibanaFeature({
      id: APPLICATIONS_PLUGIN.ID,
      name: i18n.translate('xpack.enterpriseSearch.applications.featureName', {
        defaultMessage: 'Search Applications',
      }),
      order: 3,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['kibana', APPLICATIONS_PLUGIN.ID],
      catalogue: [APPLICATIONS_PLUGIN.ID],
      privileges: {
        all: {
          app: ['kibana', APPLICATIONS_PLUGIN.ID],
          api: [],
          catalogue: [APPLICATIONS_PLUGIN.ID],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          disabled: true,
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });
    features.registerKibanaFeature({
      id: ANALYTICS_PLUGIN.ID,
      name: ANALYTICS_PLUGIN.NAME,
      order: 4,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['kibana', ANALYTICS_PLUGIN.ID],
      catalogue: [ANALYTICS_PLUGIN.ID],
      privileges: {
        all: {
          app: ['kibana', ANALYTICS_PLUGIN.ID],
          api: [],
          catalogue: [ANALYTICS_PLUGIN.ID],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          disabled: true,
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });

    /**
     * Register Enterprise Search UI Settings
     */
    uiSettings.register(enterpriseSearchUISettings);

    /**
     * Register routes
     */
    const router = http.createRouter();
    const dependencies: RouteDependencies = {
      config,
      getStartServices,
      globalConfigService: this.globalConfigService,
      licensing,
      log,
      ml,
      router,
    };

    registerConfigDataRoute(dependencies);
    registerEnterpriseSearchRoutes(dependencies);
    // Enterprise Search Routes
    if (config.hasConnectors) registerConnectorRoutes(dependencies);
    registerStatsRoutes(dependencies);

    // Analytics Routes (stand-alone product)
    void getStartServices().then(([coreStart, { data }]) => {
      registerAnalyticsRoutes({ ...dependencies, data, savedObjects: coreStart.savedObjects });
    });

    registerApiKeysRoutes(dependencies);

    /**
     * Bootstrap the routes, saved objects, and collector for telemetry
     */
    savedObjects.registerType(enterpriseSearchTelemetryType);
    savedObjects.registerType(appSearchTelemetryType);
    savedObjects.registerType(workplaceSearchTelemetryType);
    let savedObjectsStarted: SavedObjectsServiceStart;

    void getStartServices().then(([coreStart]) => {
      savedObjectsStarted = coreStart.savedObjects;

      if (usageCollection) {
        registerESTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
        registerCNTelemetryUsageCollector(usageCollection, this.logger);
      }
    });
    registerTelemetryRoute({ ...dependencies, getSavedObjectsService: () => savedObjectsStarted });

    /*
     * Register logs source configuration, used by LogStream components
     * @see https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/logs_shared/public/components/log_stream/log_stream.stories.mdx#with-a-source-configuration
     */
    logsShared.logViews.defineInternalLogView(ENTERPRISE_SEARCH_RELEVANCE_LOGS_SOURCE_ID, {
      logIndices: {
        indexName: 'logs-app_search.search_relevance_suggestions-*',
        type: 'index_name',
      },
      name: 'Enterprise Search Search Relevance Logs',
    });

    logsShared.logViews.defineInternalLogView(ENTERPRISE_SEARCH_AUDIT_LOGS_SOURCE_ID, {
      logIndices: {
        indexName: 'logs-enterprise_search*',
        type: 'index_name',
      },
      name: 'Enterprise Search Audit Logs',
    });

    logsShared.logViews.defineInternalLogView(ENTERPRISE_SEARCH_ANALYTICS_LOGS_SOURCE_ID, {
      logIndices: {
        indexName: 'behavioral_analytics-events-*',
        type: 'index_name',
      },
      name: 'Enterprise Search Behavioral Analytics Logs',
    });

    /**
     * Register a config for the search guide
     */
    if (config.hasWebCrawler) {
      // TODO: Do we remove this guide with the removal of native crawler?
      guidedOnboarding?.registerGuideConfig(websiteSearchGuideId, websiteSearchGuideConfig);
    }
    if (config.hasConnectors) {
      guidedOnboarding?.registerGuideConfig(databaseSearchGuideId, databaseSearchGuideConfig);
    }

    /**
     * Register our integrations in the global search bar
     */

    if (globalSearch) {
      globalSearch.registerResultProvider(
        getSearchResultProvider(config, searchConnectors?.getConnectorTypes() || [], isCloud)
      );
      globalSearch.registerResultProvider(getIndicesSearchResultProvider(http.staticAssets));
      globalSearch.registerResultProvider(getConnectorsSearchResultProvider(http.staticAssets));
    }
  }

  public start() {}

  public stop() {}
}
