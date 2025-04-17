/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CoreSetup,
  IScopedClusterClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { DataViewsService } from '@kbn/data-views-plugin/common/data_views';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import { SLOPluginSetupDependencies, SLOPluginStartDependencies } from '../types';
import { SLORepository, TransformManager } from '../services';

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
  repository: SLORepository;
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
