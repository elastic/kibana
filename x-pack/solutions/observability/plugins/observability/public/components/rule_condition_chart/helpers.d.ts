import type { GenericMetric } from './rule_condition_chart';
export interface LensOperation {
    operation: string;
    operationWithField: string;
    sourceField: string;
}
export declare const getLensOperationFromRuleMetric: (metric: GenericMetric) => LensOperation;
export declare const getBufferThreshold: (threshold?: number) => string;
export declare const LensFieldFormat: {
    readonly NUMBER: "number";
    readonly PERCENT: "percent";
    readonly BITS: "bits";
};
export declare const lensFieldFormatter: (metrics: GenericMetric[]) => (typeof LensFieldFormat)[keyof typeof LensFieldFormat];
export declare const isRate: (metrics: GenericMetric[]) => boolean;
