import { errors } from '@elastic/elasticsearch';
export declare class WrappedElasticsearchClientError extends Error {
    originalError: errors.ElasticsearchClientError;
    constructor(originalError: errors.ElasticsearchClientError);
}
export declare function unwrapEsResponse<T extends Promise<{
    body: any;
}>>(responsePromise: T): Promise<Awaited<T>['body']>;
