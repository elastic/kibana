import React from 'react';
import type { SeriesUrl } from '../types';
interface Props {
    onApply?: () => void;
}
export declare function removeUndefinedEmptyValues(series: SeriesUrl): SeriesUrl;
export declare function removeUndefinedProps<T extends object>(obj: T): Partial<T>;
export declare function ViewActions({ onApply }: Props): React.JSX.Element;
export {};
