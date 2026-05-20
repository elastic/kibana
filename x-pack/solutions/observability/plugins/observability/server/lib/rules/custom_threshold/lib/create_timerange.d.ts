export declare const createTimerange: (interval: number, timeframe: {
    end: string;
    start: string;
}, lastPeriodEnd?: number, isRateAgg?: boolean) => {
    start: number;
    end: number;
};
