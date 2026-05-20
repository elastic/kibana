export declare const createLastValueAggBucketScript: (key: string, field?: string) => {
    [x: string]: {
        bucket_script: {
            buckets_path: {
                last_value: string;
            };
            script: string;
        };
    };
};
export declare const createLastValueAggBucket: (key: string, timeFieldName: string, field?: string) => {
    [x: string]: {
        filter: {
            bool: {
                must: {
                    exists: {
                        field: string | undefined;
                    };
                }[];
            };
        };
        aggs: {
            last_value: {
                top_metrics: {
                    metrics: {
                        field: string | undefined;
                    };
                    sort: {
                        [x: string]: string;
                    };
                };
            };
        };
    };
};
