/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import type { FilterValue } from '../../../../../common/filter_values';
import type {
  OverviewFilterName,
  OverviewFilterOptions,
  OverviewFilters,
} from '../../../../../common/overview_filters';
import { ApplicationTabToolbar } from '../../../../components/application_tab_toolbar';
import { useFittingCount } from '../../../../hooks/use_fitting_count';
import type { Formatters } from '../../../../hooks/use_formatters';
import { limitFilters, OverviewFilterButtons, visibleFilters } from './overview_filters';
import { OverviewSearchBar } from './overview_search_bar';

/**
 * The row of the Overview's query, environment, filters and date picker. It keeps to one row: when
 * it is too narrow, the filters give way, those without a selection first and the least important
 * first. What they select stays in the pills below, and every filter in "All filters".
 *
 * The fitting renders the row once per filter it takes away, so it lives here and not in the
 * Overview, whose charts would render with it.
 */
export function OverviewToolbar({
  environments,
  filterOptions,
  filters,
  setFilter,
  onOpenAllFilters,
  isLoading,
  onRefresh,
  formatters,
}: {
  /** `undefined` until the Overview has loaded once. */
  environments: string[] | undefined;
  filterOptions: OverviewFilterOptions | undefined;
  filters: OverviewFilters;
  setFilter: (name: OverviewFilterName, values: FilterValue[]) => void;
  onOpenAllFilters: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  formatters: Pick<Formatters, 'formatNumber'>;
}) {
  const pinnedFilters = visibleFilters(filterOptions, filters);
  const { count: fittingCount, containerRef } = useFittingCount({
    total: pinnedFilters.length,
    resetKey: `${pinnedFilters.join()}|${pinnedFilters
      .filter((name) => (filters[name] ?? []).length > 0)
      .join()}`,
  });
  const shownFilters = limitFilters(pinnedFilters, filters, fittingCount);

  return (
    <ApplicationTabToolbar
      containerRef={containerRef}
      environments={environments}
      isLoading={isLoading}
      onRefresh={onRefresh}
      leading={
        // The bar is never narrower than 300px, which the row has to leave room for.
        <EuiFlexItem grow css={{ minInlineSize: 300 }}>
          <OverviewSearchBar onRefresh={onRefresh} />
        </EuiFlexItem>
      }
      filters={
        <OverviewFilterButtons
          names={shownFilters}
          options={filterOptions}
          filters={filters}
          setFilter={setFilter}
          onOpenAllFilters={onOpenAllFilters}
          isLoading={isLoading}
          formatters={formatters}
        />
      }
    />
  );
}
