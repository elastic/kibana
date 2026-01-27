/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiFieldSearch,
} from '@elastic/eui';
import React, { memo, useCallback } from 'react';
import { CoverageOverviewLegend } from './shared_components/dashboard_legend';
import * as i18n from './translations';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';
import { RuleActivityFilter } from './rule_activity_filter';
import { RuleSourceFilter } from './rule_source_filter';

const CoverageOverviewFiltersPanelComponent = () => {
  const {
    state: { filter, isLoading, showExpandedCells },
    actions: {
      setShowExpandedCells,
      setRuleActivityFilter,
      setRuleSourceFilter,
      setRuleSearchFilter,
    },
  } = useCoverageOverviewDashboardContext();

  const handleExpandCellsFilterClick = () => setShowExpandedCells(true);
  const handleCollapseCellsFilterClick = () => setShowExpandedCells(false);

  const handleRuleSearchOnChange = useCallback(
    (queryText: string) => {
      setRuleSearchFilter(queryText?.trim());
    },
    [setRuleSearchFilter]
  );

  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={0}>
              <RuleActivityFilter
                onChange={setRuleActivityFilter}
                isLoading={isLoading}
                selected={filter.activity ?? []}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={0}>
              <RuleSourceFilter
                onChange={setRuleSourceFilter}
                isLoading={isLoading}
                selected={filter.source ?? []}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiFieldSearch
                fullWidth
                incremental={false}
                data-test-subj="coverageOverviewFilterSearchBar"
                placeholder={i18n.CoverageOverviewSearchBarPlaceholder}
                onSearch={handleRuleSearchOnChange}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiFilterButton
                  withNext
                  isToggle
                  isSelected={!showExpandedCells}
                  hasActiveFilters={!showExpandedCells}
                  onClick={handleCollapseCellsFilterClick}
                >
                  {i18n.COLLAPSE_CELLS_FILTER_BUTTON}
                </EuiFilterButton>
                <EuiFilterButton
                  isToggle
                  isSelected={showExpandedCells}
                  hasActiveFilters={showExpandedCells}
                  onClick={handleExpandCellsFilterClick}
                >
                  {i18n.EXPAND_CELLS_FILTER_BUTTON}
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CoverageOverviewLegend />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const CoverageOverviewFiltersPanel = memo(CoverageOverviewFiltersPanelComponent);
