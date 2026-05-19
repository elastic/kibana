import type { ESFilter } from '@kbn/es-types';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { CursorPagination } from './types';
import type { UptimeEsClient } from '../../lib';
export declare class QueryContext {
    callES: UptimeEsClient;
    dateRangeStart: string;
    dateRangeEnd: string;
    pagination: CursorPagination;
    filterClause: any | null;
    size: number;
    statusFilter?: string;
    query?: string;
    constructor(database: UptimeEsClient, dateRangeStart: string, dateRangeEnd: string, pagination: CursorPagination, filterClause: any | null, size: number, statusFilter?: string, query?: string);
    search<TParams extends SearchRequest>(params: TParams, operationName?: string): Promise<{
        body: import("@kbn/es-types").ESSearchResponse<unknown, TParams>;
    }>;
    dateAndCustomFilters(): Promise<ESFilter[]>;
    dateRangeFilter(): Promise<any>;
    timespanClause(): {
        range: {
            'monitor.timespan': {
                gte: string;
                lte: string;
            };
        };
    };
    clone(): QueryContext;
    searchSortAligned(): boolean;
    cursorOrder(): 'asc' | 'desc';
}
