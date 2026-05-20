import type { EuiSelectableOption } from '@elastic/eui';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import React from 'react';
import type { SearchState } from '../../hooks/use_url_search_state';
export interface Props {
    onStateChange: (newState: Partial<SearchState>) => void;
    state: SearchState;
    loading: boolean;
}
export type Item<T> = EuiSelectableOption & {
    label: string;
    type: T;
    checked?: EuiSelectableOptionCheckedType;
};
export declare function SLOSortBy({ state, onStateChange, loading }: Props): React.JSX.Element;
