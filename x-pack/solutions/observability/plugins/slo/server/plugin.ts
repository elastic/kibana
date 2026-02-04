/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES, SavedObjectsClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { LockAcquisitionError, LockManagerService } from '@kbn/lock-manager';
import { AlertsLocatorDefinition, sloFeatureId } from '@kbn/observability-plugin/common';
import { DEPRECATED_ALERTING_CONSUMERS, SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { mapValues } from 'lodash';
import { LOCK_ID_RESOURCE_INSTALLER } from '../common/constants';
import { getSloClientWithRequest } from './client';
import { registerSloUsageCollector } from './lib/collectors/register';
import { registerBurnRateRule } from './lib/rules/register_burn_rate_rule';
import { getSloServerRouteRepository } from './routes/get_slo_server_route_repository';
import { registerServerRoutes } from './routes/register_routes';
import type { SLORoutesDependencies } from './routes/types';
import {
  slo,
  sloSettings,
  SO_SLO_SETTINGS_TYPE,
  SO_SLO_TEMPLATE_TYPE,
  SO_SLO_TYPE,
} from './saved_objects';
import {
  DefaultResourceInstaller,
  DefaultSLODefinitionRepository,
  DefaultSummaryTransformManager,
  DefaultTransformManager,
} from './services';
import { DefaultSLOSettingsRepository } from './services/slo_settings_repository';
import { DefaultSLOTemplateRepository } from './services/slo_template_repository';
import { DefaultSummaryTransformGenerator } from './services/summary_transform_generator/summary_transform_generator';
import { BulkDeleteTask } from './services/tasks/bulk_delete/bulk_delete_task';
import { HealthScanTask } from './services/tasks/health_scan_task/health_scan_task';
import { OrphanSummaryCleanupTask } from './services/tasks/orphan_summary_cleanup_task/orphan_summary_cleanup_task';
import { TempSummaryCleanupTask } from './services/tasks/temp_summary_cleanup_task/temp_summary_cleanup_task';
import { createTransformGenerators } from './services/transform_generators';
import type {
  SLOConfig,
  SLOPluginSetupDependencies,
  SLOPluginStartDependencies,
  SLOServerSetup,
  SLOServerStart,
} from './types';
import { StaleInstancesCleanupTask } from './services/tasks/stale_instances_cleanup_task/stale_instances_cleanup_task';

const sloRuleTypes = [SLO_BURN_RATE_RULE_TYPE_ID];

export class SLOPlugin
  implements
    Plugin<SLOServerSetup, SLOServerStart, SLOPluginSetupDependencies, SLOPluginStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: SLOConfig;
  private readonly isServerless: boolean;
  private readonly isDev: boolean;
  private orphanSummaryCleanupTask?: OrphanSummaryCleanupTask;
  private tempSummaryCleanupTask?: TempSummaryCleanupTask;
  private staleInstancesCleanupTask?: StaleInstancesCleanupTask;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.logger = this.initContext.logger.get();
    this.config = this.initContext.config.get<SLOConfig>();
    this.isServerless = this.initContext.env.packageInfo.buildFlavor === 'serverless';
    this.isDev = this.initContext.env.mode.dev;
  }

  public setup(
    core: CoreSetup<SLOPluginStartDependencies, SLOServerStart>,
    plugins: SLOPluginSetupDependencies
  ): SLOServerSetup {
    const lockManager = new LockManagerService(core, this.logger);
    const alertsLocator = plugins.share.url.locators.create(new AlertsLocatorDefinition());

    const savedObjectTypes = [SO_SLO_TYPE, SO_SLO_SETTINGS_TYPE, SO_SLO_TEMPLATE_TYPE];

    const alertingFeatures = sloRuleTypes.map((ruleTypeId) => ({
      ruleTypeId,
      consumers: [sloFeatureId, ALERTING_FEATURE_ID, ...DEPRECATED_ALERTING_CONSUMERS],
    }));

    plugins.features.registerKibanaFeature({
      id: sloFeatureId,
      name: i18n.translate('xpack.slo.featureRegistry.linkSloTitle', {
        defaultMessage: 'SLOs',
      }),
      order: 1200,
      category: DEFAULT_APP_CATEGORIES.observability,
      app: [sloFeatureId, 'kibana'],
      catalogue: [sloFeatureId, 'observability'],
      alerting: alertingFeatures,
      privileges: {
        all: {
          app: [sloFeatureId, 'kibana'],
          catalogue: [sloFeatureId, 'observability'],
          api: ['slo_write', 'slo_read', 'rac'],
          savedObject: {
            all: savedObjectTypes,
            read: [],
          },
          alerting: {
            rule: {
              all: alertingFeatures,
            },
            alert: {
              all: alertingFeatures,
            },
          },
          ui: ['read', 'write'],
        },
        read: {
          app: [sloFeatureId, 'kibana'],
          catalogue: [sloFeatureId, 'observability'],
          api: ['slo_read', 'rac'],
          savedObject: {
            all: [],
            read: savedObjectTypes,
          },
          alerting: {
            rule: {
              read: alertingFeatures,
            },
            alert: {
              read: alertingFeatures,
            },
          },
          ui: ['read'],
        },
      },
    });

    const { ruleDataService } = plugins.ruleRegistry;

    core.savedObjects.registerType(slo);
    core.savedObjects.registerType(sloSettings);

    registerBurnRateRule(plugins.alerting, core.http.basePath, this.logger, ruleDataService, {
      alertsLocator,
    });

    registerSloUsageCollector(plugins.usageCollection);

    const mappedPlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then(([, pluginStart]) => {
            return pluginStart[key as keyof SLOPluginStartDependencies];
          }),
      };
    }) as SLORoutesDependencies['plugins'];

    registerServerRoutes({
      core,
      dependencies: {
        corePlugins: core,
        plugins: mappedPlugins,
        config: {
          isServerless: this.isServerless,
        },
        getScopedClients: async ({ request, logger }) => {
          const [coreStart, pluginsStart] = await core.getStartServices();

          const internalSoClient = new SavedObjectsClient(
            coreStart.savedObjects.createInternalRepository()
          );

          const soClient = coreStart.savedObjects.getScopedClient(request, {
            includedHiddenTypes: [SO_SLO_TEMPLATE_TYPE],
          });
          const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);

          const [dataViewsService, rulesClient, { id: spaceId }, racClient] = await Promise.all([
            pluginsStart.dataViews.dataViewsServiceFactory(
              soClient,
              scopedClusterClient.asCurrentUser
            ),
            pluginsStart.alerting.getRulesClientWithRequest(request),
            pluginsStart.spaces?.spacesService.getActiveSpace(request) ?? { id: 'default' },
            pluginsStart.ruleRegistry.getRacClientWithRequest(request),
          ]);

          const repository = new DefaultSLODefinitionRepository(soClient, logger);
          const settingsRepository = new DefaultSLOSettingsRepository(soClient);
          const templateRepository = new DefaultSLOTemplateRepository(soClient);

          const transformManager = new DefaultTransformManager(
            createTransformGenerators(spaceId, dataViewsService, this.isServerless),
            scopedClusterClient,
            logger
          );
          const summaryTransformManager = new DefaultSummaryTransformManager(
            new DefaultSummaryTransformGenerator(),
            scopedClusterClient,
            logger
          );

          return {
            scopedClusterClient,
            soClient,
            internalSoClient,
            dataViewsService,
            rulesClient,
            spaceId,
            repository,
            settingsRepository,
            templateRepository,
            transformManager,
            summaryTransformManager,
            racClient,
          };
        },
      },
      logger: this.logger,
      repository: getSloServerRouteRepository({ isServerless: this.isServerless }),
      isDev: this.isDev,
    });

    core
      .getStartServices()
      .then(async ([coreStart, pluginStart]) => {
        const esInternalClient = coreStart.elasticsearch.client.asInternalUser;
        const sloResourceInstaller = new DefaultResourceInstaller(esInternalClient, this.logger);
        await lockManager.withLock(LOCK_ID_RESOURCE_INSTALLER, () =>
          sloResourceInstaller.ensureCommonResourcesInstalled()
        );
      })
      .catch((err) => {
        if (err instanceof LockAcquisitionError) {
          this.logger.debug('Cannot install SLO resources, another process is already doing it');
        }
      });

    this.orphanSummaryCleanupTask = new OrphanSummaryCleanupTask({
      core,
      taskManager: plugins.taskManager,
      logFactory: this.initContext.logger,
      config: this.config,
    });

    this.tempSummaryCleanupTask = new TempSummaryCleanupTask({
      core,
      taskManager: plugins.taskManager,
      logFactory: this.initContext.logger,
      config: this.config,
    });

    this.staleInstancesCleanupTask = new StaleInstancesCleanupTask({
      core,
      taskManager: plugins.taskManager,
      logFactory: this.initContext.logger,
      config: this.config,
    });

    new BulkDeleteTask({
      core,
      taskManager: plugins.taskManager,
      logFactory: this.initContext.logger,
    });

    new HealthScanTask({
      core,
      taskManager: plugins.taskManager,
      logFactory: this.initContext.logger,
      config: this.config,
    });

    return {};
  }

  public start(core: CoreStart, plugins: SLOPluginStartDependencies): SLOServerStart {
    const internalEsClient = core.elasticsearch.client.asInternalUser;

    this.orphanSummaryCleanupTask?.start(plugins).catch(() => {});
    this.tempSummaryCleanupTask?.start(plugins).catch(() => {});
    this.staleInstancesCleanupTask?.start(plugins).catch(() => {});

    return {
      getSloClientWithRequest: async (request: KibanaRequest) => {
        const spaceId =
          (await plugins.spaces?.spacesService.getActiveSpace(request))?.id ?? 'default';

        return getSloClientWithRequest({
          request,
          soClient: core.savedObjects.getScopedClient(request),
          esClient: internalEsClient,
          scopedClusterClient: core.elasticsearch.client.asScoped(request),
          spaceId,
          logger: this.logger,
        });
      },
    };
  }
}
