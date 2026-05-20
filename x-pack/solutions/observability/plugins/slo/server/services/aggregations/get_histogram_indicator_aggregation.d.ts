import type { HistogramIndicator } from '@kbn/slo-schema';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataView } from '@kbn/data-views-plugin/common';
export declare class GetHistogramIndicatorAggregation {
    private indicator;
    private dataView?;
    constructor(indicator: HistogramIndicator, dataView?: DataView | undefined);
    private buildAggregation;
    private buildBucketScript;
    execute({ type, aggregationKey }: {
        type: 'good' | 'total';
        aggregationKey: string;
    }): {
        [x: string]: AggregationsAggregationContainer;
    };
}
