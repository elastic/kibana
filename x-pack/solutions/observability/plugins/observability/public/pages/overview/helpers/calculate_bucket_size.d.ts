import type { TimeBuckets } from '@kbn/data-plugin/common';
import type { TimeRange } from '@kbn/es-query';
export type BucketSize = {
    bucketSize: number;
    intervalString: string;
    dateFormat: string;
} | undefined;
interface Bucket {
    start?: number;
    end?: number;
    timeBuckets: TimeBuckets;
}
export declare function calculateBucketSize({ start, end, timeBuckets }: Bucket): BucketSize;
export declare function calculateTimeRangeBucketSize({ from, to }: TimeRange, timeBuckets: TimeBuckets): BucketSize;
export {};
