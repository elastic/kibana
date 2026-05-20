import type { CloudStart } from '@kbn/cloud-plugin/server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { ProfilingESClient } from '../../common/profiling_es_client';
export interface RegisterServicesParams {
    createProfilingEsClient: (params: {
        esClient: ElasticsearchClient;
        useDefaultAuth?: boolean;
    }) => ProfilingESClient;
    logger: Logger;
    deps: {
        fleet?: FleetStartContract;
        cloud?: CloudStart;
    };
}
export declare function registerServices(params: RegisterServicesParams): {
    fetchFlamechartData: ({ core, esClient, indices, stacktraceIdsField, query, totalSeconds, }: import("./fetch_flamechart").FetchFlamechartParams) => Promise<{
        TotalSeconds: number;
        Size: number;
        Edges: number[][];
        FileID: string[];
        FrameType: number[];
        Inline: boolean[];
        ExeFilename: string[];
        AddressOrLine: number[];
        FunctionName: string[];
        FunctionOffset: number[];
        SourceFilename: string[];
        SourceLine: number[];
        CountInclusive: number[];
        CountExclusive: number[];
        SamplingRate: number;
        TotalSamples: number;
        SelfCPU: number;
        AnnualCO2TonsExclusive: number[];
        AnnualCO2TonsInclusive: number[];
        AnnualCostsUSDInclusive: number[];
        AnnualCostsUSDExclusive: number[];
    }>;
    getStatus: ({ esClient, soClient, spaceId, isServerless, }: import("./status").HasSetupParams) => Promise<import("@kbn/profiling-utils").ProfilingStatus>;
    getSetupState: ({ esClient, soClient, spaceId }: import("./setup_state").SetupStateParams) => Promise<import("../../common/setup").SetupStateType | import("../../common/cloud_setup").CloudSetupStateType | import("../../common/serverless_setup").ServerlessSetupStateType>;
    fetchFunctions: ({ core, esClient, startIndex, endIndex, indices, stacktraceIdsField, query, totalSeconds, }: import("./functions").FetchFunctionsParams) => Promise<import("@kbn/profiling-utils").TopNFunctions>;
    fetchESFunctions: ({ core, esClient, indices, stacktraceIdsField, query, aggregationFields, limit, totalSeconds, }: import("./functions/es_functions").FetchFunctionsParams) => Promise<import("@kbn/profiling-utils").TopNFunctions>;
};
