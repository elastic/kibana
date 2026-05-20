import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { GetSLOStatsOverviewParams, GetSLOStatsOverviewResponse } from '@kbn/slo-schema';
import type { SLOSettings } from '../domain/models';
export declare class GetSLOStatsOverview {
    private scopedClusterClient;
    private spaceId;
    private logger;
    private rulesClient;
    private racClient;
    private settings;
    constructor(scopedClusterClient: IScopedClusterClient, spaceId: string, logger: Logger, rulesClient: RulesClientApi, racClient: AlertsClient, settings: SLOSettings);
    execute(params: GetSLOStatsOverviewParams): Promise<GetSLOStatsOverviewResponse>;
}
