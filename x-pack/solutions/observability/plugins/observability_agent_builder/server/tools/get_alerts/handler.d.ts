import type { KibanaRequest } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
export declare function getToolHandler({ core, request, start, end, kqlFilter, includeRecovered, fields, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    request: KibanaRequest;
    start: string;
    end: string;
    kqlFilter?: string;
    includeRecovered?: boolean;
    fields?: string[];
}): Promise<{
    alerts: Partial<{}>[];
    total: number;
}>;
