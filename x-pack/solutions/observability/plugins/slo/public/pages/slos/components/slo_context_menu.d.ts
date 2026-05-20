import React from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
export interface Option {
    label: string;
    value: string;
    checked: boolean;
    defaultSortOrder?: string;
    onClick: () => void;
}
export interface Props {
    id: string;
    isPopoverOpen: boolean;
    setIsPopoverOpen: (isPopoverOpen: boolean) => void;
    items: JSX.Element[];
    selected: string;
    label: string;
    loading: boolean;
}
export type Item<T> = EuiSelectableOption & {
    label: string;
    type: T;
    checked?: EuiSelectableOptionCheckedType;
};
export declare function SLOContextMenu({ id, isPopoverOpen, label, items, selected, setIsPopoverOpen, loading, }: Props): React.JSX.Element;
export declare function ContextMenuItem({ option, onClosePopover, }: {
    option: Option;
    onClosePopover: () => void;
}): React.JSX.Element;
