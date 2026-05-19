import type { UMElasticsearchQueryFn } from '../adapters';
import type { Snapshot } from '../../../../common/runtime_types';
export interface GetSnapshotCountParams {
    dateRangeStart: string;
    dateRangeEnd: string;
    filters?: string | null;
    query?: string;
}
export declare const getSnapshotCount: UMElasticsearchQueryFn<GetSnapshotCountParams, Snapshot>;
