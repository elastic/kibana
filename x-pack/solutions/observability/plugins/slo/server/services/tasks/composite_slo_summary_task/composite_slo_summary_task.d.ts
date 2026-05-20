import { type CoreSetup, type LoggerFactory } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
export declare const TYPE = "slo:composite-slo-summary-task";
export declare function getCompositeSloSummaryTaskId(): string;
interface TaskSetupContract {
    taskManager: TaskManagerSetupContract;
    core: CoreSetup;
    logFactory: LoggerFactory;
    config: SLOConfig;
}
export declare class CompositeSloSummaryTask {
    private logger;
    private config;
    private wasStarted;
    constructor(setupContract: TaskSetupContract);
    private get taskId();
    start(plugins: SLOPluginStartDependencies): Promise<void>;
    runTask(taskInstance: ConcreteTaskInstance, core: CoreSetup, abortController: AbortController): Promise<{
        state: Record<string, unknown>;
    } | void>;
}
export {};
