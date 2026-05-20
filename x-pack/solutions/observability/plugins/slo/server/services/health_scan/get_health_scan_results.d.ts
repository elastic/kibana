import type { IScopedClusterClient } from '@kbn/core/server';
import type { GetHealthScanResultsResponse } from '@kbn/slo-schema';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
interface Dependencies {
    scopedClusterClient: IScopedClusterClient;
    taskManager: TaskManagerStartContract;
    spaceId: string;
}
interface Params {
    scanId: string;
    size?: number;
    problematic?: boolean;
    allSpaces?: boolean;
    searchAfter?: string;
}
export declare function getHealthScanResults(params: Params, { scopedClusterClient, taskManager, spaceId }: Dependencies): Promise<GetHealthScanResultsResponse>;
export {};
