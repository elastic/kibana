export declare function getBucketSize({ start, end, minInterval, buckets, }: {
    start: number;
    end: number;
    minInterval: string;
    buckets?: number;
}): {
    bucketSize: number;
    intervalString: string;
};
