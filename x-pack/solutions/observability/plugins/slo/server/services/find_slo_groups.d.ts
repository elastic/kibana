import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { FindSLOGroupsParams, FindSLOGroupsResponse } from '@kbn/slo-schema';
import type { SLOSettings } from '../domain/models';
export declare class FindSLOGroups {
    private scopedClusterClient;
    private settings;
    private logger;
    private spaceId;
    constructor(scopedClusterClient: IScopedClusterClient, settings: SLOSettings, logger: Logger, spaceId: string);
    execute(params: FindSLOGroupsParams): Promise<FindSLOGroupsResponse>;
}
