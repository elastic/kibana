import type { TimeRange } from '@kbn/es-query';
import React from 'react';
import type { SearchBarProps } from './query_builder';
type Props = SearchBarProps & {
    isFlyoutOpen?: boolean;
    range?: TimeRange;
    setRange?: (range: TimeRange) => void;
};
export declare function QuerySearchBar({ name, label, dataView, required, tooltip, dataTestSubj, placeholder, isFlyoutOpen, range, setRange, }: Props): React.JSX.Element;
export {};
