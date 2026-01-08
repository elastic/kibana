/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import { LinkEntitiesModal } from './components/link_entities_modal';
import { GroupedEntitiesList } from './components/grouped_entities_list';
import { useErrorToast } from '../../../common/hooks/use_error_toast';
import type { CriticalityLevels } from '../../../../common/constants';
import { type RiskSeverity } from '../../../../common/search_strategy';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { Direction } from '../../../../common/search_strategy/common';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import type { Criteria } from '../../../explore/components/paginated_table';
import { PaginatedTable } from '../../../explore/components/paginated_table';
import { SeverityFilter } from '../severity/severity_filter';
import { EntitySourceFilter } from './components/entity_source_filter';
import { useEntitiesListFilters } from './hooks/use_entities_list_filters';
import { AssetCriticalityFilter } from '../asset_criticality/asset_criticality_filter';
import { useEntitiesListQuery } from './hooks/use_entities_list_query';
import { ENTITIES_LIST_TABLE_ID, rowItems } from './constants';
import { useEntitiesListColumns } from './hooks/use_entities_list_columns';
import type { EntitySourceTag } from './types';
import { useEntityStoreTypes } from '../../hooks/use_enabled_entity_types';

type ViewMode = 'list' | 'grouped';

const VIEW_TOGGLE_OPTIONS = [
  {
    id: 'list' as ViewMode,
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.entityStore.entitiesList.listViewButton',
      { defaultMessage: 'List' }
    ),
    iconType: 'list',
  },
  {
    id: 'grouped' as ViewMode,
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.entityStore.entitiesList.groupedViewButton',
      { defaultMessage: 'Grouped' }
    ),
    iconType: 'layers',
  },
];

export const EntitiesList: React.FC = () => {
  const { deleteQuery, setQuery, isInitializing, from, to } = useGlobalTime();
  const [activePage, setActivePage] = useState(0);
  const [limit, setLimit] = useState(10);
  const { toggleStatus } = useQueryToggle(ENTITIES_LIST_TABLE_ID);
  const [sorting, setSorting] = useState({
    field: '@timestamp',
    direction: Direction.desc,
  });
  const entityTypes = useEntityStoreTypes();
  const [selectedSeverities, setSelectedSeverities] = useState<RiskSeverity[]>([]);
  const [selectedCriticalities, setSelectedCriticalities] = useState<CriticalityLevels[]>([]);
  const [selectedSources, setSelectedSources] = useState<EntitySourceTag[]>([]);
  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const openLinkModal = useCallback(() => setIsLinkModalVisible(true), []);
  const closeLinkModal = useCallback(() => setIsLinkModalVisible(false), []);

  const onViewModeChange = useCallback((id: string) => {
    setViewMode(id as ViewMode);
  }, []);

  const filter = useEntitiesListFilters({
    selectedSeverities,
    selectedCriticalities,
    selectedSources,
  });

  const [querySkip, setQuerySkip] = useState(isInitializing || !toggleStatus);
  useEffect(() => {
    if (!isInitializing) {
      setQuerySkip(isInitializing || !toggleStatus);
    }
  }, [isInitializing, toggleStatus]);

  const onSort = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const newSort = criteria.sort;
        if (newSort.direction !== sorting.direction || newSort.field !== sorting.field) {
          setSorting(newSort);
        }
      }
    },
    [setSorting, sorting]
  );

  const searchParams = useMemo(
    () => ({
      entityTypes,
      page: activePage + 1,
      perPage: limit,
      sortField: sorting.field,
      sortOrder: sorting.direction,
      skip: querySkip,
      filterQuery: JSON.stringify({
        bool: {
          filter,
        },
      }),
    }),
    [entityTypes, activePage, limit, sorting.field, sorting.direction, querySkip, filter]
  );
  const { data, isLoading, isRefetching, refetch, error } = useEntitiesListQuery(searchParams);

  useQueryInspector({
    queryId: ENTITIES_LIST_TABLE_ID,
    loading: isLoading || isRefetching,
    refetch,
    setQuery,
    deleteQuery,
    inspect: data?.inspect ?? null,
  });

  // Reset the active page when the search criteria changes
  useEffect(() => {
    setActivePage(0);
  }, [sorting, limit, filter]);

  const columns = useEntitiesListColumns();

  // Force a refetch when "refresh" button is clicked.
  // If we implement the timerange filter we can get rid of this code
  useEffect(() => {
    refetch();
  }, [from, to, refetch]);

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.entitiesList.queryError', {
      defaultMessage: 'There was an error loading the entities list',
    }),
    error
  );

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <h3>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.entityStore.entitiesList.tableTitle',
                { defaultMessage: 'Entities' }
              )}
            </h3>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.entityStore.entitiesList.viewToggleLegend',
                  { defaultMessage: 'View mode' }
                )}
                options={VIEW_TOGGLE_OPTIONS}
                idSelected={viewMode}
                onChange={onViewModeChange}
                buttonSize="compressed"
                data-test-subj="entitiesViewToggle"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="link"
                onClick={openLinkModal}
                data-test-subj="linkEntitiesButton"
                size="s"
              >
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.entityStore.entitiesList.linkEntitiesButton',
                  { defaultMessage: 'Link Entities' }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {viewMode === 'grouped' ? (
        <EuiPanel hasBorder paddingSize="m">
          <GroupedEntitiesList />
        </EuiPanel>
      ) : (
        <PaginatedTable
          id={ENTITIES_LIST_TABLE_ID}
          activePage={activePage}
          columns={columns}
          headerCount={data?.total ?? 0}
          titleSize="s"
          headerTitle=""
          headerTooltip={i18n.translate(
            'xpack.securitySolution.entityAnalytics.entityStore.entitiesList.tableTooltip',
            {
              defaultMessage: 'Entity data can take a couple of minutes to appear',
            }
          )}
          limit={limit}
          loading={isLoading || isRefetching}
          isInspect={false}
          updateActivePage={setActivePage}
          loadPage={noop}
          pageOfItems={data?.records ?? []}
          setQuerySkip={setQuerySkip}
          showMorePagesIndicator={false}
          updateLimitPagination={setLimit}
          totalCount={data?.total ?? 0}
          itemsPerRow={rowItems}
          sorting={sorting}
          onChange={onSort}
          headerFilters={
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  <SeverityFilter
                    selectedItems={selectedSeverities}
                    onSelect={setSelectedSeverities}
                  />
                  <AssetCriticalityFilter
                    selectedItems={selectedCriticalities}
                    onChange={setSelectedCriticalities}
                  />
                  <EntitySourceFilter
                    selectedItems={selectedSources}
                    onChange={setSelectedSources}
                  />
                </EuiFilterGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      )}
      <LinkEntitiesModal visible={isLinkModalVisible} onClose={closeLinkModal} />
    </>
  );
};
