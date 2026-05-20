import type { MetricCustomIndicator } from '@kbn/slo-schema';
import type { DataView } from '@kbn/data-views-plugin/common';
export declare class GetCustomMetricIndicatorAggregation {
    private indicator;
    private dataView?;
    constructor(indicator: MetricCustomIndicator, dataView?: DataView | undefined);
    private buildMetricAggregations;
    private convertEquationToPainless;
    private buildMetricEquation;
    execute({ type, aggregationKey }: {
        type: 'good' | 'total';
        aggregationKey: string;
    }): {};
}
