import type { Duration } from '../models';
export declare function getLookbackDateRange(startedAt: Date, duration: Duration, delayInSeconds?: number): {
    from: Date;
    to: Date;
};
