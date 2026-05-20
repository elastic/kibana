import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
type RequiredParams = ESSearchRequest & {
    size: number;
    track_total_hits: boolean | number;
};
export type TypedSearch = ReturnType<typeof getTypedSearch>;
export declare function getTypedSearch(esClient: ElasticsearchClient): <TDocument, TParams extends RequiredParams>(opts: TParams) => Promise<InferSearchResponseOf<TDocument, TParams>>;
export {};
