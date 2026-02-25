/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import * as i18n from './translations';
import { TagsFilterPopover } from '../rules_table_filters/tags_filter_popover';
import { RuleSearchField } from '../rules_table_filters/rule_search_field';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';

/**
 * Search bar only for the Add Prebuilt Rules table. Renders at the top of the layout.
 */
export const AddPrebuiltRulesTableSearchBar = React.memo(
  function AddPrebuiltRulesTableSearchBar() {
    const {
      state: { filterOptions },
      actions: { setFilterOptions },
    } = useAddPrebuiltRulesTableContext();

    const handleOnSearch = useCallback(
      (nameFilter: string) => {
        setFilterOptions((filters) => ({
          ...filters,
          name: nameFilter.trim(),
        }));
      },
      [setFilterOptions]
    );

    return (
      <RuleSearchField
        initialValue={filterOptions.name}
        onSearch={handleOnSearch}
        placeholder={i18n.SEARCH_PLACEHOLDER}
      />
    );
  }
);

AddPrebuiltRulesTableSearchBar.displayName = 'AddPrebuiltRulesTableSearchBar';

/**
 * Sidebar content: tags filter for the Add Prebuilt Rules table.
 */
export const AddPrebuiltRulesTableFiltersSidebarContent = React.memo(
  function AddPrebuiltRulesTableFiltersSidebarContent() {
    const {
      state: { filterOptions, tags },
      actions: { setFilterOptions },
    } = useAddPrebuiltRulesTableContext();

    const { tags: selectedTags } = filterOptions;

    const handleSelectedTags = useCallback(
      (newTags: string[]) => {
        if (!isEqual(newTags, selectedTags)) {
          setFilterOptions((filters) => ({
            ...filters,
            tags: newTags,
          }));
        }
      },
      [selectedTags, setFilterOptions]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <TagsFilterPopover
              onSelectedTagsChanged={handleSelectedTags}
              selectedTags={selectedTags}
              tags={tags}
              data-test-subj="allRulesTagPopover"
            />
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

AddPrebuiltRulesTableFiltersSidebarContent.displayName =
  'AddPrebuiltRulesTableFiltersSidebarContent';
