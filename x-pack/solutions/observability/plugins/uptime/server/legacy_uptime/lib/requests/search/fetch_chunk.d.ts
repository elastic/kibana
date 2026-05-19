import type { ChunkFetcher } from './monitor_summary_iterator';
/**
 * Fetches a single 'chunk' of data with a single query, then uses a secondary query to filter out erroneous matches.
 * Note that all returned data may be erroneous. If `searchAfter` is returned the caller should invoke this function
 * repeatedly with the new searchAfter value as there may be more matching data in a future chunk. If `searchAfter`
 * is falsey there is no more data to fetch.
 * @param queryContext the data and resources needed to perform the query
 * @param searchAfter indicates where Elasticsearch should continue querying on subsequent requests, if at all
 * @param size the minimum size of the matches to chunk
 */
export declare const fetchChunk: ChunkFetcher;
