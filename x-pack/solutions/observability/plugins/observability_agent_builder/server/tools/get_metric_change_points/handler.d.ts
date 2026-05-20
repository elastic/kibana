import type { IScopedClusterClient } from '@kbn/core/server';
type MetricType = 'min' | 'max' | 'sum' | 'count' | 'avg' | 'p95' | 'p99';
interface AggregationConfig {
    field: string;
    type: MetricType;
}
export declare function getToolHandler({ esClient, start, end, index, aggregation, kqlFilter: kqlFilterValue, groupBy, }: {
    esClient: IScopedClusterClient;
    start: string;
    end: string;
    index: string;
    aggregation: AggregationConfig | undefined;
    kqlFilter?: string;
    groupBy: string[];
}): Promise<import("../../utils/get_change_points").ChangePoint[]>;
export {};
