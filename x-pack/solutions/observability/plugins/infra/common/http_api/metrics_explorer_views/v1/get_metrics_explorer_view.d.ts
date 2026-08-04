import * as rt from 'io-ts';
import type { metricsExplorerViewRT } from '../../../metrics_explorer_views';
export declare const getMetricsExplorerViewRequestParamsRT: rt.TypeC<{
    metricsExplorerViewId: rt.StringC;
}>;
export type GetMetricsExplorerViewResponsePayload = rt.TypeOf<typeof metricsExplorerViewRT>;
