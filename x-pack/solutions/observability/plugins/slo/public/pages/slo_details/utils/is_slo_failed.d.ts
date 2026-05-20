import type { Status } from '@kbn/slo-schema';
export declare function isSloFailed(status: Status): boolean;
export declare function getSloChartState(status: Status): 'error' | 'success';
