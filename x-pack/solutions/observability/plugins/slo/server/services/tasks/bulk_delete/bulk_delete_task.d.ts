import { type CoreSetup, type LoggerFactory } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { SLOPluginStartDependencies } from '../../../types';
export declare const TYPE = "slo:bulk-delete-task";
interface TaskSetupContract {
    core: CoreSetup<SLOPluginStartDependencies>;
    logFactory: LoggerFactory;
    taskManager: TaskManagerSetupContract;
}
export declare class BulkDeleteTask {
    private logger;
    constructor(setupContract: TaskSetupContract);
}
export {};
