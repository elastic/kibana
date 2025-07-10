/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import {
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
  SavedObjectsClient,
} from '@kbn/core/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { AlertsLocatorDefinition, sloFeatureId } from '@kbn/observability-plugin/common';
import { SLO_BURN_RATE_RULE_TYPE_ID, DEPRECATED_ALERTING_CONSUMERS } from '@kbn/rule-data-utils';
import { mapValues } from 'lodash';
import { LockAcquisitionError, LockManagerService } from '@kbn/lock-manager';
import { getSloClientWithRequest } from './client';
import { registerSloUsageCollector } from './lib/collectors/register';
import { registerBurnRateRule } from './lib/rules/register_burn_rate_rule';
import { getSloServerRouteRepository } from './routes/get_slo_server_route_repository';
import { registerServerRoutes } from './routes/register_routes';
import { SLORoutesDependencies } from './routes/types';
import { SO_SLO_TYPE, slo } from './saved_objects';
import { SO_SLO_SETTINGS_TYPE, sloSettings } from './saved_objects/slo_settings';
import {
  DefaultResourceInstaller,
  DefaultSummaryTransformManager,
  DefaultTransformManager,
  KibanaSavedObjectsSLORepository,
} from './services';
import { DefaultSummaryTransformGenerator } from './services/summary_transform_generator/summary_transform_generator';
import { BulkDeleteTask } from './services/tasks/bulk_delete/bulk_delete_task';
import { SloOrphanSummaryCleanupTask } from './services/tasks/orphan_summary_cleanup_task';
import { TempSummaryCleanupTask } from './services/tasks/temp_summary_cleanup_task';
import { createTransformGenerators } from './services/transform_generators';
import type {
  SLOConfig,
  SLOPluginSetupDependencies,
  SLOPluginStartDependencies,
  SLOServerSetup,
  SLOServerStart,
} from './types';
import { LOCK_ID_RESOURCE_INSTALLER } from '../common/constants';

const sloRuleTypes = [SLO_BURN_RATE_RULE_TYPE_ID];

export class SLOPlugin
  implements
    Plugin<SLOServerSetup, SLOServerStart, SLOPluginSetupDependencies, SLOPluginStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: SLOConfig;
  private readonly isServerless: boolean;
  private readonly isDev: boolean;
  private sloOrphanCleanupTask?: SloOrphanSummaryCleanupTask;
  private tempSummaryCleanupTask?: TempSummaryCleanupTask;

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

    const savedObjectTypes = [SO_SLO_TYPE, SO_SLO_SETTINGS_TYPE];

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
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
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
          const soClient = coreStart.savedObjects.getScopedClient(request);
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

          const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

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

    this.sloOrphanCleanupTask = new SloOrphanSummaryCleanupTask(
      plugins.taskManager,
      this.logger,
      this.config
    );

    this.tempSummaryCleanupTask = new TempSummaryCleanupTask({
      core,
      taskManager: plugins.taskManager,
      logFactory: this.initContext.logger,
      config: this.config,
    });

    new BulkDeleteTask({
      core,
      plugins: mappedPlugins,
      logFactory: this.initContext.logger,
    });

    return {};
  }

  public start(core: CoreStart, plugins: SLOPluginStartDependencies): SLOServerStart {
    const internalSoClient = new SavedObjectsClient(core.savedObjects.createInternalRepository());
    const internalEsClient = core.elasticsearch.client.asInternalUser;

    this.sloOrphanCleanupTask
      ?.start(plugins.taskManager, internalSoClient, internalEsClient)
      .catch(() => {});

    this.tempSummaryCleanupTask?.start(plugins).catch(() => {});

    return {
      getSloClientWithRequest: (request: KibanaRequest) => {
        return getSloClientWithRequest({
          request,
          soClient: core.savedObjects.getScopedClient(request),
          esClient: internalEsClient,
        });
      },
    };
  }
}
