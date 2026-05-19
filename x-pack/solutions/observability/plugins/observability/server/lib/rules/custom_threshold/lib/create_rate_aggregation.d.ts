export declare const createRateAggsBucketScript: (timeframe: {
    start: number;
    end: number;
}, id: string) => {
    [x: string]: {
        bucket_script: {
            buckets_path: {
                first: string;
                second: string;
            };
            script: string;
        };
    };
};
export declare const createRateAggsBuckets: (timeframe: {
    start: number;
    end: number;
}, id: string, timeFieldName: string, field: string) => {
    [x: string]: {
        filter: {
            range: {
                [x: string]: {
                    gte: string;
                    lt: string;
                };
            };
        };
        aggs: {
            maxValue: {
                max: {
                    field: string;
                };
            };
        };
    };
};
