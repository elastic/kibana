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
import { GapFillStatusSelector } from './gap_fill_status_selector';
import { RulesGroupByButton } from '../../../../rule_sets/components/rules_group_by_control';
import { ShowFacetPanelButton } from '../../../../rule_sets/facets/facet_panel_visibility';
import { AiSearchToggle } from '../../../../rule_sets/search/ai_search_toggle';
import {
  searchBoxMode,
  useRuleSearchStatus,
} from '../../../../rule_sets/search/use_rule_search_status';
import { AI_PLACEHOLDER } from '../../../../rule_sets/search/translations';
import { RuleSearchWithFilters } from '../../../../rule_sets/search/rule_search_with_filters';
import {
  SearchSuggestions,
  useRecentAiSearches,
} from '../../../../rule_sets/search/search_suggestions';
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

  const searchStatus = useRuleSearchStatus();
  const boxMode = searchBoxMode(searchStatus, filterOptions.searchMode);
  const { recent, remember } = useRecentAiSearches();
  const handleOnSearch = useCallback(
    (filterString: string) => {
      const text = filterString.trim();
      startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
      if (text && boxMode === 'ai') remember(text);
      setFilterOptions({ filter: text, members: undefined });
    },
    [boxMode, remember, setFilterOptions, startTransaction]
  );
  const handleApplyFilter = useCallback(() => {
    startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
  }, [startTransaction]);
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
      <RuleSearchWithFilters
        onSearch={handleOnSearch}
        onApplyFilter={handleApplyFilter}
        placeholder={boxMode === 'ai' ? AI_PLACEHOLDER : undefined}
        recentSearches={
          boxMode === 'ai' ? (
            <SearchSuggestions recent={recent} onPick={handleOnSearch} />
          ) : undefined
        }
        prepend={
          searchStatus === 'unavailable' ? undefined : (
            <AiSearchToggle
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
