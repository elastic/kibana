import type { MetricsAPIRequest } from '../../../../common/http_api';
import type { ESSearchClient } from '../../../lib/metrics/types';
export declare const queryTotalGroupings: (client: ESSearchClient, options: MetricsAPIRequest) => Promise<number>;
