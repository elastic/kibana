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
import type { DataViewsService } from '@kbn/data-views-plugin/common/data_views';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server/alert_data_client/alerts_client';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { SLODefinitionRepository, TransformManager } from '../services';
import type { SLOPluginSetupDependencies, SLOPluginStartDependencies } from '../types';
import type { SLOSettingsRepository } from '../services/slo_settings_repository';
import type { SLOTemplateRepository } from '../services/slo_template_repository';

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
  dataViewsService: DataViewsService;
  rulesClient: RulesClientApi;
  racClient: AlertsClient;
  repository: SLODefinitionRepository;
  settingsRepository: SLOSettingsRepository;
  templateRepository: SLOTemplateRepository;
  transformManager: TransformManager;
  summaryTransformManager: TransformManager;
}

export interface SLORoutesDependencies {
  plugins: {
    [key in keyof SLOPluginSetupDependencies]: {
      setup: Required<SLOPluginSetupDependencies>[key];
    };
  } & {
    [key in keyof SLOPluginStartDependencies]: {
      start: () => Promise<Required<SLOPluginStartDependencies>[key]>;
    };
  };
  corePlugins: CoreSetup;
  getScopedClients: GetScopedClients;
  config: {
    isServerless: boolean;
  };
}

export type SLORouteHandlerResources = SLORoutesDependencies & DefaultRouteHandlerResources;
