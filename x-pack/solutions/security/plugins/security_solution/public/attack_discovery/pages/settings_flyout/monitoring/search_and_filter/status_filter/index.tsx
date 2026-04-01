/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

import * as i18n from '../translations';

const STATUS_OPTIONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'running', label: i18n.RUNNING },
  { key: 'succeeded', label: i18n.SUCCEEDED },
  { key: 'failed', label: i18n.FAILED },
];

interface Props {
  isLoading?: boolean;
  onStatusChange: (selectedStatuses: string[]) => void;
  selectedStatuses: string[];
}

const StatusFilterComponent: React.FC<Props> = ({
  isLoading = false,
  onStatusChange,
  selectedStatuses,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onFilterButtonClick = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'monitoringStatusFilterGroupPopover',
  });

  const options: EuiSelectableOption[] = useMemo(
    () =>
      STATUS_OPTIONS.map(({ key, label }) => ({
        checked: selectedStatuses.includes(key) ? ('on' as const) : undefined,
        'data-test-subj': `monitoringStatusOption-${key}`,
        key,
        label,
      })),
    [selectedStatuses]
  );

  const activeFilterCount = useMemo(
    () => options.filter((option) => option.checked === 'on').length,
    [options]
  );

  const button = useMemo(
    () => (
      <EuiFilterButton
        badgeColor="subdued"
        data-test-subj="monitoringStatusFilterButton"
        disabled={isLoading}
        hasActiveFilters={activeFilterCount > 0}
        iconType="arrowDown"
        isSelected={isPopoverOpen}
        numActiveFilters={activeFilterCount}
        onClick={onFilterButtonClick}
      >
        {i18n.STATUS}
      </EuiFilterButton>
    ),
    [activeFilterCount, isLoading, isPopoverOpen, onFilterButtonClick]
  );

  const onSelectableChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newSelectedStatuses = newOptions
        .filter((option) => option.checked === 'on')
        .map((option) => option.key ?? option.label);
      onStatusChange(newSelectedStatuses);
    },
    [onStatusChange]
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={button}
        closePopover={closePopover}
        data-test-subj="monitoringStatusFilterPopover"
        id={filterGroupPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiSelectable
          aria-label={i18n.STATUS}
          data-test-subj="monitoringStatusFilterSelectable"
          onChange={onSelectableChange}
          options={options}
        >
          {(list) => (
            <div
              css={css`
                width: 200px;
              `}
            >
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

export const StatusFilter = React.memo(StatusFilterComponent);
