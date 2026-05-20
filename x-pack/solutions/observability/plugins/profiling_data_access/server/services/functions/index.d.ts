import type { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RegisterServicesParams } from '../register_services';
export interface FetchFunctionsParams {
    core: CoreRequestHandlerContext;
    esClient: ElasticsearchClient;
    startIndex: number;
    endIndex: number;
    indices?: string[];
    stacktraceIdsField?: string;
    query: QueryDslQueryContainer;
    totalSeconds: number;
}
export declare function createFetchFunctions({ createProfilingEsClient }: RegisterServicesParams): ({ core, esClient, startIndex, endIndex, indices, stacktraceIdsField, query, totalSeconds, }: FetchFunctionsParams) => Promise<import("@kbn/profiling-utils").TopNFunctions>;
