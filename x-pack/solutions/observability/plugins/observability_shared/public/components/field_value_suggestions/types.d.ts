import type { PopoverAnchorPosition } from '@elastic/eui';
import type { Dispatch, SetStateAction } from 'react';
import type { ESFilter } from '@kbn/es-types';
import type { IInspectorInfo } from '@kbn/data-plugin/common';
interface CommonProps {
    selectedValue?: string[];
    excludedValue?: string[];
    label: string;
    button?: JSX.Element;
    width?: number;
    singleSelection?: boolean;
    forceOpen?: boolean;
    setForceOpen?: (val: boolean) => void;
    anchorPosition?: PopoverAnchorPosition;
    fullWidth?: boolean;
    compressed?: boolean;
    asFilterButton?: boolean;
    showCount?: boolean;
    usePrependLabel?: boolean;
    allowExclusions?: boolean;
    allowAllValuesSelection?: boolean;
    cardinalityField?: string;
    required?: boolean;
    keepHistory?: boolean;
    showLogicalConditionSwitch?: boolean;
    useLogicalAND?: boolean;
    onChange: (val?: string[], excludedValue?: string[], isLogicalAND?: boolean) => void;
}
export type FieldValueSuggestionsProps = CommonProps & {
    dataViewTitle?: string;
    sourceField: string;
    asCombobox?: boolean;
    filters: ESFilter[];
    time?: {
        from: string;
        to: string;
    };
    inspector?: IInspectorInfo;
};
export type FieldValueSelectionProps = CommonProps & {
    loading?: boolean;
    values?: ListItem[];
    query?: string;
    setQuery: Dispatch<SetStateAction<string>>;
};
export interface ListItem {
    label: string;
    count: number;
}
export {};
