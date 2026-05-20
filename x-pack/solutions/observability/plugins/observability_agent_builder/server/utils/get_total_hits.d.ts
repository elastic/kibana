import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
export declare function getTotalHits(response: Pick<SearchResponse<unknown>, 'hits'> | undefined): number;
