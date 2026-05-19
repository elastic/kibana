import type { QueryContext } from './query_context';
import type { MonitorSummary } from '../../../../../common/runtime_types';
import type { CursorPagination } from './types';
export declare const CHUNK_SIZE = 1000;
export type ChunkFetcher = (queryContext: QueryContext, searchAfter: any, size: number) => Promise<ChunkResult>;
export interface ChunkResult {
    monitorSummaries: MonitorSummary[];
    searchAfter: any;
}
/**
 * This class exists to simplify the process of querying for page data. Because the raw queries responsible for fetching pages
 * pull data in `chunks`, and those chunks can be full of matches or void of results that would require additional
 * querying, this class provides a `next` function that is cleaner to call. `next` provides the next matching result,
 * which may require many subsequent fetches, while keeping the external API clean.
 */
export declare class MonitorSummaryIterator {
    queryContext: QueryContext;
    buffer: MonitorSummary[];
    bufferPos: number;
    searchAfter: any;
    chunkFetcher: ChunkFetcher;
    endOfResults: boolean;
    constructor(queryContext: QueryContext, initialBuffer?: MonitorSummary[], initialBufferPos?: number, chunkFetcher?: ChunkFetcher);
    next(): Promise<MonitorSummary | null>;
    nextPage(size: number): Promise<MonitorSummariesPage>;
    peek(): Promise<MonitorSummary | null>;
    getCurrent(): MonitorSummary | null;
    bufferNext(): Promise<void>;
    /**
     *  Attempts to buffer more results fetching a single chunk.
     * If trim is set to true, which is the default, it will delete all items in the buffer prior to the current item.
     * to free up space.
     * @param size the number of items to chunk
     */
    attemptBufferMore(): Promise<{
        gotHit: boolean;
    }>;
    paginationAfterCurrent(): Promise<CursorPagination | null>;
    paginationBeforeCurrent(): Promise<CursorPagination | null>;
    reverse(): MonitorSummaryIterator | null;
    clone(): MonitorSummaryIterator;
}
export interface MonitorSummariesPage {
    monitorSummaries: MonitorSummary[];
    nextPagePagination: CursorPagination | null;
    prevPagePagination: CursorPagination | null;
}
