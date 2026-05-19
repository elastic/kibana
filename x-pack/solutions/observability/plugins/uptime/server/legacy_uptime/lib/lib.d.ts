import type { ElasticsearchClient, SavedObjectsClientContract, KibanaRequest, CoreRequestHandlerContext } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { ESSearchResponse } from '@kbn/es-types';
import type { InspectResponse } from '@kbn/observability-plugin/typings/common';
export type { UMServerLibs } from '../uptime_server';
export interface CountResponse {
    result: {
        body: {
            count: number;
            _shards: {
                total: number;
                successful: number;
                skipped: number;
                failed: number;
            };
        };
    };
    indices: string;
}
export declare class UptimeEsClient {
    isDev: boolean;
    request?: KibanaRequest;
    baseESClient: ElasticsearchClient;
    heartbeatIndices: string;
    isInspectorEnabled?: Promise<boolean | undefined>;
    inspectableEsQueries: InspectResponse;
    uiSettings?: CoreRequestHandlerContext['uiSettings'];
    savedObjectsClient: SavedObjectsClientContract;
    isLegacyAlert?: boolean;
    stackVersion?: string;
    constructor(savedObjectsClient: SavedObjectsClientContract, esClient: ElasticsearchClient, options?: {
        isDev?: boolean;
        uiSettings?: CoreRequestHandlerContext['uiSettings'];
        request?: KibanaRequest;
        heartbeatIndices?: string;
        stackVersion?: string;
    });
    initSettings(): Promise<void>;
    search<DocumentSource extends unknown, TParams extends estypes.SearchRequest>(params: TParams, operationName?: string, index?: string): Promise<{
        body: ESSearchResponse<DocumentSource, TParams>;
    }>;
    count<TParams>(params: TParams): Promise<CountResponse>;
    getSavedObjectsClient(): SavedObjectsClientContract;
    getInspectData(path: string): Promise<{
        _inspect: InspectResponse;
    } | {
        _inspect?: undefined;
    }>;
    getInspectEnabled(): Promise<boolean | undefined>;
    getIndices(): Promise<string>;
}
export declare const shouldAppendSyntheticsIndex: (stackVersion?: string) => boolean;
export declare function createEsParams<T extends estypes.SearchRequest>(params: T): T;
