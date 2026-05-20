import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
export interface MetricsDataPluginStartDeps {
    data: DataPluginStart;
}
export interface GetMetricIndicesOptions {
    savedObjectsClient: SavedObjectsClientContract;
}
export type UpdateMetricIndicesOptions = GetMetricIndicesOptions & {
    metricIndices: string;
};
export type DefaultMetricIndicesHandler = ((options: GetMetricIndicesOptions) => Promise<string>) | null;
