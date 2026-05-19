export declare const makeDateRangeFilter: (dateRangeStart: string | number, dateRangeEnd: string | number) => {
    range: {
        '@timestamp': {
            gte: string | number;
            lte: string | number;
        };
    };
};
