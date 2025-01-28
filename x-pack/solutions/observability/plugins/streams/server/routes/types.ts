/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { StreamsServer } from '../types';
import { AssetService } from '../lib/streams/assets/asset_service';
import { AssetClient } from '../lib/streams/assets/asset_client';
import { StreamsClient } from '../lib/streams/client';

type GetScopedClients = ({
  request,
}: {
  request: KibanaRequest;
}) => Promise<RouteHandlerScopedClients>;

export interface RouteHandlerScopedClients {
  scopedClusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  assetClient: AssetClient;
  streamsClient: StreamsClient;
}

export interface RouteDependencies {
  assets: AssetService;
  server: StreamsServer;
  getScopedClients: GetScopedClients;
}

export type StreamsRouteHandlerResources = RouteDependencies & DefaultRouteHandlerResources;
