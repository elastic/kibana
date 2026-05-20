import { type CoreSetup, type LoggerFactory } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
export declare const HEALTH_SCAN_TASK_TYPE = "slo:health-scan-task";
export declare const HEALTH_SCAN_TASK_VERSION = "1.0.0";
interface TaskSetupContract {
    core: CoreSetup<SLOPluginStartDependencies>;
    logFactory: LoggerFactory;
    taskManager: TaskManagerSetupContract;
    config: SLOConfig;
}
export interface HealthScanTaskState {
    isDone: boolean;
    processed?: number;
    problematic?: number;
    error?: string;
}
export interface HealthScanTaskParams {
    scanId: string;
}
export declare class HealthScanTask {
    private logger;
    private config;
    constructor(setupContract: TaskSetupContract);
}
export {};
