import type { Query, TimeRange } from '@kbn/es-query';
import type { SearchBar } from '@kbn/unified-search-plugin/public';
import React from 'react';
interface Props {
    kuery: string;
    rangeFrom?: string;
    rangeTo?: string;
    onQuerySubmit: (payload: {
        dateRange: TimeRange;
        query?: Query;
    }, isUpdate?: boolean) => void;
    onRefresh?: Required<React.ComponentProps<typeof SearchBar>>['onRefresh'];
    onRefreshClick: () => void;
    showSubmitButton?: boolean;
    dataTestSubj?: string;
    showDatePicker?: boolean;
    showQueryMenu?: boolean;
}
export declare function ProfilingSearchBar({ kuery, rangeFrom, rangeTo, onQuerySubmit, onRefresh, onRefreshClick, showSubmitButton, dataTestSubj, showDatePicker, showQueryMenu, }: Props): React.JSX.Element;
export {};
