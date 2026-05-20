import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ProfilingESClient } from '../../../common/profiling_es_client';
interface Params {
    client: ProfilingESClient;
    sampleSize: number;
    durationSeconds: number;
    co2PerKWH: number;
    datacenterPUE: number;
    pervCPUWattX86: number;
    pervCPUWattArm64: number;
    awsCostDiscountRate: number;
    costPervCPUPerHour: number;
    azureCostDiscountRate: number;
    showErrorFrames: boolean;
    indices?: string[];
    stacktraceIdsField?: string;
    query: QueryDslQueryContainer;
}
export declare function searchStackTraces({ client, sampleSize, durationSeconds, co2PerKWH, datacenterPUE, pervCPUWattX86, pervCPUWattArm64, awsCostDiscountRate, costPervCPUPerHour, azureCostDiscountRate, showErrorFrames, indices, query, stacktraceIdsField, }: Params): Promise<import("@kbn/profiling-utils").DecodedStackTraceResponse>;
export {};
