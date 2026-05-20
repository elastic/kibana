import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import React from 'react';
interface CompositeSloToolbarProps {
    search: string;
    isLoading: boolean;
    selectedTags: string[];
    availableTags: string[];
    selectedStatuses?: string[];
    hasActiveFilters: boolean;
    onSearchChange: (value: string) => void;
    onTagSelectionChange: (options: EuiSelectableOption[]) => void;
    onStatusChange?: (statuses: string[]) => void;
    onClearFilters: () => void;
}
export declare function CompositeSloToolbar({ search, isLoading, selectedTags, availableTags, selectedStatuses, hasActiveFilters, onSearchChange, onTagSelectionChange, onStatusChange, onClearFilters, }: CompositeSloToolbarProps): React.JSX.Element;
export {};
