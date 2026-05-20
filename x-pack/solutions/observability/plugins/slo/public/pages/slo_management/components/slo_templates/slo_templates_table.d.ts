import React from 'react';
import type { TemplatesSearchState } from '../../hooks/use_templates_url_search_state';
interface Props {
    state: TemplatesSearchState;
    onStateChange: (newState: Partial<TemplatesSearchState>) => void;
    onTemplateSelect?: (templateId: string) => void;
}
export declare function SloTemplatesTable({ state, onStateChange, onTemplateSelect }: Props): React.JSX.Element;
export {};
