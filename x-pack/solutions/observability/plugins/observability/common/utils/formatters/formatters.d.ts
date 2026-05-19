import type { Maybe } from '../../typings';
export declare function asDecimal(value?: number | null): string;
export declare function asInteger(value?: number | null): string;
export declare function asPercent(numerator: Maybe<number>, denominator: number | undefined, fallbackResult?: string): string;
export type AsPercent = typeof asPercent;
export declare function asDecimalOrInteger(value: number): string;
