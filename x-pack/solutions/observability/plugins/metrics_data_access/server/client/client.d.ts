import type { DefaultMetricIndicesHandler, GetMetricIndicesOptions, UpdateMetricIndicesOptions } from '../types';
export declare const DEFAULT_METRIC_INDICES = "metrics-*,metricbeat-*";
export declare class MetricsDataClient {
    private readonly defaultSavedObjectId;
    private getDefaultMetricIndices;
    getMetricIndices(options: GetMetricIndicesOptions): Promise<string>;
    updateMetricIndices(options: UpdateMetricIndicesOptions): Promise<import("@kbn/core/server").SavedObject<{
        metricIndices: string;
    }>>;
    setDefaultMetricIndicesHandler(handler: DefaultMetricIndicesHandler): void;
}
