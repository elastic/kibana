import type { CoreSetup, PluginInitializerContext, Plugin } from '@kbn/core/server';
import type { MetricsDataPluginStartDeps } from './types';
import type { MetricsDataClient } from './client';
export type MetricsDataPluginSetup = ReturnType<MetricsDataPlugin['setup']>;
export type MetricsDataPluginStart = ReturnType<MetricsDataPlugin['start']>;
export declare class MetricsDataPlugin implements Plugin<MetricsDataPluginSetup, MetricsDataPluginStart, {}, MetricsDataPluginStartDeps> {
    private metricsClient;
    constructor(context: PluginInitializerContext);
    setup(core: CoreSetup<MetricsDataPluginStartDeps>): {
        client: MetricsDataClient;
    };
    start(): {};
    stop(): void;
}
