import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import type { RegisterServicesParams } from '../register_services';
export interface FetchFlamechartParams {
    esClient: ElasticsearchClient;
    core: CoreRequestHandlerContext;
    indices?: string[];
    stacktraceIdsField?: string;
    query: QueryDslQueryContainer;
    totalSeconds: number;
}
export declare function createFetchFlamechart({ createProfilingEsClient }: RegisterServicesParams): ({ core, esClient, indices, stacktraceIdsField, query, totalSeconds, }: FetchFlamechartParams) => Promise<{
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
