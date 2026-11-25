/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import type { GapFillStatus } from '@kbn/alerting-plugin/common';
import styled from 'styled-components';
import { RULES_TABLE_ACTIONS } from '../../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../../common/lib/apm/use_start_transaction';
import { useRulesTableContext } from '../rules_table/rules_table_context';
import { AllRulesTabs } from '../constants';
import { RuleSearchField } from './rule_search_field';
import { GapFillStatusSelector } from './gap_fill_status_selector';
import { RulesGroupByButton } from '../../../../rule_sets/components/rules_group_by_control';
import { ShowFacetPanelButton } from '../../../../rule_sets/facets/facet_panel_visibility';
import { SearchModeSwitch } from '../../../../rule_sets/search/search_mode_switch';
import {
  searchBoxMode,
  useRuleSearchStatus,
} from '../../../../rule_sets/search/use_rule_search_status';
import { AI_PLACEHOLDER } from '../../../../rule_sets/search/translations';
import type { RuleSearchBoxMode } from '../../../../rule_management/logic/types';

const FilterWrapper = styled(EuiFlexGroup)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeXS};
`;

interface RulesTableFiltersProps {
  selectedTab: AllRulesTabs;
}

/**
 * Search and view settings above the rules table. The filters are facets in the panel on the
 * left (`RulesFacetPanel`); the gap filter stays here on the monitoring tab.
 */
const RulesTableFiltersComponent = ({ selectedTab }: RulesTableFiltersProps) => {
  const { startTransaction } = useStartTransaction();
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { gapFillStatuses } = filterOptions;

  const handleOnSearch = useCallback(
    (filterString: string) => {
      startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
      setFilterOptions({ filter: filterString.trim(), members: undefined });
    },
    [setFilterOptions, startTransaction]
  );

  const searchStatus = useRuleSearchStatus();
  const boxMode = searchBoxMode(searchStatus, filterOptions.searchMode);
  const handleSearchModeChange = useCallback(
    (searchMode: RuleSearchBoxMode) => {
      startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
      setFilterOptions({ searchMode });
    },
    [setFilterOptions, startTransaction]
  );

  const handleSelectedGapStatuses = useCallback(
    (newStatuses: GapFillStatus[]) => {
      const currentStatuses = gapFillStatuses ?? [];
      if (!isEqual(newStatuses, currentStatuses)) {
        startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
        setFilterOptions({ gapFillStatuses: newStatuses });
      }
    },
    [gapFillStatuses, setFilterOptions, startTransaction]
  );

  return (
    <FilterWrapper gutterSize="m" justifyContent="flexEnd" alignItems="center" wrap>
      <ShowFacetPanelButton conditions={filterOptions.conditions ?? {}} />
      <RuleSearchField
        initialValue={filterOptions.filter}
        onSearch={handleOnSearch}
        placeholder={boxMode === 'ai' ? AI_PLACEHOLDER : undefined}
        prepend={
          searchStatus === 'unavailable' ? undefined : (
            <SearchModeSwitch
              status={searchStatus}
              mode={boxMode}
              onChange={handleSearchModeChange}
            />
          )
        }
      />
      {selectedTab === AllRulesTabs.monitoring && (
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <GapFillStatusSelector
              selectedStatuses={gapFillStatuses ?? []}
              onSelectedStatusesChanged={handleSelectedGapStatuses}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <RulesGroupByButton />
      </EuiFlexItem>
    </FilterWrapper>
  );
};

RulesTableFiltersComponent.displayName = 'RulesTableFiltersComponent';

export const RulesTableFilters = React.memo(RulesTableFiltersComponent);
