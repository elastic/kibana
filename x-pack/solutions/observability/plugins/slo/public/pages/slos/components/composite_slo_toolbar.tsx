/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';

interface CompositeSloToolbarProps {
  search: string;
  isLoading: boolean;
  selectedTags: string[];
  availableTags: string[];
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onTagSelectionChange: (options: EuiSelectableOption[]) => void;
  onClearFilters: () => void;
}

export function CompositeSloToolbar({
  search,
  isLoading,
  selectedTags,
  availableTags,
  hasActiveFilters,
  onSearchChange,
  onTagSelectionChange,
  onClearFilters,
}: CompositeSloToolbarProps) {
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  const tagOptions: EuiSelectableOption[] = useMemo(
    () =>
      availableTags.map((tag) => ({
        label: tag,
        checked: selectedTags.includes(tag) ? 'on' : undefined,
      })),
    [availableTags, selectedTags]
  );

  const handleToggleTagPopover = useCallback(() => {
    setIsTagPopoverOpen((prev) => !prev);
  }, []);

  const handleCloseTagPopover = useCallback(() => {
    setIsTagPopoverOpen(false);
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
        </EuiFilterGroup>
      </EuiFlexItem>
      {hasActiveFilters && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="compositeSloListClearFilters"
            size="s"
            iconType="cross"
            onClick={onClearFilters}
          >
            {i18n.translate('xpack.slo.compositeSloList.clearFilters', {
              defaultMessage: 'Clear filters',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
