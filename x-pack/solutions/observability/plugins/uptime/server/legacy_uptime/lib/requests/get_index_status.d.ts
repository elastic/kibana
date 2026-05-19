import type { UptimeEsClient } from '../lib';
import type { StatesIndexStatus } from '../../../../common/runtime_types';
export declare const getIndexStatus: ({ uptimeEsClient, range, }: {
    uptimeEsClient: UptimeEsClient;
    range?: {
        to: string;
        from: string;
    };
}) => Promise<StatesIndexStatus>;
