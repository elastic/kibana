import type { MetricsAPIRequest, MetricsAPISeries, MetricsAPIRow } from '../../../../common/http_api/metrics_api';
import type { Bucket } from '../types';
export declare const convertBucketsToRows: (options: MetricsAPIRequest, buckets: Bucket[]) => MetricsAPIRow[];
export declare const convertBucketsToMetricsApiSeries: (keys: string[], options: MetricsAPIRequest, buckets: Bucket[], bucketSizeInMillis: number) => MetricsAPISeries;
