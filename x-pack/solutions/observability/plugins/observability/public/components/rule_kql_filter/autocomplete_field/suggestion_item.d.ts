import React from 'react';
import type { QuerySuggestion } from '@kbn/kql/public';
interface Props {
    isSelected?: boolean;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
    suggestion: QuerySuggestion;
}
export declare function SuggestionItem(props: Props): React.JSX.Element;
export declare namespace SuggestionItem {
    var defaultProps: {
        isSelected: boolean;
    };
}
export {};
