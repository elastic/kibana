import type { FindSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import type { SearchState } from '../hooks/use_url_search_state';
import type { ViewType } from '../types';
interface Props {
    onChangeView: (view: ViewType) => void;
    onStateChange: (newState: Partial<SearchState>) => void;
    view: ViewType;
    state: SearchState;
    sloList?: FindSLOResponse;
    loading: boolean;
}
export declare function ToggleSLOView({ view, onChangeView, onStateChange, sloList, state, loading, }: Props): React.JSX.Element;
export {};
