import type { ThresholdFormatterType } from '../types';
export declare const FORMATTERS: {
    number: (val: number) => string;
    abbreviatedNumber: (bytes: number) => string;
    bytes: (bytes: number) => string;
    bits: (bytes: number) => string;
    percent: (val: number) => string;
    highPrecision: (val: number) => string;
};
export declare const createFormatter: (format: ThresholdFormatterType, template?: string) => (val: string | number) => string;
