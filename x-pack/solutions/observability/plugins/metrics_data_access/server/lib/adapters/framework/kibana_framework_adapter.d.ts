import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { CoreSetup, IRouter, RequestHandler, RouteMethod, RequestHandlerContext } from '@kbn/core/server';
import type { MetricsDataPluginStartDeps } from '../../../types';
import type { CallWithRequestParams, InfraDatabaseGetIndicesAliasResponse, InfraDatabaseGetIndicesResponse, InfraDatabaseMultiResponse, InfraDatabaseSearchResponse, InfraRouteConfig, InfraVersionedRouteConfig } from './adapter_types';
export declare class KibanaFramework {
    router: IRouter<RequestHandlerContext>;
    private core;
    constructor(core: CoreSetup<MetricsDataPluginStartDeps>, router: IRouter<RequestHandlerContext>);
    registerRoute<Params = any, Query = any, Body = any, Method extends RouteMethod = any>(config: InfraRouteConfig<Params, Query, Body, Method>, handler: RequestHandler<Params, Query, Body, RequestHandlerContext>): void;
    registerVersionedRoute<Method extends RouteMethod = any>(config: InfraVersionedRouteConfig<Method>): import("@kbn/core/packages/http/server").VersionedRoute<"get", RequestHandlerContext>;
    callWithRequest<Hit = {}, Aggregation = undefined>(requestContext: RequestHandlerContext, endpoint: 'search', options?: CallWithRequestParams): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;
    callWithRequest<Hit = {}, Aggregation = undefined>(requestContext: RequestHandlerContext, endpoint: 'msearch', options?: CallWithRequestParams): Promise<InfraDatabaseMultiResponse<Hit, Aggregation>>;
    callWithRequest(requestContext: RequestHandlerContext, endpoint: 'indices.existsAlias', options?: CallWithRequestParams): Promise<boolean>;
    callWithRequest(requestContext: RequestHandlerContext, method: 'indices.getAlias', options?: object): Promise<InfraDatabaseGetIndicesAliasResponse>;
    callWithRequest(requestContext: RequestHandlerContext, method: 'indices.get' | 'ml.getBuckets', options?: object): Promise<InfraDatabaseGetIndicesResponse>;
    callWithRequest(requestContext: RequestHandlerContext, method: 'transport.request', options?: CallWithRequestParams): Promise<unknown>;
    callWithRequest(requestContext: RequestHandlerContext, endpoint: string, options?: CallWithRequestParams): Promise<InfraDatabaseSearchResponse>;
    getIndexPatternsServiceWithRequestContext(requestContext: RequestHandlerContext): Promise<import("@kbn/data-plugin/server").DataViewsCommonService>;
    getIndexPatternsService(savedObjectsClient: SavedObjectsClientContract, elasticsearchClient: ElasticsearchClient): Promise<import("@kbn/data-plugin/server").DataViewsCommonService>;
    private createIndexPatternsService;
}
