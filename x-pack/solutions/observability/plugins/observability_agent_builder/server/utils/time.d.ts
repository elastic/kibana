import type datemath from '@kbn/datemath';
export declare function toMilliseconds(us: number | null): number | undefined;
export declare function toISOString(epoch: number | null): string | undefined;
export declare function parseDatemath(value: string, options?: Parameters<typeof datemath.parse>[1]): number;
