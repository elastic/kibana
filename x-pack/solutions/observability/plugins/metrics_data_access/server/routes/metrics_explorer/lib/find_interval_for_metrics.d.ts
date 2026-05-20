import type { MetricsExplorerRequestBody } from '../../../../common/http_api/metrics_explorer';
import type { ESSearchClient } from '../../../lib/metrics/types';
export declare const findIntervalForMetrics: (client: ESSearchClient, options: MetricsExplorerRequestBody) => Promise<{} | undefined>;
