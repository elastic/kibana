/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';

import type { KibanaRequest, Logger, RequestHandlerContext } from '@kbn/core/server';

import type { BuildFlavor } from '@kbn/config';
import { EntityDiscoveryApiKeyType } from '@kbn/entityManager-plugin/server/saved_objects';
import { DEFAULT_SPACE_ID } from '../common/constants';
import type { Immutable } from '../common/endpoint/types';
import type { EndpointAuthz } from '../common/endpoint/types/authz';
import { AppClientFactory } from './client';
import type { ConfigType } from './config';
import type { EndpointAppContextService } from './endpoint/endpoint_app_context_services';
import { AssetInventoryDataClient } from './lib/asset_inventory/asset_inventory_data_client';
import { createDetectionRulesClient } from './lib/detection_engine/rule_management/logic/detection_rules_client/detection_rules_client';
import type { IRuleMonitoringService } from './lib/detection_engine/rule_monitoring';
import { AssetCriticalityDataClient } from './lib/entity_analytics/asset_criticality';
import { getApiKeyManager } from './lib/entity_analytics/entity_store/auth/api_key';
import { EntityStoreDataClient } from './lib/entity_analytics/entity_store/entity_store_data_client';
import { RiskEngineDataClient } from './lib/entity_analytics/risk_engine/risk_engine_data_client';
import { RiskScoreDataClient } from './lib/entity_analytics/risk_score/risk_score_data_client';
import { buildMlAuthz } from './lib/machine_learning/authz';
import type { ProductFeaturesService } from './lib/product_features_service';
import type { SiemMigrationsService } from './lib/siem_migrations/siem_migrations_service';
import { buildFrameworkRequest } from './lib/timeline/utils/common';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginSetupDependencies,
} from './plugin_contract';
import type {
  SecuritySolutionApiRequestHandlerContext,
  SecuritySolutionRequestHandlerContext,
} from './types';

export interface IRequestContextFactory {
  create(
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<SecuritySolutionApiRequestHandlerContext>;
}

interface ConstructorOptions {
  config: ConfigType;
  logger: Logger;
  core: SecuritySolutionPluginCoreSetupDependencies;
  plugins: SecuritySolutionPluginSetupDependencies;
  endpointAppContextService: EndpointAppContextService;
  ruleMonitoringService: IRuleMonitoringService;
  siemMigrationsService: SiemMigrationsService;
  kibanaVersion: string;
  kibanaBranch: string;
  buildFlavor: BuildFlavor;
  productFeaturesService: ProductFeaturesService;
}

export class RequestContextFactory implements IRequestContextFactory {
  private readonly appClientFactory: AppClientFactory;

  constructor(private readonly options: ConstructorOptions) {
    this.appClientFactory = new AppClientFactory();
  }

  public async create(
    context: Omit<SecuritySolutionRequestHandlerContext, 'securitySolution'>,
    request: KibanaRequest
  ): Promise<SecuritySolutionApiRequestHandlerContext> {
    const { options, appClientFactory } = this;
    const {
      config,
      core,
      plugins,
      endpointAppContextService,
      ruleMonitoringService,
      siemMigrationsService,
      productFeaturesService,
    } = options;

    const { lists, ruleRegistry, security } = plugins;

    const [coreStart, startPlugins] = await core.getStartServices();
    const frameworkRequest = await buildFrameworkRequest(context, request);
    const coreContext = await context.core;
    const licensing = await context.licensing;
    const actionsClient = await startPlugins.actions.getActionsClientWithRequest(request);

    const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
      coreContext.savedObjects.client,
      coreContext.elasticsearch.client.asInternalUser,
      request
    );

    const getSpaceId = (): string =>
      startPlugins.spaces?.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID;

    appClientFactory.setup({
      getSpaceId: startPlugins.spaces?.spacesService?.getSpaceId,
      config,
      kibanaVersion: options.kibanaVersion,
      kibanaBranch: options.kibanaBranch,
      buildFlavor: options.buildFlavor,
    });
    const getAppClient = () => appClientFactory.create(request);

    const getAuditLogger = () => security?.audit.asScoped(request);

    // List of endpoint authz for the current request's user. Will be initialized the first
    // time it is requested (see `getEndpointAuthz()` below)
    let endpointAuthz: Immutable<EndpointAuthz>;

    const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

    return {
      core: coreContext,

      getServerBasePath: () => core.http.basePath.serverBasePath,

      getEndpointAuthz: async (): Promise<Immutable<EndpointAuthz>> => {
        if (!endpointAuthz) {
          // eslint-disable-next-line require-atomic-updates
          endpointAuthz = await endpointAppContextService.getEndpointAuthz(request);
        }

        return endpointAuthz;
      },

      getConfig: () => config,

      getFrameworkRequest: () => frameworkRequest,

      getAppClient,

      getSpaceId,

      getRuleDataService: () => ruleRegistry.ruleDataService,

      getRacClient: startPlugins.ruleRegistry.getRacClientWithRequest,

      getAuditLogger,

      getDataViewsService: () => dataViewsService,

      getDetectionRulesClient: memoize(() => {
        const mlAuthz = buildMlAuthz({
          license: licensing.license,
          ml: plugins.ml,
          request,
          savedObjectsClient: coreContext.savedObjects.client,
        });

        return createDetectionRulesClient({
          rulesClient,
          actionsClient,
          savedObjectsClient: coreContext.savedObjects.client,
          mlAuthz,
          experimentalFeatures: config.experimentalFeatures,
          productFeaturesService,
          license: licensing.license,
        });
      }),

      getDetectionEngineHealthClient: memoize(() =>
        ruleMonitoringService.createDetectionEngineHealthClient({
          rulesClient,
          eventLogClient: startPlugins.eventLog.getClient(request),
          currentSpaceId: getSpaceId(),
        })
      ),

      getRuleExecutionLog: memoize(() =>
        ruleMonitoringService.createRuleExecutionLogClientForRoutes({
          savedObjectsClient: coreContext.savedObjects.client,
          eventLogClient: startPlugins.eventLog.getClient(request),
        })
      ),

      getSiemRuleMigrationsClient: memoize(() =>
        siemMigrationsService.createRulesClient({
          request,
          currentUser: coreContext.security.authc.getCurrentUser(),
          spaceId: getSpaceId(),
          dependencies: {
            inferenceClient: startPlugins.inference.getClient({ request }),
            rulesClient,
            actionsClient,
            savedObjectsClient: coreContext.savedObjects.client,
            packageService: startPlugins.fleet?.packageService,
            telemetry: core.analytics,
          },
        })
      ),

      getInferenceClient: memoize(() => startPlugins.inference.getClient({ request })),

      getExceptionListClient: () => {
        if (!lists) {
          return null;
        }

        const username = coreContext.security.authc.getCurrentUser()?.username || 'elastic';
        return lists.getExceptionListClient(coreContext.savedObjects.client, username);
      },

      getInternalFleetServices: memoize(() => endpointAppContextService.getInternalFleetServices()),

      getRiskEngineDataClient: memoize(
        () =>
          new RiskEngineDataClient({
            logger: options.logger,
            kibanaVersion: options.kibanaVersion,
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            namespace: getSpaceId(),
            auditLogger: getAuditLogger(),
          })
      ),
      getRiskScoreDataClient: memoize(
        () =>
          new RiskScoreDataClient({
            logger: options.logger,
            kibanaVersion: options.kibanaVersion,
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            namespace: getSpaceId(),
          })
      ),
      getAssetCriticalityDataClient: memoize(
        () =>
          new AssetCriticalityDataClient({
            logger: options.logger,
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            namespace: getSpaceId(),
            auditLogger: getAuditLogger(),
          })
      ),
      getEntityStoreDataClient: memoize(() => {
        const clusterClient = coreContext.elasticsearch.client;
        const logger = options.logger;

        const soClient = coreContext.savedObjects.getClient({
          includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
        });

        return new EntityStoreDataClient({
          namespace: getSpaceId(),
          clusterClient,
          dataViewsService,
          appClient: getAppClient(),
          logger,
          soClient,
          taskManager: startPlugins.taskManager,
          auditLogger: getAuditLogger(),
          kibanaVersion: options.kibanaVersion,
          config: config.entityAnalytics.entityStore,
          experimentalFeatures: config.experimentalFeatures,
          telemetry: core.analytics,
          apiKeyManager: getApiKeyManager({
            core: coreStart,
            logger,
            security: startPlugins.security,
            encryptedSavedObjects: startPlugins.encryptedSavedObjects,
            request,
            namespace: getSpaceId(),
          }),
        });
      }),
      getAssetInventoryClient: memoize(() => {
        const clusterClient = coreContext.elasticsearch.client;
        const logger = options.logger;
        return new AssetInventoryDataClient({
          clusterClient,
          logger,
          experimentalFeatures: config.experimentalFeatures,
        });
      }),
    };
  }
}
