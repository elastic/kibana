/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectableOption,
  useGeneratedHtmlId,
  EuiTitle,
} from '@elastic/eui';

import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';

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

export function SLOContextMenu({
  id,
  isPopoverOpen,
  label,
  items,
  selected,
  setIsPopoverOpen,
  loading,
}: Props) {
  const singleContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'singleContextMenuPopover',
  });

  const handleTogglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const button = (
    <EuiButtonEmpty
      data-test-subj={`${id}GroupMenuButton`}
      size="xs"
      iconType="arrowDown"
      iconSide="right"
      onClick={handleTogglePopover}
      isLoading={loading}
    >
      {selected}
    </EuiButtonEmpty>
  );

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <span>{label}</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj="sloOverviewGroupButton">
            <EuiPopover
              id={singleContextMenuPopoverId}
              button={button}
              isOpen={isPopoverOpen}
              closePopover={() => setIsPopoverOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downLeft"
              aria-label={label}
            >
              <EuiContextMenuPanel size="s" items={items} style={{ minWidth: 160 }} />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function ContextMenuItem({
  option,
  onClosePopover,
}: {
  option: Option;
  onClosePopover: () => void;
}) {
  const getIconType = (checked: boolean) => {
    return checked ? 'check' : 'empty';
  };

  return (
    <EuiContextMenuItem
      size="s"
      aria-label={option.label}
      key={option.value}
      icon={getIconType(option.checked)}
      onClick={() => {
        onClosePopover();
        option.onClick();
      }}
    >
      {option.label}
    </EuiContextMenuItem>
  );
}
