import type { KibanaRequest } from '@kbn/core/server';
import type { PostHealthScanResponse } from '@kbn/slo-schema';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
interface Dependencies {
    taskManager: TaskManagerStartContract;
    request: KibanaRequest;
}
interface Params {
    force?: boolean;
}
export declare function scheduleHealthScan(params: Params, { taskManager, request }: Dependencies): Promise<PostHealthScanResponse>;
export {};
