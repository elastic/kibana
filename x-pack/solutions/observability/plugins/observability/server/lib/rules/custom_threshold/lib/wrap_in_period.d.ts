import type { CustomMetricExpressionParams } from '../../../../../common/custom_threshold_rule/types';
export declare const createLastPeriod: (lastPeriodEnd: number, { timeUnit, timeSize }: CustomMetricExpressionParams, timeFieldName: string) => {
    lastPeriod: {
        filter: {
            range: {
                [x: string]: {
                    gte: string;
                    lte: string;
                };
            };
        };
    };
};
export declare const wrapInCurrentPeriod: <Aggs extends {}>(timeframe: {
    start: number;
    end: number;
    timeFieldName: string;
}, aggs: Aggs) => {
    currentPeriod: {
        filters: {
            filters: {
                all: {
                    range: {
                        [x: string]: {
                            gte: string;
                            lte: string;
                        };
                    };
                };
            };
        };
        aggs: Aggs;
    };
};
