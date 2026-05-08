/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import { ClearAllButton } from '../../../../../components/clear_all_filter_options';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { type FilterItems, type FilterName, useScriptLibraryFilter } from './hooks';
import { ScriptLibraryFilterPopover } from './script_library_filter_popover';
import { FILTER_PLACEHOLDERS } from './translations';

interface ScriptLibraryFilterProps {
  filterName: FilterName;
  onChangeFilter: (selectedItems: string[]) => void;
  'data-test-subj'?: string;
}
export const ScriptLibraryFilter = memo<ScriptLibraryFilterProps>(
  ({ filterName, onChangeFilter, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    // popover states and handlers
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const onPopoverButtonClick = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [setIsPopoverOpen, isPopoverOpen]);
    const onClosePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, [setIsPopoverOpen]);

    const {
      items,
      hasActiveFilters,
      numActiveFilters,
      numFilters,
      setUrlOsFilter,
      setUrlFileTypeFilter,
      setUrlCategoryFilter,
    } = useScriptLibraryFilter(filterName);

    const isSearchableFilter: boolean = useMemo(() => filterName === 'tags', [filterName]);

    const onOptionsChange = useCallback(
      (newOptions: FilterItems) => {
        const selectedItems = newOptions.reduce<string[]>((acc, curr) => {
          if (curr.checked === 'on' && curr.key) {
            acc.push(curr.key);
          }
          return acc;
        }, []);

        if (filterName === 'fileType') {
          setUrlFileTypeFilter(selectedItems.join());
        } else if (filterName === 'platform') {
          setUrlOsFilter(selectedItems.join());
        } else if (filterName === 'tags') {
          setUrlCategoryFilter(selectedItems.join());
        }

        // update overall query state with selected options
        onChangeFilter(selectedItems);
      },
      [filterName, setUrlOsFilter, setUrlFileTypeFilter, setUrlCategoryFilter, onChangeFilter]
    );

    const onClearAll = useCallback(() => {
      if (filterName === 'fileType') {
        setUrlFileTypeFilter('');
      } else if (filterName === 'platform') {
        setUrlOsFilter('');
      } else if (filterName === 'tags') {
        setUrlCategoryFilter('');
      }

      onChangeFilter([]);
    }, [filterName, onChangeFilter, setUrlOsFilter, setUrlFileTypeFilter, setUrlCategoryFilter]);

    return (
      <ScriptLibraryFilterPopover
        onClosePopover={onClosePopover}
        filterName={filterName}
        hasActiveFilters={hasActiveFilters}
        isPopoverOpen={isPopoverOpen}
        numActiveFilters={numActiveFilters}
        numFilters={numFilters}
        onButtonClick={onPopoverButtonClick}
        data-test-subj={getTestId()}
      >
        <EuiSelectable
          aria-label={getTestId(`${filterName}-filter`)}
          onChange={onOptionsChange}
          options={items}
          renderOption={(option) =>
            filterName === 'platform' && !option.disabled ? (
              <EuiBadge color="hollow">{option.label}</EuiBadge>
            ) : (
              option.label
            )
          }
          data-test-subj={getTestId(`${filterName}-filter`)}
          searchable={isSearchableFilter ? true : undefined}
          searchProps={
            isSearchableFilter
              ? {
                  placeholder: FILTER_PLACEHOLDERS.tags.searchPlaceholder,
                  compressed: true,
                }
              : undefined
          }
        >
          {(list, search) => (
            <div
              css={{ width: 250 }}
              data-test-subj={getTestId(`${filterName}-filter-popoverList`)}
            >
              {isSearchableFilter && (
                <EuiPopoverTitle
                  data-test-subj={getTestId(`${filterName}-filter-search`)}
                  paddingSize="s"
                >
                  {search}
                </EuiPopoverTitle>
              )}
              {list}
              <EuiFlexGroup>
                <EuiFlexItem>
                  <ClearAllButton
                    data-test-subj={getTestId(`${filterName}-filter-clearAllButton`)}
                    isDisabled={!hasActiveFilters}
                    onClick={onClearAll}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          )}
        </EuiSelectable>
      </ScriptLibraryFilterPopover>
    );
  }
);

ScriptLibraryFilter.displayName = 'ScriptLibraryFilter';
