/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Server } from '@hapi/hapi';
import type { CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { GetMetricIndicesOptions } from '@kbn/metrics-data-access-plugin/server';
import {
  AssetDetailsLocatorDefinition,
  InventoryLocatorDefinition,
  MetricsExplorerLocatorDefinition,
} from '@kbn/observability-shared-plugin/common';
import { type AlertsLocatorParams, alertsLocatorID } from '@kbn/observability-plugin/common';
import { mapValues } from 'lodash';
import type { DataViewsServerPluginStart } from '@kbn/data-plugin/server';
import type { LogsSharedPluginStart } from '@kbn/logs-shared-plugin/server';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import { DEFAULT_LOG_VIEW } from '@kbn/logs-shared-plugin/common';
import { LOGS_FEATURE_ID, METRICS_FEATURE_ID } from '../common/constants';
import { LOGS_FEATURE, METRICS_FEATURE } from './features';
import { registerRoutes } from './infra_server';
import type {
  InfraServerPluginSetupDeps,
  InfraServerPluginStartDeps,
} from './lib/adapters/framework';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { KibanaMetricsAdapter } from './lib/adapters/metrics/kibana_metrics_adapter';
import { InfraElasticsearchSourceStatusAdapter } from './lib/adapters/source_status';
import { registerRuleTypes } from './lib/alerting';
import {
  LOGS_RULES_ALERT_CONTEXT,
  METRICS_RULES_ALERT_CONTEXT,
} from './lib/alerting/register_rule_types';
import { InfraMetricsDomain } from './lib/domains/metrics_domain';
import type { InfraBackendLibs, InfraDomainLibs } from './lib/infra_types';
import { infraSourceConfigurationSavedObjectType, InfraSources } from './lib/sources';
import { InfraSourceStatus } from './lib/source_status';
import {
  infraCustomDashboardsSavedObjectType,
  inventoryViewSavedObjectType,
  metricsExplorerViewSavedObjectType,
} from './saved_objects';
import { InventoryViewsService } from './services/inventory_views';
import { MetricsExplorerViewsService } from './services/metrics_explorer_views';
import { RulesService } from './services/rules';
import type {
  InfraConfig,
  InfraPluginCoreSetup,
  InfraPluginRequestHandlerContext,
  InfraPluginSetup,
  InfraPluginStart,
} from './types';
import { UsageCollector } from './usage/usage_collector';
import { mapSourceToLogView } from './utils/map_source_to_log_view';

export interface KbnServer extends Server {
  usage: any;
}

const logsSampleDataLinkLabel = i18n.translate('xpack.infra.sampleDataLinkLabel', {
  defaultMessage: 'Logs',
});

export class InfraServerPlugin
  implements
    Plugin<
      InfraPluginSetup,
      InfraPluginStart,
      InfraServerPluginSetupDeps,
      InfraServerPluginStartDeps
    >
{
  public config: InfraConfig;
  public libs!: InfraBackendLibs;
  public logger: Logger;

  private logsRules: RulesService;
  private metricsRules: RulesService;
  private inventoryViews: InventoryViewsService;
  private metricsExplorerViews?: MetricsExplorerViewsService;

  constructor(context: PluginInitializerContext<InfraConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();

    this.logsRules = new RulesService(
      LOGS_FEATURE_ID,
      LOGS_RULES_ALERT_CONTEXT,
      this.logger.get('logsRules')
    );
    this.metricsRules = new RulesService(
      METRICS_FEATURE_ID,
      METRICS_RULES_ALERT_CONTEXT,
      this.logger.get('metricsRules')
    );

    this.inventoryViews = new InventoryViewsService(this.logger.get('inventoryViews'));
    this.metricsExplorerViews = this.config.featureFlags.metricsExplorerEnabled
      ? new MetricsExplorerViewsService(this.logger.get('metricsExplorerViews'))
      : undefined;
  }

  private async createDefaultDataViewsForObsRules(
    core: CoreStart,
    dataViews: DataViewsServerPluginStart,
    logsShared: LogsSharedPluginStart,
    logsDataAccess: LogsDataAccessPluginStart
  ) {
    const LOG_RULES_DATA_VIEW_ID = 'log_rules_data_view';
    const METRIC_RULES_DATA_VIEW_ID = 'infra_rules_data_view';

    const LOG_RULES_DATA_VIEW_NAME = 'Log Threshold Alerting Rule Source';
    const METRIC_RULES_DATA_VIEW_NAME = 'Metric AND Inventory Threshold Alerting Rule Source';

    const override = false;
    const skipFetchFields = false;
    const displayErrors = true;
    const setAsDefault = false;

    const savedObjectsClient = core.savedObjects.createInternalRepository();
    const esClient = core.elasticsearch.client.asInternalUser;

    const dataViewsService = await dataViews.dataViewsServiceFactory(
      savedObjectsClient,
      esClient,
      undefined,
      true
    );

    // get log indices
    const logSourcesService =
      logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(savedObjectsClient);

    const { indices: logIndices, timestampField } = await logsShared.logViews
      .getClient(savedObjectsClient, core.elasticsearch.client.asInternalUser, logSourcesService)
      .getResolvedLogView(DEFAULT_LOG_VIEW);

    // create default data view for Log threshold rules
    const logDataViewExists = await dataViewsService.get(LOG_RULES_DATA_VIEW_ID).catch(() => false);

    if (!logDataViewExists) {
      await dataViewsService.createAndSave(
        {
          allowNoIndex: false,
          name: LOG_RULES_DATA_VIEW_NAME,
          title: logIndices,
          id: LOG_RULES_DATA_VIEW_ID,
          timeFieldName: timestampField,
        },
        override,
        skipFetchFields,
        displayErrors,
        setAsDefault
      );
    }

    // get metric indices
    const metricsClient = this.libs.plugins.metricsDataAccess.setup.client;
    const metricIndices = await metricsClient.getMetricIndices({ savedObjectsClient });

    // create default data view for Metric and Inventory threshold rules
    const metricDataViewExists = await dataViewsService
      .get(METRIC_RULES_DATA_VIEW_ID)
      .catch(() => false);

    if (!metricDataViewExists) {
      await dataViewsService.createAndSave(
        {
          allowNoIndex: false,
          name: METRIC_RULES_DATA_VIEW_NAME,
          title: metricIndices,
          id: METRIC_RULES_DATA_VIEW_ID,
          timeFieldName: '@timestamp',
        },
        override,
        skipFetchFields,
        displayErrors,
        setAsDefault
      );
    }
  }

  setup(core: InfraPluginCoreSetup, plugins: InfraServerPluginSetupDeps) {
    const framework = new KibanaFramework(core, this.config, plugins);

    const metricsClient = plugins.metricsDataAccess.client;
    metricsClient.setDefaultMetricIndicesHandler(async (options: GetMetricIndicesOptions) => {
      const sourceConfiguration = await sources.getInfraSourceConfiguration(
        options.savedObjectsClient,
        'default'
      );
      return sourceConfiguration.configuration.metricAlias;
    });
    const sources = new InfraSources({
      metricsClient,
    });

    const sourceStatus = new InfraSourceStatus(
      new InfraElasticsearchSourceStatusAdapter(framework),
      { sources }
    );

    const alertsLocator = plugins.share.url.locators.get<AlertsLocatorParams>(alertsLocatorID);
    const assetDetailsLocator = plugins.share.url.locators.create(
      new AssetDetailsLocatorDefinition()
    );
    const metricsExplorerLocator = plugins.share.url.locators.create(
      new MetricsExplorerLocatorDefinition()
    );
    const inventoryLocator = plugins.share.url.locators.create(new InventoryLocatorDefinition());

    // Setup infra services
    const inventoryViews = this.inventoryViews.setup();
    const metricsExplorerViews = this.metricsExplorerViews?.setup();

    // Register saved object types
    core.savedObjects.registerType(infraSourceConfigurationSavedObjectType);
    core.savedObjects.registerType(inventoryViewSavedObjectType);
    core.savedObjects.registerType(infraCustomDashboardsSavedObjectType);
    if (this.config.featureFlags.metricsExplorerEnabled) {
      core.savedObjects.registerType(metricsExplorerViewSavedObjectType);
    }

    // TODO: separate these out individually and do away with "domains" as a temporary group
    // and make them available via the request context so we can do away with
    // the wrapper classes
    const domainLibs: InfraDomainLibs = {
      logEntries: plugins.logsShared.logEntries,
      metrics: new InfraMetricsDomain(new KibanaMetricsAdapter(framework)),
    };

    // Instead of passing plugins individually to `libs` on a necessity basis,
    // this provides an object with all plugins infra depends on
    const libsPlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[key as keyof InfraServerPluginStartDeps];
          }),
      };
    }) as InfraBackendLibs['plugins'];

    this.libs = {
      configuration: this.config,
      framework,
      sources,
      sourceStatus,
      ...domainLibs,
      handleEsError,
      logsRules: this.logsRules.setup(core, plugins),
      metricsRules: this.metricsRules.setup(core, plugins),
      getStartServices: () => core.getStartServices(),
      getAlertDetailsConfig: () => plugins.observability.getAlertDetailsConfig(),
      logger: this.logger,
      basePath: core.http.basePath,
      plugins: libsPlugins,
    };

    plugins.features.registerKibanaFeature(METRICS_FEATURE);
    plugins.features.registerKibanaFeature(LOGS_FEATURE);

    // Register an handler to retrieve the fallback logView starting from a source configuration
    plugins.logsShared.logViews.registerLogViewFallbackHandler(async (sourceId, { soClient }) => {
      const sourceConfiguration = await sources.getInfraSourceConfiguration(soClient, sourceId);
      return mapSourceToLogView(sourceConfiguration);
    });
    plugins.logsShared.logViews.setLogViewsStaticConfig({
      messageFields: this.config.sources?.default?.fields?.message,
    });

    plugins.logsShared.registerUsageCollectorActions({
      countLogs: () => UsageCollector.countLogs(),
    });

    if (this.config.featureFlags.logsUIEnabled) {
      plugins.home.sampleData.addAppLinksToSampleDataset('logs', [
        {
          sampleObject: null, // indicates that there is no sample object associated with this app link's path
          getPath: () => `/app/logs`,
          label: logsSampleDataLinkLabel,
          icon: 'logsApp',
        },
      ]);
    }

    registerRuleTypes(plugins.alerting, this.libs, this.config, {
      alertsLocator,
      assetDetailsLocator,
      metricsExplorerLocator,
      inventoryLocator,
    });

    core.http.registerRouteHandlerContext<InfraPluginRequestHandlerContext, 'infra'>(
      'infra',
      async (context, request) => {
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;
        const uiSettingsClient = coreContext.uiSettings.client;
        const entityManager = await this.libs.plugins.entityManager.start();

        const mlSystem = plugins.ml?.mlSystemProvider(request, savedObjectsClient);
        const mlAnomalyDetectors = plugins.ml?.anomalyDetectorsProvider(
          request,
          savedObjectsClient
        );
        const spaceId = plugins.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

        const getMetricsIndices = async () => {
          return metricsClient.getMetricIndices({
            savedObjectsClient,
          });
        };

        return {
          mlAnomalyDetectors,
          mlSystem,
          spaceId,
          savedObjectsClient,
          uiSettingsClient,
          getMetricsIndices,
          entityManager,
        };
      }
    );

    // Telemetry
    UsageCollector.registerUsageCollector(plugins.usageCollection);

    return {
      inventoryViews,
      metricsExplorerViews,
    } as InfraPluginSetup;
  }

  start(core: CoreStart, { dataViews, logsShared, logsDataAccess }: InfraServerPluginStartDeps) {
    const inventoryViews = this.inventoryViews.start({
      infraSources: this.libs.sources,
      savedObjects: core.savedObjects,
    });

    const metricsExplorerViews = this.metricsExplorerViews?.start({
      infraSources: this.libs.sources,
      savedObjects: core.savedObjects,
    });

    this.createDefaultDataViewsForObsRules(core, dataViews, logsShared, logsDataAccess).catch(
      () => {}
    );

    registerRoutes(this.libs);

    return {
      inventoryViews,
      metricsExplorerViews,
    };
  }

  stop() {}
}
