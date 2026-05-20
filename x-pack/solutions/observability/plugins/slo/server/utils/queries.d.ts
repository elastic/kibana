import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ESSearchResponse } from '@kbn/es-types';
export declare function typedSearch<DocumentSource extends unknown, TParams extends estypes.SearchRequest>(esClient: ElasticsearchClient, params: TParams): Promise<ESSearchResponse<DocumentSource, TParams>>;
export declare function createEsParams<T extends estypes.SearchRequest>(params: T): T;
