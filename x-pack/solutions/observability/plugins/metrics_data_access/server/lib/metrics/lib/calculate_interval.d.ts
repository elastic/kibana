import type { MetricsAPIRequest } from '../../../../common/http_api';
import type { ESSearchClient } from '../types';
export declare const calculatedInterval: (search: ESSearchClient, options: MetricsAPIRequest) => Promise<string>;
