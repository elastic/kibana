/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type {
  CoreSetup,
  IScopedClusterClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common/data_views';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server/alert_data_client/alerts_client';
import { getScopedClusterClientWithInspect } from './inspect/create_inspectable_scoped_cluster_client';
import { SO_SLO_COMPOSITE_TYPE, SO_SLO_TEMPLATE_TYPE } from '../saved_objects';
import type {
  SLOPluginSetupDependencies,
  SLOPluginStartDependencies,
  SLOServerStart,
} from '../types';
import { DefaultCompositeSLORepository } from '../services/composites/composite_slo_repository';
import type { CompositeSLORepository } from '../services/composites/composite_slo_repository';
import { DefaultSLODefinitionRepository } from '../services/slo_definition_repository';
import type { SLODefinitionRepository } from '../services/slo_definition_repository';
import type { TransformManager } from '../services/transform_manager';
import { DefaultSLOSettingsRepository } from '../services/slo_settings_repository';
import type { SLOSettingsRepository } from '../services/slo_settings_repository';
import { DefaultSLOTemplateRepository } from '../services/slo_template_repository';
import type { SLOTemplateRepository } from '../services/slo_template_repository';
import { DefaultSummaryTransformManager } from '../services/summay_transform_manager';
import { DefaultSummaryTransformGenerator } from '../services/summary_transform_generator/summary_transform_generator';
import { createTransformGenerators } from '../services/transform_generators';
import { DefaultTransformManager } from '../services/transform_manager';

export type GetScopedClients = ({
  request,
  logger,
}: {
  request: KibanaRequest;
  logger: Logger;
}) => Promise<RouteHandlerScopedClients>;

export interface RouteHandlerScopedClients {
  scopedClusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  internalSoClient: SavedObjectsClientContract;
  spaceId: string;
  isCpsAvailable: boolean;
  dataViewsService: DataViewsService;
  rulesClient: RulesClientApi;
  racClient: AlertsClient;
  repository: SLODefinitionRepository;
  compositeRepository: CompositeSLORepository;
  settingsRepository: SLOSettingsRepository;
  templateRepository: SLOTemplateRepository;
  transformManager: TransformManager;
  summaryTransformManager: TransformManager;
}

export const createGetScopedClients = ({
  core,
  plugins,
  config,
}: {
  core: CoreSetup<SLOPluginStartDependencies, SLOServerStart>;
  plugins: SLOPluginSetupDependencies;
  config: { isDev: boolean; isServerless: boolean; getIsCpsEnabled: () => boolean };
}): GetScopedClients => {
  return async ({ request, logger }) => {
    const [coreStart, pluginsStart] = await core.getStartServices();

    const internalSoClient = new SavedObjectsClient(
      coreStart.savedObjects.createInternalRepository()
    );

    const soClient = coreStart.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [SO_SLO_TEMPLATE_TYPE, SO_SLO_COMPOSITE_TYPE],
    });
    const rawScopedClusterClient = coreStart.elasticsearch.client.asScoped(request);

    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);

    const scopedClusterClient = await getScopedClusterClientWithInspect({
      scopedClusterClient: rawScopedClusterClient,
      uiSettingsClient,
      request,
      isDev: config.isDev,
    });

    const [dataViewsService, rulesClient, { id: spaceId }, racClient, isCpsAvailable] =
      await Promise.all([
        pluginsStart.dataViews.dataViewsServiceFactory(soClient, scopedClusterClient.asCurrentUser),
        pluginsStart.alerting.getRulesClientWithRequest(request),
        pluginsStart.spaces?.spacesService.getActiveSpace(request) ?? { id: 'default' },
        pluginsStart.ruleRegistry.getRacClientWithRequest(request),
        config.getIsCpsEnabled() ? plugins.cps?.isTierEligible() ?? false : false,
      ]);

    const repository = new DefaultSLODefinitionRepository(soClient, logger);
    const compositeRepository = new DefaultCompositeSLORepository(soClient, logger);
    const settingsRepository = new DefaultSLOSettingsRepository(soClient);
    const templateRepository = new DefaultSLOTemplateRepository(soClient);

    const transformManager = new DefaultTransformManager(
      createTransformGenerators(spaceId, dataViewsService, config.isServerless, isCpsAvailable),
      scopedClusterClient,
      logger
    );
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(config.isServerless, isCpsAvailable),
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
      isCpsAvailable,
      repository,
      compositeRepository,
      settingsRepository,
      templateRepository,
      transformManager,
      summaryTransformManager,
      racClient,
    };
  };
};
