import type { TimesliceMetricIndicator } from '@kbn/slo-schema';
import type { DataView } from '@kbn/data-views-plugin/common';
export declare class GetTimesliceMetricIndicatorAggregation {
    private indicator;
    private dataView?;
    constructor(indicator: TimesliceMetricIndicator, dataView?: DataView | undefined);
    private buildAggregation;
    private buildBucketPath;
    private buildMetricAggregations;
    private convertEquationToPainless;
    private buildMetricEquation;
    execute(aggregationKey: string): {};
}
