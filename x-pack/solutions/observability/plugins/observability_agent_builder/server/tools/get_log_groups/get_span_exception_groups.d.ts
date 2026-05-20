import type { Logger } from '@kbn/core/server';
import type { ApmEventClient } from './types';
export type SpanExceptionSample = Awaited<ReturnType<typeof getSpanExceptionSamples>>[number];
export declare function getSpanExceptionGroups({ apmEventClient, startMs, endMs, kqlFilter, includeFirstSeen, size, logger, fields, }: {
    apmEventClient: ApmEventClient;
    startMs: number;
    endMs: number;
    kqlFilter: string | undefined;
    includeFirstSeen: boolean;
    size: number;
    logger: Logger;
    fields: string[];
}): Promise<{
    firstSeen?: string | undefined;
    count: number;
    lastSeen: string | undefined;
    sample: {
        [key: string]: unknown;
        "error.grouping_key": string;
    };
    type: "spanException";
}[]>;
declare function getSpanExceptionSamples({ apmEventClient, startMs, endMs, kqlFilter, size, logger, fields, }: {
    apmEventClient: ApmEventClient;
    startMs: number;
    endMs: number;
    kqlFilter: string | undefined;
    size: number;
    logger: Logger;
    fields: string[];
}): Promise<{
    count: number;
    lastSeen: string | undefined;
    sample: {
        [key: string]: unknown;
        "error.grouping_key": string;
    };
}[]>;
export {};
