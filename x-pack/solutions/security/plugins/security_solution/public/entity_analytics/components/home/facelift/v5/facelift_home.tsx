/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';

import { ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY } from '../../constants';
import {
  DataViewContext,
  useEntityURLState,
  DEFAULT_ENTITIES_TABLE_SORT,
  type EntitiesBaseURLQuery,
  type URLQuery,
} from '../../entities_table';
import { SiemSearchBar } from '../../../../../common/components/search_bar';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import type { ActiveFilter, PageFilters, TableView } from './data';
import { EMPTY_PAGE_FILTERS } from './data';
import { EntityFiltersGroup } from './entity_filters_group';
import { OverviewBand } from './overview_band';
import { ResolvedEntitiesGrid } from './resolved_entities_grid';
import { getEntitySummary } from './resolved_entities_data';
import { useSyncEntityFilters } from './overview_filter';

const getDefaultQuery = ({ query, filters }: EntitiesBaseURLQuery): URLQuery => ({
  query,
  filters,
  pageFilters: [],
  sort: DEFAULT_ENTITIES_TABLE_SORT,
  pageIndex: 0,
});

export const FaceliftPageDescription: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const summary = useMemo(() => getEntitySummary(), []);

  const climbing = summary.criticalAndHighDelta >= 0;
  const separator = (
    <span
      aria-hidden={true}
      css={css`
        margin-inline: ${euiTheme.size.s};
        color: ${euiTheme.colors.textDisabled};
      `}
    >
      {'●'}
    </span>
  );

  return (
    <span data-test-subj="eaFaceliftPageDescription">
      {`${summary.total.toLocaleString()} entities`}
      {separator}
      {`${summary.criticalAndHigh.toLocaleString()} critical- and high-risk`}
      {separator}
      <EuiIcon
        type={climbing ? 'sortUp' : 'sortDown'}
        size="s"
        color={climbing ? 'danger' : 'success'}
        aria-hidden={true}
      />
      {` ${Math.abs(summary.criticalAndHighDelta).toLocaleString()} vs yesterday`}
    </span>
  );
};

export interface FaceliftHomeProps {
  dataView: DataView;
  dataViewLoading: boolean;
  selectedWatchlistId?: string;
  onWatchlistChange: (id?: string, name?: string) => void;
}

/**
 * Facelift home body for this version snapshot (filters, overview, entities table).
 * Remount via `key` when switching versions so filters / table state reset.
 */
export const FaceliftHome: React.FC<FaceliftHomeProps> = ({
  dataView,
  dataViewLoading,
  selectedWatchlistId,
  onWatchlistChange,
}) => {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);
  const [pageFilters, setPageFilters] = useState<PageFilters>(EMPTY_PAGE_FILTERS);
  const [tableView, setTableView] = useState<TableView>('resolved');

  // Strip leftover Overview KQL pills; card filters stay in React state only.
  useSyncEntityFilters();

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        {/* 8px between KQL and filter group (eui size s) */}
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <SiemSearchBar dataView={dataView} id={InputsModelId.global} displayStyle="inPage" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EntityFiltersGroup
              pageFilters={pageFilters}
              onPageFiltersChange={setPageFilters}
              selectedWatchlistId={selectedWatchlistId}
              onWatchlistChange={onWatchlistChange}
              tableView={tableView}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <OverviewBand
          activeFilter={activeFilter}
          pageFilters={pageFilters}
          tableView={tableView}
          onFilterChange={setActiveFilter}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EntityAnalyticsEntitiesTable
          entityDataView={dataView}
          entityDataViewLoading={dataViewLoading}
          pageFilters={pageFilters}
          activeFilter={activeFilter}
          view={tableView}
          onViewChange={setTableView}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const EntityAnalyticsEntitiesTable = ({
  entityDataView,
  entityDataViewLoading,
  pageFilters,
  activeFilter,
  view,
  onViewChange,
}: {
  entityDataView: DataView;
  entityDataViewLoading: boolean;
  pageFilters: PageFilters;
  activeFilter: ActiveFilter | null;
  view: TableView;
  onViewChange: (view: TableView) => void;
}) => {
  const dataViewContextValue = useMemo(
    () => ({
      dataView: entityDataView,
      dataViewIsLoading: entityDataViewLoading,
    }),
    [entityDataView, entityDataViewLoading]
  );

  if (entityDataViewLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsEntitiesTableLoader" />;
  }

  return (
    <DataViewContext.Provider value={dataViewContextValue}>
      <EntityAnalyticsEntitiesTableContent
        view={view}
        onViewChange={onViewChange}
        pageFilters={pageFilters}
        activeFilter={activeFilter}
      />
    </DataViewContext.Provider>
  );
};

const EntityAnalyticsEntitiesTableContent = ({
  view,
  onViewChange,
  pageFilters,
  activeFilter,
}: {
  view: TableView;
  onViewChange: (view: TableView) => void;
  pageFilters: PageFilters;
  activeFilter: ActiveFilter | null;
}) => {
  const urlState = useEntityURLState({
    paginationLocalStorageKey: ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
    defaultQuery: getDefaultQuery,
  });

  return (
    <ResolvedEntitiesGrid
      query={urlState.query}
      view={view}
      onViewChange={onViewChange}
      pageFilters={pageFilters}
      activeFilter={activeFilter}
    />
  );
};
