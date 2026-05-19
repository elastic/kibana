import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';
import type { ESSearchResponse } from '@kbn/es-types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare function isUndefinedOrNull(value: any): value is undefined | null;
interface TermQueryOpts {
    queryEmptyString: boolean;
}
export declare function termQuery<T extends string>(field: T, value: string | boolean | number | undefined | null, opts?: TermQueryOpts): QueryDslQueryContainer[];
export declare function wildcardQuery<T extends string>(field: T, value: string | undefined, opts?: {
    leadingWildcard: boolean;
}): QueryDslQueryContainer[];
export declare function termsQuery(field: string, ...values: Array<string | boolean | undefined | number | null>): QueryDslQueryContainer[];
export declare function rangeQuery(start?: number, end?: number, field?: string): estypes.QueryDslQueryContainer[];
export declare function existsQuery(field: string): QueryDslQueryContainer[];
export declare function kqlQuery(kql?: string): estypes.QueryDslQueryContainer[];
export declare function typedSearch<DocumentSource extends unknown, TParams extends estypes.SearchRequest>(esClient: ElasticsearchClient, params: TParams): Promise<ESSearchResponse<DocumentSource, TParams>>;
export declare function createEsParams<T extends estypes.SearchRequest>(params: T): T;
export {};
