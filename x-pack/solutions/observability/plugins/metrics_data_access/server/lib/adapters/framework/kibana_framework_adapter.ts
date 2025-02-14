/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportRequestParams } from '@elastic/elasticsearch';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  CoreSetup,
  IRouter,
  RequestHandler,
  RouteMethod,
  RequestHandlerContext,
} from '@kbn/core/server';
import { UI_SETTINGS } from '@kbn/data-plugin/server';
import type { MetricsDataPluginStartDeps } from '../../../types';
import type {
  CallWithRequestParams,
  InfraDatabaseGetIndicesAliasResponse,
  InfraDatabaseGetIndicesResponse,
  InfraDatabaseMultiResponse,
  InfraDatabaseSearchResponse,
  InfraRouteConfig,
  InfraVersionedRouteConfig,
} from './adapter_types';

interface FrozenIndexParams {
  ignore_throttled?: boolean;
}

export class KibanaFramework {
  public router: IRouter<RequestHandlerContext>;
  private core: CoreSetup<MetricsDataPluginStartDeps>;

  constructor(core: CoreSetup<MetricsDataPluginStartDeps>, router: IRouter<RequestHandlerContext>) {
    this.router = router;
    this.core = core;
  }

  public registerRoute<Params = any, Query = any, Body = any, Method extends RouteMethod = any>(
    config: InfraRouteConfig<Params, Query, Body, Method>,
    handler: RequestHandler<Params, Query, Body, RequestHandlerContext>
  ) {
    const routeConfig = {
      path: config.path,
      validate: config.validate,
      security: {
        authz: { requiredPrivileges: ['infra'] },
      },
    };
    switch (config.method) {
      case 'get':
        this.router.get(routeConfig, handler);
        break;
      case 'post':
        this.router.post(routeConfig, handler);
        break;
      case 'delete':
        this.router.delete(routeConfig, handler);
        break;
      case 'put':
        this.router.put(routeConfig, handler);
        break;
      case 'patch':
        this.router.patch(routeConfig, handler);
        break;
    }
  }

  public registerVersionedRoute<Method extends RouteMethod = any>(
    config: InfraVersionedRouteConfig<Method>
  ) {
    const routeConfig = {
      access: config.access,
      path: config.path,
      security: {
        authz: {
          requiredPrivileges: ['infra'],
        },
      },
    };
    switch (config.method) {
      case 'get':
        return this.router.versioned.get(routeConfig);
      case 'post':
        return this.router.versioned.post(routeConfig);
      case 'delete':
        return this.router.versioned.delete(routeConfig);
      case 'put':
        return this.router.versioned.put(routeConfig);
      case 'patch':
        return this.router.versioned.patch(routeConfig);
      default:
        throw new RangeError(
          `#registerVersionedRoute: "${config.method}" is not an accepted method`
        );
    }
  }

  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: RequestHandlerContext,
    endpoint: 'search',
    options?: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: RequestHandlerContext,
    endpoint: 'msearch',
    options?: CallWithRequestParams
  ): Promise<InfraDatabaseMultiResponse<Hit, Aggregation>>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: 'indices.existsAlias',
    options?: CallWithRequestParams
  ): Promise<boolean>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    method: 'indices.getAlias',
    options?: object
  ): Promise<InfraDatabaseGetIndicesAliasResponse>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    method: 'indices.get' | 'ml.getBuckets',
    options?: object
  ): Promise<InfraDatabaseGetIndicesResponse>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    method: 'transport.request',
    options?: CallWithRequestParams
  ): Promise<unknown>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: string,
    options?: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse>;
  public async callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: string,
    params: CallWithRequestParams
  ) {
    const { elasticsearch, uiSettings } = await requestContext.core;

    const includeFrozen = await uiSettings.client.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
    if (endpoint === 'msearch') {
      const maxConcurrentShardRequests = await uiSettings.client.get(
        UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS
      );
      if (maxConcurrentShardRequests > 0) {
        params = { ...params, max_concurrent_shard_requests: maxConcurrentShardRequests };
      }
    }

    // Only set the "ignore_throttled" value (to false) if the Kibana setting
    // for "search:includeFrozen" is true (i.e. don't ignore throttled indices, a triple negative!)
    // More information:
    // - https://github.com/elastic/kibana/issues/113197
    // - https://github.com/elastic/elasticsearch/pull/77479
    //
    // NOTE: these params only need to be spread onto the search and msearch calls below
    const frozenIndicesParams: FrozenIndexParams = {};
    if (includeFrozen) {
      frozenIndicesParams.ignore_throttled = false;
    }

    let apiResult;
    switch (endpoint) {
      case 'search':
        apiResult = elasticsearch.client.asCurrentUser.search({
          ...params,
          ...frozenIndicesParams,
        });
        break;
      case 'msearch':
        apiResult = elasticsearch.client.asCurrentUser.msearch({
          ...params,
          ...frozenIndicesParams,
        } as estypes.MsearchRequest);
        break;
      case 'indices.existsAlias':
        apiResult = elasticsearch.client.asCurrentUser.indices.existsAlias({
          ...params,
        } as estypes.IndicesExistsAliasRequest);
        break;
      case 'indices.getAlias':
        apiResult = elasticsearch.client.asCurrentUser.indices.getAlias({
          ...params,
        });
        break;
      case 'indices.get':
        apiResult = elasticsearch.client.asCurrentUser.indices.get({
          ...params,
        } as estypes.IndicesGetRequest);
        break;
      case 'transport.request':
        apiResult = elasticsearch.client.asCurrentUser.transport.request({
          ...params,
        } as TransportRequestParams);
        break;
      case 'ml.getBuckets':
        apiResult = elasticsearch.client.asCurrentUser.ml.getBuckets({
          ...params,
        } as estypes.MlGetBucketsRequest);
        break;
    }
    return apiResult ? await apiResult : undefined;
  }

  public async getIndexPatternsServiceWithRequestContext(requestContext: RequestHandlerContext) {
    const { savedObjects, elasticsearch } = await requestContext.core;
    return await this.createIndexPatternsService(
      savedObjects.client,
      elasticsearch.client.asCurrentUser
    );
  }

  public async getIndexPatternsService(
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ) {
    return await this.createIndexPatternsService(savedObjectsClient, elasticsearchClient);
  }

  private async createIndexPatternsService(
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ) {
    const [, startPlugins] = await this.core.getStartServices();
    return startPlugins.data.indexPatterns.dataViewsServiceFactory(
      savedObjectsClient,
      elasticsearchClient
    );
  }
}
