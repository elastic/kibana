import { type CoreSetup, type LoggerFactory } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
export declare const TYPE = "SLO:ORPHAN_SUMMARIES-CLEANUP-TASK";
interface TaskSetupContract {
    taskManager: TaskManagerSetupContract;
    core: CoreSetup;
    logFactory: LoggerFactory;
    config: SLOConfig;
}
export declare class OrphanSummaryCleanupTask {
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
        state: {
            searchAfter: import("@elastic/elasticsearch/lib/api/types").AggregationsCompositeAggregateKey | undefined;
        };
    } | undefined>;
    private parseTaskInstanceState;
}
export {};
