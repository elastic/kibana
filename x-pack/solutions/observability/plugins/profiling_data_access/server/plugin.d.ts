import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ProfilingConfig } from '.';
import type { ProfilingPluginStartDeps } from './types';
export type ProfilingDataAccessPluginSetup = ReturnType<ProfilingDataAccessPlugin['setup']>;
export type ProfilingDataAccessPluginStart = ReturnType<ProfilingDataAccessPlugin['start']>;
export declare class ProfilingDataAccessPlugin implements Plugin {
    private readonly initializerContext;
    private readonly logger;
    constructor(initializerContext: PluginInitializerContext<ProfilingConfig>);
    setup(core: CoreSetup): void;
    start(core: CoreStart, plugins: ProfilingPluginStartDeps): {
        services: {
            fetchFlamechartData: ({ core, esClient, indices, stacktraceIdsField, query, totalSeconds, }: import("./services/fetch_flamechart").FetchFlamechartParams) => Promise<{
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
            getStatus: ({ esClient, soClient, spaceId, isServerless, }: import("./services/status").HasSetupParams) => Promise<import("@kbn/profiling-utils").ProfilingStatus>;
            getSetupState: ({ esClient, soClient, spaceId }: import("./services/setup_state").SetupStateParams) => Promise<import("../common/setup").SetupStateType | import("../common/cloud_setup").CloudSetupStateType | import("../common/serverless_setup").ServerlessSetupStateType>;
            fetchFunctions: ({ core, esClient, startIndex, endIndex, indices, stacktraceIdsField, query, totalSeconds, }: import("./services/functions").FetchFunctionsParams) => Promise<import("@kbn/profiling-utils").TopNFunctions>;
            fetchESFunctions: ({ core, esClient, indices, stacktraceIdsField, query, aggregationFields, limit, totalSeconds, }: import("./services/functions/es_functions").FetchFunctionsParams) => Promise<import("@kbn/profiling-utils").TopNFunctions>;
        };
    };
}
