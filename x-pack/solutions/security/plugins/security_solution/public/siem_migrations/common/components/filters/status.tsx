/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';

import * as i18n from './translations';
import type { StatusFilterOptions } from './types';

const STATUS_FILTER_POPOVER_WIDTH = 250;

interface StatusFilterButtonProps<T> {
  status?: T;
  onStatusChanged: (newStatus?: T) => void;
  statusFilterOptions: StatusFilterOptions<T>[];
}

const StatusFilterButtonComponent = <T,>({
  status,
  onStatusChanged,
  statusFilterOptions,
}: StatusFilterButtonProps<T>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const selectableOptions: EuiSelectableOption[] = useMemo(() => {
    return statusFilterOptions.map(({ label, data }) => ({
      label,
      data,
      checked: status === data.status ? 'on' : undefined,
    }));
  }, [status, statusFilterOptions]);

  const handleOptionsChange = useCallback(
    (
      _options: EuiSelectableOption[],
      _event: EuiSelectableOnChangeEvent,
      changedOption: EuiSelectableOption
    ) => {
      setIsPopoverOpen(false);

      if (changedOption.checked && changedOption?.data?.status) {
        onStatusChanged(changedOption.data.status);
      } else if (!changedOption.checked) {
        onStatusChanged();
      }
    },
    [onStatusChanged]
  );

  const triggerButton = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={() => {
        setIsPopoverOpen(!isPopoverOpen);
      }}
      isSelected={isPopoverOpen}
      hasActiveFilters={status !== undefined}
      numActiveFilters={status ? 1 : 0}
      data-test-subj="statusFilterButton"
    >
      {i18n.STATUS_BUTTON_TITLE}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(!isPopoverOpen);
      }}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiSelectable
        aria-label={i18n.STATUS_FILTER_ARIAL_LABEL}
        options={selectableOptions}
        onChange={handleOptionsChange}
        singleSelection
        data-test-subj="statusFilterSelectableList"
      >
        {(list) => <div css={{ width: STATUS_FILTER_POPOVER_WIDTH }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};

const MemoizedStatusFilterButton = React.memo(StatusFilterButtonComponent);
MemoizedStatusFilterButton.displayName = 'StatusFilterButton';

export const StatusFilterButton = MemoizedStatusFilterButton as typeof StatusFilterButtonComponent;
