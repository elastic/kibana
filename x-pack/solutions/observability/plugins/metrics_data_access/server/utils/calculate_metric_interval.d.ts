import type { InventoryItemType } from '../../common/inventory_models/types';
import type { ESSearchClient } from '../lib/metrics/types';
interface Options {
    indexPattern: string;
    timerange: {
        from: number;
        to: number;
    };
}
/**
 * Look at the data from metricbeat and get the max period for a given timerange.
 * This is useful for visualizing metric modules like s3 that only send metrics once per day.
 */
export declare const calculateMetricInterval: (client: ESSearchClient, options: Options, modules?: string[], nodeType?: InventoryItemType) => Promise<number | undefined>;
export {};
