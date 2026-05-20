import type { PluginInitializerContext } from '@kbn/core/server';
export type { MetricsDataPluginSetup, MetricsDataPluginStart } from './plugin';
export type { GetMetricIndicesOptions, UpdateMetricIndicesOptions, DefaultMetricIndicesHandler, } from './types';
export { metricsDataSourceSavedObjectName } from './saved_objects/metrics_data_source';
export { MetricsDataClient } from './client';
export { MetricsDataClientMock } from './client_mock';
export type { ESSearchClient, LogQueryFields } from './lib/metrics';
export { fetchMetrics, BasicMetricValueRT } from './lib/metrics';
export declare function plugin(context: PluginInitializerContext): Promise<import("./plugin").MetricsDataPlugin>;
