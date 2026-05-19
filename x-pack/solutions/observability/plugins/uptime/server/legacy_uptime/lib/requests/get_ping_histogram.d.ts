import type { GetPingHistogramParams, HistogramResult } from '../../../../common/runtime_types';
import type { UMElasticsearchQueryFn } from '../adapters/framework';
export declare const getPingHistogram: UMElasticsearchQueryFn<GetPingHistogramParams, HistogramResult>;
