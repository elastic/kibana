import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { type GetSLOGroupedStatsParams, type GetSLOGroupedStatsResponse } from '@kbn/slo-schema';
import type { SLOSettings } from '../domain/models';
export declare class GetSLOGroupedStats {
    private scopedClusterClient;
    private spaceId;
    private settings;
    constructor(scopedClusterClient: IScopedClusterClient, spaceId: string, settings: SLOSettings);
    execute(params: GetSLOGroupedStatsParams): Promise<GetSLOGroupedStatsResponse>;
    private getConfig;
}
