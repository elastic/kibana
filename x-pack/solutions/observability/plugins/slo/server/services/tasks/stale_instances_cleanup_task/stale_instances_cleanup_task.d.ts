import { type CoreSetup, type LoggerFactory } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
import type { TaskState } from './types';
export declare const TYPE = "slo:stale-instances-cleanup-task";
interface TaskSetupContract {
    taskManager: TaskManagerSetupContract;
    core: CoreSetup;
    logFactory: LoggerFactory;
    config: SLOConfig;
}
export declare class StaleInstancesCleanupTask {
    private logger;
    private config;
    private wasStarted;
    constructor(setupContract: TaskSetupContract);
    private get taskId();
    start(plugins: SLOPluginStartDependencies): Promise<void>;
    runTask(taskInstance: ConcreteTaskInstance, core: CoreSetup, abortController: AbortController): Promise<{
        state: {};
        shouldDeleteTask: boolean;
    } | {
        state: TaskState;
    } | undefined>;
    private parseTaskInstanceState;
}
export {};
