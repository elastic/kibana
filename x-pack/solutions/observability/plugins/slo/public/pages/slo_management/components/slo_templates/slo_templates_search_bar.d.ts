import React from 'react';
import type { TemplatesSearchState } from '../../hooks/use_templates_url_search_state';
interface Props {
    state: TemplatesSearchState;
    onStateChange: (newState: Partial<TemplatesSearchState>) => void;
}
export declare function SloTemplatesSearchBar({ state, onStateChange }: Props): React.JSX.Element;
export {};
