import type { estypes } from '@elastic/elasticsearch';
export declare function createEsQuery<T extends estypes.SearchRequest>(params: T): T;
