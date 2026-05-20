import type { SLODefinition } from '../../../domain/models';
export declare function getFiveMinuteRange(slo: SLODefinition): {
    gte: string;
    lte: string;
};
export declare function getOneHourRange(slo: SLODefinition): {
    gte: string;
    lte: string;
};
export declare function getOneDayRange(slo: SLODefinition): {
    gte: string;
    lte: string;
};
export declare function buildBurnRateAgg(aggKey: 'fiveMinuteBurnRate' | 'oneHourBurnRate' | 'oneDayBurnRate', slo: SLODefinition): {
    [aggKey]: {
        aggs?: {
            goodEvents: {
                sum: {
                    field: string;
                };
            };
            totalEvents: {
                sum: {
                    field: string;
                };
            };
        } | {
            goodEvents: {
                sum: {
                    field: string;
                };
            };
            totalEvents: {
                value_count: {
                    field: string;
                };
            };
        } | undefined;
        filter: {
            range: {
                '@timestamp': {
                    gte: string;
                    lte: string;
                };
            };
        };
    };
};
