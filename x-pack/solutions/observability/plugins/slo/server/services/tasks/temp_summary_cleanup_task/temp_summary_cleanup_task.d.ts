import { type CoreSetup, type LoggerFactory } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
export declare const TYPE = "slo:temp-summary-cleanup-task";
export declare const VERSION = "1.0.0";
interface TaskSetupContract {
    taskManager: TaskManagerSetupContract;
    core: CoreSetup;
    logFactory: LoggerFactory;
    config: SLOConfig;
}
export declare class TempSummaryCleanupTask {
    private logger;
    private config;
    private wasStarted;
    constructor(setupContract: TaskSetupContract);
    start(plugins: SLOPluginStartDependencies): Promise<void>;
    private get taskId();
    runTask(taskInstance: ConcreteTaskInstance, core: CoreSetup, abortController: AbortController): Promise<{
        state: {};
        shouldDeleteTask: boolean;
    } | undefined>;
}
export {};
