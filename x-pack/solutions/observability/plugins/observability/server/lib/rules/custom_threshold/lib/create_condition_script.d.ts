import { COMPARATORS } from '@kbn/alerting-comparators';
export declare const createConditionScript: (threshold: number[], comparator: COMPARATORS) => {
    source: string;
    params: {
        threshold0: number;
        threshold1: number;
        threshold?: undefined;
    };
} | {
    source: string;
    params: {
        threshold: number;
        threshold0?: undefined;
        threshold1?: undefined;
    };
};
