import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import type { AggregationField, TopNFunctions } from '@kbn/profiling-utils';
import type { RegisterServicesParams } from '../register_services';
export interface FetchFunctionsParams {
    core: CoreRequestHandlerContext;
    esClient: ElasticsearchClient;
    indices?: string[];
    stacktraceIdsField?: string;
    query: QueryDslQueryContainer;
    aggregationFields?: AggregationField[];
    limit?: number;
    totalSeconds: number;
}
export declare function createFetchESFunctions({ createProfilingEsClient }: RegisterServicesParams): ({ core, esClient, indices, stacktraceIdsField, query, aggregationFields, limit, totalSeconds, }: FetchFunctionsParams) => Promise<TopNFunctions>;
