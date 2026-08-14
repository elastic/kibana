/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-views-plugin/common';

import { ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY } from '../../constants';
import {
  DataViewContext,
  useEntityURLState,
  DEFAULT_ENTITIES_TABLE_SORT,
  type EntitiesBaseURLQuery,
  type URLQuery,
} from '../../entities_table';
import type { ActiveFilter, PageFilters, TableView } from './data';
import { EMPTY_PAGE_FILTERS } from './data';
import { EntityFiltersGroup } from './entity_filters_group';
import { OverviewBand } from './overview_band';
import { ResolvedEntitiesGrid } from './resolved_entities_grid';
import { getEntitySummary } from './resolved_entities_data';
import type { PageFilterFacet } from './overview_filter';
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

  const clearActiveFilter = useCallback(() => setActiveFilter(null), []);

  const clearFacet = useCallback(
    (facet: PageFilterFacet) => setPageFilters((current) => ({ ...current, [facet]: [] })),
    []
  );

  useSyncEntityFilters({
    activeFilter,
    pageFilters,
    onClearOverview: clearActiveFilter,
    onClearFacet: clearFacet,
    dataViewId: dataView?.id,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <EntityFiltersGroup
          pageFilters={pageFilters}
          onPageFiltersChange={setPageFilters}
          selectedWatchlistId={selectedWatchlistId}
          onWatchlistChange={onWatchlistChange}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <OverviewBand
          activeFilter={activeFilter}
          pageFilters={pageFilters}
          onFilterChange={setActiveFilter}
        />
      </EuiFlexItem>

      <EuiPanel hasBorder paddingSize="l">
        <EntityAnalyticsEntitiesTable
          entityDataView={dataView}
          entityDataViewLoading={dataViewLoading}
        />
      </EuiPanel>
    </EuiFlexGroup>
  );
};

const TABLE_VIEW_OPTIONS: Array<{ id: TableView; label: string; iconType: IconType }> = [
  { id: 'resolved', label: 'Resolved entities', iconType: 'aggregate' },
  { id: 'raw', label: 'Raw records', iconType: 'listBullet' },
];

const EntityAnalyticsEntitiesTable = ({
  entityDataView,
  entityDataViewLoading,
}: {
  entityDataView: DataView;
  entityDataViewLoading: boolean;
}) => {
  const [view, setView] = useState<TableView>('resolved');

  const dataViewContextValue = useMemo(
    () => ({
      dataView: entityDataView,
      dataViewIsLoading: entityDataViewLoading,
    }),
    [entityDataView, entityDataViewLoading]
  );

  const onChangeView = useCallback((id: string) => setView(id as TableView), []);

  if (entityDataViewLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsEntitiesTableLoader" />;
  }

  return (
    <DataViewContext.Provider value={dataViewContextValue}>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="m"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.homePage.entitiesTableTitle"
                defaultMessage="Entities"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Entities table view"
            options={TABLE_VIEW_OPTIONS}
            idSelected={view}
            onChange={onChangeView}
            buttonSize="compressed"
            data-test-subj="eaFaceliftEntitiesViewToggle"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EntityAnalyticsEntitiesTableContent view={view} />
    </DataViewContext.Provider>
  );
};

const EntityAnalyticsEntitiesTableContent = ({ view }: { view: TableView }) => {
  const urlState = useEntityURLState({
    paginationLocalStorageKey: ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
    defaultQuery: getDefaultQuery,
  });

  return <ResolvedEntitiesGrid query={urlState.query} view={view} />;
};
