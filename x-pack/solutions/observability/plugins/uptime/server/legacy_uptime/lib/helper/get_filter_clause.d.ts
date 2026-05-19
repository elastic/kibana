export declare const getFilterClause: (dateRangeStart: string, dateRangeEnd: string, additionalKeys?: Array<{
    [key: string]: any;
}>) => ({
    range: {
        '@timestamp': {
            gte: string | number;
            lte: string | number;
        };
    };
} | {
    [key: string]: any;
})[];
