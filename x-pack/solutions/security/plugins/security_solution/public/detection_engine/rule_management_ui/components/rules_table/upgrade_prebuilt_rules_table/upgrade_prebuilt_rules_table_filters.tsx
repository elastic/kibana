/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import type { RuleCustomizationStatus } from '../../../../../../common/api/detection_engine';
import { usePrebuiltRulesCustomizationStatus } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status';
import { RuleSearchField } from '../rules_table_filters/rule_search_field';
import { TagsFilterPopover } from '../rules_table_filters/tags_filter_popover';
import * as i18n from './translations';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';
import { RuleCustomizationFilterPopover } from './upgrade_rule_customization_filter_popover';

/**
 * Search bar only for the Upgrade Prebuilt Rules table. Renders at the top of the layout.
 */
export const UpgradePrebuiltRulesTableSearchBar = React.memo(
  function UpgradePrebuiltRulesTableSearchBar() {
    const {
      state: { filterOptions },
      actions: { setFilterOptions },
    } = useUpgradePrebuiltRulesTableContext();

    const handleOnSearch = useCallback(
      (nameString: string) => {
        setFilterOptions((filters) => ({
          ...filters,
          name: nameString.trim(),
        }));
      },
      [setFilterOptions]
    );

    return (
      <RuleSearchField
        initialValue={filterOptions.name ?? ''}
        onSearch={handleOnSearch}
        placeholder={i18n.SEARCH_PLACEHOLDER}
      />
    );
  }
);

UpgradePrebuiltRulesTableSearchBar.displayName = 'UpgradePrebuiltRulesTableSearchBar';

/**
 * Sidebar content: tags and customization status filters for the Upgrade Prebuilt Rules table.
 */
export const UpgradePrebuiltRulesTableFiltersSidebarContent = React.memo(
  function UpgradePrebuiltRulesTableFiltersSidebarContent() {
    const {
      state: { filterOptions, tags },
      actions: { setFilterOptions },
    } = useUpgradePrebuiltRulesTableContext();

    const { isRulesCustomizationEnabled } = usePrebuiltRulesCustomizationStatus();

    const { tags: selectedTags, customization_status: customizationStatus } = filterOptions;

    const handleSelectedTags = useCallback(
      (newTags: string[]) => {
        if (!isEqual(newTags, selectedTags ?? [])) {
          setFilterOptions((filters) => ({
            ...filters,
            tags: newTags,
          }));
        }
      },
      [selectedTags, setFilterOptions]
    );

    const handleCustomizationStatusChange = useCallback(
      (newCustomizationStatus: RuleCustomizationStatus | undefined) => {
        setFilterOptions((filters) => ({
          ...filters,
          customization_status: newCustomizationStatus,
        }));
      },
      [setFilterOptions]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        {isRulesCustomizationEnabled && (
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <RuleCustomizationFilterPopover
                onCustomizationStatusChanged={handleCustomizationStatusChange}
                customizationStatus={customizationStatus}
                data-test-subj="upgradeRulesRuleCustomizationPopover"
              />
            </EuiFilterGroup>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <TagsFilterPopover
              onSelectedTagsChanged={handleSelectedTags}
              selectedTags={selectedTags ?? []}
              tags={tags}
              data-test-subj="upgradeRulesTagPopover"
            />
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

UpgradePrebuiltRulesTableFiltersSidebarContent.displayName =
  'UpgradePrebuiltRulesTableFiltersSidebarContent';
