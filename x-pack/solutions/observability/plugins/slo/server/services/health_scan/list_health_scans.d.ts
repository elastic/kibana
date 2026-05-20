import type { IScopedClusterClient } from '@kbn/core/server';
import type { ListHealthScanResponse } from '@kbn/slo-schema';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
interface Dependencies {
    scopedClusterClient: IScopedClusterClient;
    taskManager: TaskManagerStartContract;
}
interface Params {
    size?: number;
}
export declare function listHealthScans(params: Params, { scopedClusterClient, taskManager }: Dependencies): Promise<ListHealthScanResponse>;
export {};
