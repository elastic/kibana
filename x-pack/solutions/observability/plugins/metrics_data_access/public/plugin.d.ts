import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { MetricsDataPluginClass } from './types';
import { MetricsDataClient } from './lib/metrics_client';
export declare class Plugin implements MetricsDataPluginClass {
    logger: Logger;
    constructor(context: PluginInitializerContext<{}>);
    setup(core: CoreSetup): {
        metricsClient: MetricsDataClient;
    };
    start(core: CoreStart): {
        metricsClient: MetricsDataClient;
        ContainerMetricsTable: ({ timerange, kuery, sourceId, isOtel, isK8sContainer, }: import("./components/infrastructure_node_metrics_tables/shared").NodeMetricsTableProps & {
            isK8sContainer?: boolean;
        }) => import("react").JSX.Element;
        HostMetricsTable: ({ timerange, kuery, sourceId, isOtel }: import("./components/infrastructure_node_metrics_tables/shared").NodeMetricsTableProps) => import("react").JSX.Element;
        PodMetricsTable: ({ timerange, kuery, sourceId, isOtel }: import("./components/infrastructure_node_metrics_tables/shared").NodeMetricsTableProps) => import("react").JSX.Element;
    };
    stop(): void;
}
