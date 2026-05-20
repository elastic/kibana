import type { BurnRateAlert } from '../types';
import type { WindowSchema } from '../../../typings';
export declare function getActionGroupFromReason(reason: string): string;
export declare function getActionGroupWindow(alert: BurnRateAlert): WindowSchema;
