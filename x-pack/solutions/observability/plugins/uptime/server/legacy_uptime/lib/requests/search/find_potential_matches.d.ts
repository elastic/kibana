import type { QueryContext } from './query_context';
/**
 * This is the first phase of the query. In it, we find all monitor IDs that have ever matched the given filters.
 * @param queryContext the data and resources needed to perform the query
 * @param searchAfter indicates where Elasticsearch should continue querying on subsequent requests, if at all
 * @param size the minimum size of the matches to chunk
 */
export declare const findPotentialMatches: (queryContext: QueryContext, searchAfter: any, size: number) => Promise<{
    monitorIds: string[];
    searchAfter: {
        monitor_id: string | number;
    } | undefined;
}>;
