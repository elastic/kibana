import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
export interface RuntimeMetricsNode {
    serviceName: string;
    serviceNodeName: string;
    hostName: string | null | undefined;
    runtime: 'jvm';
    cpuUtilization: number | null;
    heapMemoryBytes: number | null;
    heapMemoryMaxBytes: number | null;
    heapMemoryUtilization: number | null;
    nonHeapMemoryBytes: number | null;
    nonHeapMemoryMaxBytes: number | null;
    nonHeapMemoryUtilization: number | null;
    threadCount: number | null;
    gcDurationMs: number | null;
}
export declare function getToolHandler({ core, plugins, request, logger, serviceName, serviceEnvironment, start, end, limit, kqlFilter, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    request: KibanaRequest;
    logger: Logger;
    serviceName?: string;
    serviceEnvironment?: string;
    start: string;
    end: string;
    limit?: number;
    kqlFilter?: string;
}): Promise<{
    nodes: RuntimeMetricsNode[];
}>;
