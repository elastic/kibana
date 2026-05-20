import type { ChangePointType } from '@kbn/es-types/src';
export interface ChangePointDetails {
    change_point?: number;
    r_value?: number;
    trend?: string;
    p_value?: number;
}
interface ChangePointResult {
    type: Record<ChangePointType, ChangePointDetails>;
    bucket?: {
        key: string | number;
        key_as_string?: string;
        doc_count: number;
    };
}
export interface Bucket {
    key: string | number | Array<string | number>;
    regex?: string;
    changes?: ChangePointResult;
    time_series: {
        buckets: Array<{
            key: string | number;
            key_as_string?: string;
            doc_count: number;
        }>;
    };
}
export interface ChangePoint {
    key: string | number | Array<string | number>;
    pattern?: string;
    timeSeries?: Array<{
        x: number;
        y: number;
    }>;
    summary: string;
    changes: ChangePointDetails & {
        time?: string;
        type: ChangePointType;
    };
}
export declare function getChangePoints({ buckets }: {
    buckets: Bucket[];
}): Promise<ChangePoint[]>;
export {};
