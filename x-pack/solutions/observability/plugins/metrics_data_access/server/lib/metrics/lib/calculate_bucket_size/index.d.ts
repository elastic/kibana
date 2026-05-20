import type { MetricsAPITimerange } from '../../../../../common/http_api';
export declare const calculateBucketSize: (timerange: MetricsAPITimerange) => {
    bucketSize: number;
    intervalString: string;
};
