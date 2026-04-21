/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';

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

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  {
    value: 'HEALTHY',
    label: i18n.translate('xpack.slo.compositeSloList.statusFilter.healthy', {
      defaultMessage: 'Healthy',
    }),
  },
  {
    value: 'DEGRADING',
    label: i18n.translate('xpack.slo.compositeSloList.statusFilter.degrading', {
      defaultMessage: 'Degrading',
    }),
  },
  {
    value: 'VIOLATED',
    label: i18n.translate('xpack.slo.compositeSloList.statusFilter.violated', {
      defaultMessage: 'Violated',
    }),
  },
  {
    value: 'NO_DATA',
    label: i18n.translate('xpack.slo.compositeSloList.statusFilter.noData', {
      defaultMessage: 'No data',
    }),
  },
];

export function CompositeSloToolbar({
  search,
  isLoading,
  selectedTags,
  availableTags,
  selectedStatuses = [],
  hasActiveFilters,
  onSearchChange,
  onTagSelectionChange,
  onStatusChange,
  onClearFilters,
}: CompositeSloToolbarProps) {
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);

  const tagOptions: EuiSelectableOption[] = useMemo(
    () =>
      availableTags.map((tag) => ({
        label: tag,
        checked: selectedTags.includes(tag) ? 'on' : undefined,
      })),
    [availableTags, selectedTags]
  );

  const statusOptions: EuiSelectableOption[] = useMemo(
    () =>
      STATUS_OPTIONS.map(({ value, label }) => ({
        key: value,
        label,
        checked: selectedStatuses.includes(value) ? 'on' : undefined,
      })),
    [selectedStatuses]
  );

  const handleStatusChange = useCallback(
    (options: EuiSelectableOption[]) => {
      const newStatuses = options
        .filter((opt) => opt.checked === 'on')
        .map((opt) => opt.key as string);
      onStatusChange?.(newStatuses);
    },
    [onStatusChange]
  );

  const handleToggleTagPopover = useCallback(() => {
    setIsTagPopoverOpen((prev) => !prev);
  }, []);

  const handleCloseTagPopover = useCallback(() => {
    setIsTagPopoverOpen(false);
  }, []);

  const handleToggleStatusPopover = useCallback(() => {
    setIsStatusPopoverOpen((prev) => !prev);
  }, []);

  const handleCloseStatusPopover = useCallback(() => {
    setIsStatusPopoverOpen(false);
  }, []);

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow>
        <EuiFieldSearch
          data-test-subj="compositeSloListSearch"
          placeholder={i18n.translate('xpack.slo.compositeSloList.searchPlaceholder', {
            defaultMessage: 'Search composite SLOs by name...',
          })}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          isClearable
          fullWidth
          isLoading={isLoading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiPopover
            button={
              <EuiFilterButton
                data-test-subj="compositeSloListTagFilter"
                iconType="arrowDown"
                onClick={handleToggleTagPopover}
                isSelected={isTagPopoverOpen}
                numFilters={availableTags.length}
                hasActiveFilters={selectedTags.length > 0}
                numActiveFilters={selectedTags.length}
              >
                {i18n.translate('xpack.slo.compositeSloList.tagsFilter', {
                  defaultMessage: 'Tags',
                })}
              </EuiFilterButton>
            }
            isOpen={isTagPopoverOpen}
            closePopover={handleCloseTagPopover}
            panelPaddingSize="none"
          >
            <EuiSelectable
              options={tagOptions}
              onChange={onTagSelectionChange}
              searchable
              searchProps={{
                placeholder: i18n.translate('xpack.slo.compositeSloList.tagsSearchPlaceholder', {
                  defaultMessage: 'Search tags',
                }),
                compressed: true,
              }}
            >
              {(list, tagSearch) => (
                <div css={{ width: 240 }}>
                  {tagSearch}
                  {list}
                </div>
              )}
            </EuiSelectable>
          </EuiPopover>
          <EuiPopover
            button={
              <EuiFilterButton
                data-test-subj="compositeSloListStatusFilter"
                iconType="arrowDown"
                onClick={handleToggleStatusPopover}
                isSelected={isStatusPopoverOpen}
                hasActiveFilters={selectedStatuses.length > 0}
                numActiveFilters={selectedStatuses.length}
              >
                {i18n.translate('xpack.slo.compositeSloList.statusFilter', {
                  defaultMessage: 'Status',
                })}
              </EuiFilterButton>
            }
            isOpen={isStatusPopoverOpen}
            closePopover={handleCloseStatusPopover}
            panelPaddingSize="none"
          >
            <EuiSelectable options={statusOptions} onChange={handleStatusChange}>
              {(list) => <div css={{ width: 160 }}>{list}</div>}
            </EuiSelectable>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ display: 'flex', alignItems: 'center' }}>
        <EuiToolTip
          content={i18n.translate('xpack.slo.compositeSloList.clearFilters', {
            defaultMessage: 'Clear filters',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            data-test-subj="compositeSloListClearFilters"
            iconType="eraser"
            display="empty"
            isDisabled={!hasActiveFilters}
            onClick={onClearFilters}
            aria-label={i18n.translate('xpack.slo.compositeSloList.clearFilters', {
              defaultMessage: 'Clear filters',
            })}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
