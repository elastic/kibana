import React from 'react';
export interface EmbeddableProfilingSearchBarProps {
    kuery: string;
    showDatePicker?: boolean;
    onQuerySubmit: (params: {
        dateRange: {
            from: string;
            to: string;
            mode?: 'absolute' | 'relative';
        };
        query: string;
    }) => void;
    onRefresh: () => void;
    rangeFrom: string;
    rangeTo: string;
}
export declare function EmbeddableProfilingSearchBar(props: EmbeddableProfilingSearchBarProps): React.JSX.Element;
