import type { UMElasticsearchQueryFn } from '../adapters';
import type { SortOrder, CursorDirection, MonitorSummariesResult } from '../../../../common/runtime_types';
export interface CursorPagination {
    cursorKey?: any;
    cursorDirection: CursorDirection;
    sortOrder: SortOrder;
}
export interface GetMonitorStatesParams {
    dateRangeStart: string;
    dateRangeEnd: string;
    pagination?: CursorPagination;
    pageSize: number;
    filters?: string | null;
    statusFilter?: string;
    query?: string;
}
export declare const getMonitorStates: UMElasticsearchQueryFn<GetMonitorStatesParams, MonitorSummariesResult>;
