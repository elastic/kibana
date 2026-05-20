import type { SavedObjectsType } from '@kbn/core/server';
export declare const metricsDataSourceSavedObjectName = "metrics-data-source";
export interface MetricsDataSavedObject {
    metricIndices: string;
}
export declare const metricsDataSourceSavedObjectType: SavedObjectsType;
