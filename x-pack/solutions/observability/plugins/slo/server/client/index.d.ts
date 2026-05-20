import type { ElasticsearchClient, IScopedClusterClient, KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FindSLOParams, FindSLOResponse, GetSLOGroupedStatsParams, GetSLOGroupedStatsResponse, GetSLOParams, GetSLOResponse } from '@kbn/slo-schema';
export interface SloClient {
    getSummaryIndices(): Promise<string[]>;
    getGroupedStats(params: GetSLOGroupedStatsParams): Promise<GetSLOGroupedStatsResponse>;
    findSlos(params: FindSLOParams): Promise<FindSLOResponse>;
    getSlo(sloId: string, params?: GetSLOParams): Promise<GetSLOResponse>;
}
export declare function getSloClientWithRequest({ esClient, scopedClusterClient, soClient, spaceId, logger, }: {
    request: KibanaRequest;
    esClient: ElasticsearchClient;
    scopedClusterClient: IScopedClusterClient;
    soClient: SavedObjectsClientContract;
    spaceId: string;
    logger: Logger;
}): SloClient;
