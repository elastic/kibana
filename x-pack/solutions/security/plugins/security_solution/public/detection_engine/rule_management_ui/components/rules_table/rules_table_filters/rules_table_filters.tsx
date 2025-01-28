/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useRuleManagementFilters } from '../../../../rule_management/logic/use_rule_management_filters';
import { RULES_TABLE_ACTIONS } from '../../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../../common/lib/apm/use_start_transaction';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { useRulesTableContext } from '../rules_table/rules_table_context';
import { TagsFilterPopover } from './tags_filter_popover';
import { RuleExecutionStatusSelector } from './rule_execution_status_selector';
import { RuleSearchField } from './rule_search_field';
import type { RuleExecutionStatus } from '../../../../../../common/api/detection_engine';

const FilterWrapper = styled(EuiFlexGroup)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeXS};
`;

/**
 * Collection of filters for filtering data within the RulesTable. Contains search bar, Elastic/Custom
 * Rules filter button toggle, and tag selection
 */
const RulesTableFiltersComponent = () => {
  const { startTransaction } = useStartTransaction();
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { data: ruleManagementFields } = useRuleManagementFilters();
  const allTags = ruleManagementFields?.aggregated_fields.tags ?? [];
  const rulesCustomCount = ruleManagementFields?.rules_summary.custom_count;
  const rulesPrebuiltInstalledCount = ruleManagementFields?.rules_summary.prebuilt_installed_count;

  const {
    showCustomRules,
    showElasticRules,
    tags: selectedTags,
    enabled,
    ruleExecutionStatus: selectedRuleExecutionStatus,
  } = filterOptions;

  const handleOnSearch = useCallback(
    (filterString: string) => {
      startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
      setFilterOptions({ filter: filterString.trim() });
    },
    [setFilterOptions, startTransaction]
  );

  const handleElasticRulesClick = useCallback(() => {
    startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
    setFilterOptions({ showElasticRules: !showElasticRules, showCustomRules: false });
  }, [setFilterOptions, showElasticRules, startTransaction]);

  const handleCustomRulesClick = useCallback(() => {
    startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
    setFilterOptions({ showCustomRules: !showCustomRules, showElasticRules: false });
  }, [setFilterOptions, showCustomRules, startTransaction]);

  const handleShowEnabledRulesClick = useCallback(() => {
    startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
    setFilterOptions(enabled === true ? { enabled: undefined } : { enabled: true });
  }, [setFilterOptions, enabled, startTransaction]);

  const handleShowDisabledRulesClick = useCallback(() => {
    startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
    setFilterOptions(enabled === false ? { enabled: undefined } : { enabled: false });
  }, [setFilterOptions, enabled, startTransaction]);

  const handleSelectedTags = useCallback(
    (newTags: string[]) => {
      if (!isEqual(newTags, selectedTags)) {
        startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
        setFilterOptions({ tags: newTags });
      }
    },
    [selectedTags, setFilterOptions, startTransaction]
  );

  const handleSelectedExecutionStatus = useCallback(
    (newExecutionStatus?: RuleExecutionStatus) => {
      if (newExecutionStatus !== selectedRuleExecutionStatus) {
        startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
        setFilterOptions({ ruleExecutionStatus: newExecutionStatus });
      }
    },
    [selectedRuleExecutionStatus, setFilterOptions, startTransaction]
  );

  return (
    <FilterWrapper gutterSize="m" justifyContent="flexEnd" wrap>
      <RuleSearchField initialValue={filterOptions.filter} onSearch={handleOnSearch} />
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <TagsFilterPopover
            onSelectedTagsChanged={handleSelectedTags}
            selectedTags={selectedTags}
            tags={allTags}
            data-test-subj="allRulesTagPopover"
          />
        </EuiFilterGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <RuleExecutionStatusSelector
            onSelectedStatusChanged={handleSelectedExecutionStatus}
            selectedStatus={selectedRuleExecutionStatus}
          />
        </EuiFilterGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiFilterButton
            hasActiveFilters={showElasticRules}
            onClick={handleElasticRulesClick}
            data-test-subj="showElasticRulesFilterButton"
            withNext
          >
            {i18n.ELASTIC_RULES}
            {rulesPrebuiltInstalledCount != null ? ` (${rulesPrebuiltInstalledCount ?? ''})` : ''}
          </EuiFilterButton>
          <EuiFilterButton
            hasActiveFilters={showCustomRules}
            onClick={handleCustomRulesClick}
            data-test-subj="showCustomRulesFilterButton"
          >
            {i18n.CUSTOM_RULES}
            {rulesCustomCount != null ? ` (${rulesCustomCount})` : ''}
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiFilterButton
            hasActiveFilters={enabled === true}
            onClick={handleShowEnabledRulesClick}
            data-test-subj="showEnabledRulesFilterButton"
            withNext
          >
            {i18n.ENABLED_RULES}
          </EuiFilterButton>
          <EuiFilterButton
            hasActiveFilters={enabled === false}
            onClick={handleShowDisabledRulesClick}
            data-test-subj="showDisabledRulesFilterButton"
          >
            {i18n.DISABLED_RULES}
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
    </FilterWrapper>
  );
};

RulesTableFiltersComponent.displayName = 'RulesTableFiltersComponent';

export const RulesTableFilters = React.memo(RulesTableFiltersComponent);

RulesTableFilters.displayName = 'RulesTableFilters';
