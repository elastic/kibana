import type { TimeUnit } from './datetime';
import type { Maybe } from '../../typings';
interface FormatterOptions {
    defaultValue?: string;
    extended?: boolean;
}
type DurationTimeUnit = TimeUnit | 'microseconds';
interface ConvertedDuration {
    value: string;
    unit?: string;
    formatted: string;
}
export type TimeFormatter = (value: Maybe<number>, options?: FormatterOptions) => ConvertedDuration;
type TimeFormatterBuilder = (max: number) => TimeFormatter;
/**
 * Converts a microseconds value into the unit defined.
 */
export declare function convertTo({ unit, microseconds, defaultValue, extended, }: {
    unit: DurationTimeUnit;
    microseconds: Maybe<number>;
    defaultValue?: string;
    extended?: boolean;
}): ConvertedDuration;
export declare const toMicroseconds: (value: number, timeUnit: TimeUnit) => number;
export declare const getDurationFormatter: TimeFormatterBuilder;
export declare function asTransactionRate(value: Maybe<number>): string;
/**
 * Converts value and returns it formatted - 00 unit
 */
export declare function asDuration(value: Maybe<number>, { defaultValue, extended }?: FormatterOptions): string;
export type AsDuration = typeof asDuration;
/**
 * Convert a microsecond value to decimal milliseconds. Normally we use
 * `asDuration`, but this is used in places like tables where we always want
 * the same units.
 */
export declare function asMillisecondDuration(value: Maybe<number>): string;
export type TimeUnitChar = 's' | 'm' | 'h' | 'd';
export declare const formatDurationFromTimeUnitChar: (time: number, unit: TimeUnitChar) => string;
export {};
