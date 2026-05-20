import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import React from 'react';
import type { SearchState } from '../../hooks/use_url_search_state';
interface Props {
    initialState: SearchState;
    loading: boolean;
    dataView?: DataView;
    onStateChange: (newState: Partial<SearchState>) => void;
}
export declare function QuickFilters({ dataView, initialState: { tagsFilter, statusFilter }, onStateChange, }: Props): React.JSX.Element | null;
export declare const getSelectedOptions: (filter?: Filter) => any[];
export {};
