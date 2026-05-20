import type { MetricsAPIResponse, MetricsAPIRequest } from '../../../common';
import type { ESSearchClient } from './types';
export declare const fetchMetrics: (search: ESSearchClient, rawOptions: MetricsAPIRequest) => Promise<MetricsAPIResponse>;
