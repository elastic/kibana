import type { ErrorBudget, Objective, Status } from '../models';
export declare const NO_DATA = -1;
export interface WeightedDataPoint {
    weight: number;
    sliValue: number;
}
export interface WeightedSliResult {
    sliValue: number;
    errorBudget: ErrorBudget;
    status: Status;
}
export declare function computeWeightedSli(dataPoints: WeightedDataPoint[], objective: Objective): WeightedSliResult;
export declare function computeNormalisedWeights(dataPoints: WeightedDataPoint[]): number[];
