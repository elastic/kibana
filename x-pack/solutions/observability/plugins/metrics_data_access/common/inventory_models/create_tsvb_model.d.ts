import type { TSVBMetricModelCreator, TSVBSeries, InventoryTsvbType } from './types';
export declare const createTSVBModel: (id: InventoryTsvbType, requires: string[], series: TSVBSeries[], interval?: string, dropLastBucket?: boolean) => TSVBMetricModelCreator;
