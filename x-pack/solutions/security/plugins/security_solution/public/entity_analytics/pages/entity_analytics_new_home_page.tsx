/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { GroupSelector } from '@kbn/grouping/src/components/group_selector';
import { Global, css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { isNoneGroup } from '@kbn/grouping';
import type { EntityType } from '@kbn/entity-store/public';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { PageLoader } from '../../common/components/page_loader';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { EntitySearchBar } from '../components/home/entity_search_bar';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useGlobalFilterQuery } from '../../common/hooks/use_global_filter_query';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import { DataViewErrorComponent } from '../../common/components/data_view_error';
import { useEntityStoreStatus } from '../components/entity_store/hooks/use_entity_store';
import { EntityStoreDisabledEmptyPrompt } from './entity_store_disabled_empty_prompt';
import { useGetWatchlists } from '../api/hooks/use_get_watchlists';
import { useErrorToast } from '../../common/hooks/use_error_toast';
import { DataViewContext } from '../components/home/entities_table';
import {
  EntitiesGroups,
  EntitiesGrid,
  useEntityAnalyticsUrlState,
  useEntityGridFilters,
  RAW_VIEW_COLUMNS,
  RESOLVED_VIEW_COLUMNS,
} from '../components/home/new_entities_table';
import type {
  RowActions,
  CellHandlers,
  EntityFilters,
} from '../components/home/new_entities_table';
import { ENTITY_GROUPING_OPTIONS } from '../components/home/entities_table/constants';
import type { EntityURLStateResult } from '../components/home/entities_table/hooks/use_entity_url_state';
import { EntityFiltersBar } from '../components/home/entity_filters_bar';
import {
  EntityType as SecurityEntityType,
  EntityTypeToIdentifierField,
} from '../../../common/entity_analytics/types';
import { createDataProviders } from '../../app/actions/add_to_timeline/data_provider';
import { useInvestigateInTimeline } from '../../common/hooks/timeline/use_investigate_in_timeline';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import type { ESBoolQuery } from '../../../common/typed_json';

const ENTITY_TABLE_SCOPE_ID = 'entity-analytics-new-entities-table';

const VIEW_BY_OPTIONS = [
  {
    key: 'resolved',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.viewBy.resolvedLabel', {
      defaultMessage: 'Resolved entities',
    }),
  },
  {
    key: 'raw',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.viewBy.rawLabel', {
      defaultMessage: 'Raw records',
    }),
  },
];

const GROUP_BY_OPTIONS = [
  {
    key: ENTITY_GROUPING_OPTIONS.RESOLUTION,
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.groupBy.resolutionLabel', {
      defaultMessage: 'Resolution',
    }),
  },
  {
    key: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE,
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.groupBy.entityTypeLabel', {
      defaultMessage: 'Entity type',
    }),
  },
];

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.home.pageTitle', {
  defaultMessage: 'Entity Analytics',
});

const MANAGEMENT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.managementLink',
  { defaultMessage: 'Management' }
);

const GROUP_BY_SELECTOR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.groupBySelector.title',
  { defaultMessage: 'Group by' }
);

const VIEW_BY_SELECTOR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.viewBySelector.title',
  { defaultMessage: 'View by' }
);

const buildCombinedFilter = (
  esFilter: ESBoolQuery | undefined,
  entityFilters: EntityFilters,
  view: 'resolved' | 'raw'
) => {
  const filterClauses = [
    ...(esFilter ? [esFilter] : []),
    ...(entityFilters.entityTypes.length
      ? [{ terms: { 'entity.EngineMetadata.Type': entityFilters.entityTypes } }]
      : []),
    ...(entityFilters.riskLevels.length
      ? [{ terms: { 'entity.risk.calculated_level': entityFilters.riskLevels } }]
      : []),
    ...(entityFilters.assetCriticality.length
      ? [{ terms: { 'asset.criticality': entityFilters.assetCriticality } }]
      : []),
    ...(entityFilters.watchlists.length
      ? [{ terms: { 'entity.attributes.watchlists': entityFilters.watchlists } }]
      : []),
    ...(entityFilters.dataSources.length
      ? [{ terms: { 'entity.source': entityFilters.dataSources } }]
      : []),
  ];
  const mustNotClauses =
    view === 'resolved'
      ? [{ exists: { field: 'entity.relationships.resolution.resolved_to' } }]
      : [];
  return filterClauses.length || mustNotClauses.length
    ? { bool: { filter: filterClauses, must: [], must_not: mustNotClauses, should: [] } }
    : undefined;
};

export const EntityAnalyticsNewHomePage: React.FC = () => {
  const spaceId = useSpaceId();
  const {
    dataView,
    isLoading: isDataViewLoading,
    error: isDataViewError,
  } = useEntityStoreDataView(spaceId);
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { euiTheme } = useEuiTheme();
  const {
    openEntityFlyout,
    openEntityResolution,
    openEntityAlertsInsights,
    openEntityAnomalyInsights,
    openEntityGraphView,
  } = useFlyoutApi();
  const { investigateInTimeline } = useInvestigateInTimeline();
  const euidApi = useEntityStoreEuidApi();
  const {
    timeRange,
    setTimeRange,
    entityFilters,
    setEntityFilters,
    view: viewBy,
    setView: setViewBy,
    sortField,
    sortDirection,
    setSort,
    pageIndex,
    pageSize,
    setPage,
    setPageSize,
  } = useEntityAnalyticsUrlState();

  const activeColumns = viewBy === 'raw' ? RAW_VIEW_COLUMNS : RESOLVED_VIEW_COLUMNS;

  const onEntityNameClick = useCallback(
    (row: Record<string, unknown>) => {
      const entityId = row['entity.id'] as string;
      const entityName = row['entity.name'] as string | undefined;
      const engineType = row['entity.EngineMetadata.Type'] as string | undefined;
      if (!entityId) return;
      openEntityFlyout({
        entityId,
        entityName,
        engineType,
        scopeId: ENTITY_TABLE_SCOPE_ID,
        contextID: ENTITY_TABLE_SCOPE_ID,
        origin: FLYOUT_ORIGIN.ENTITIES_TABLE,
      });
    },
    [openEntityFlyout]
  );

  const onGroupSizeClick = useCallback(
    (row: Record<string, unknown>) => {
      const entityId = row['entity.id'] as string;
      const entityName = row['entity.name'] as string;
      const entityType = row['entity.EngineMetadata.Type'] as EntityType;
      if (!entityId) return;
      openEntityResolution({
        entityId,
        entityName,
        entityType,
        scopeId: ENTITY_TABLE_SCOPE_ID,
      });
    },
    [openEntityResolution]
  );

  const onAlertCountClick = useCallback(
    (row: Record<string, unknown>) => {
      const entityId = row['entity.id'] as string;
      const entityName = row['entity.name'] as string;
      const rawType = row['entity.EngineMetadata.Type'] as string;
      if (!entityId) return;
      const entityType =
        rawType === 'host'
          ? SecurityEntityType.host
          : rawType === 'user'
          ? SecurityEntityType.user
          : SecurityEntityType.generic;
      const value = entityType === SecurityEntityType.generic ? entityId : entityName;
      openEntityAlertsInsights({ entityType, value, entityId, scopeId: ENTITY_TABLE_SCOPE_ID });
    },
    [openEntityAlertsInsights]
  );

  const onAnomalyCountClick = useCallback(
    (row: Record<string, unknown>) => {
      const entityId = row['entity.id'] as string;
      const entityName = row['entity.name'] as string;
      const rawType = row['entity.EngineMetadata.Type'] as string;
      if (!entityId || (rawType !== 'host' && rawType !== 'user')) return;
      const entityType = rawType === 'host' ? SecurityEntityType.host : SecurityEntityType.user;
      openEntityAnomalyInsights({ entityType, value: entityName, entityId });
    },
    [openEntityAnomalyInsights]
  );

  const cellHandlers = useMemo<CellHandlers>(
    () => ({ onEntityNameClick, onGroupSizeClick, onAlertCountClick, onAnomalyCountClick }),
    [onEntityNameClick, onGroupSizeClick, onAlertCountClick, onAnomalyCountClick]
  );

  const rowActions = useMemo<RowActions>(
    () => ({
      onInvestigateInTimeline: (row) => {
        const entityType = row['entity.EngineMetadata.Type'] as SecurityEntityType | undefined;
        const entityName = row['entity.name'] as string | undefined;
        if (!entityName || !entityType) return;
        const kqlFilter = euidApi?.euid.kql.getEuidFilterBasedOnDocument(entityType, row);
        if (kqlFilter) {
          investigateInTimeline({ query: { query: kqlFilter, language: 'kuery' } });
          return;
        }
        const field = EntityTypeToIdentifierField[entityType] ?? 'entity.id';
        const dataProviders = createDataProviders({
          contextId: ENTITY_TABLE_SCOPE_ID,
          field,
          values: entityName,
        });
        if (dataProviders?.length) investigateInTimeline({ dataProviders });
      },
      onOpenEntityGraph: (row) => {
        const entityId = row['entity.id'] as string;
        const entityName = row['entity.name'] as string;
        if (!entityId) return;
        openEntityGraphView({
          entityId,
          entityName,
          scopeId: ENTITY_TABLE_SCOPE_ID,
          onShowEntity: ({ engineType, entityId: relatedId, entityName: relatedName }) => {
            openEntityFlyout({
              engineType,
              entityId: relatedId,
              entityName: relatedName,
              scopeId: ENTITY_TABLE_SCOPE_ID,
            });
          },
        });
      },
    }),
    [euidApi, investigateInTimeline, openEntityGraphView, openEntityFlyout]
  );

  const { filterQuery: esFilter } = useGlobalFilterQuery({ dataView });
  const { whereExpression } = useEntityGridFilters();

  const { data: watchlistsData, error: watchlistsError } = useGetWatchlists();
  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.watchlists.queryError', {
      defaultMessage: 'There was an error loading watchlists',
    }),
    watchlistsError
  );
  const watchlistNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of watchlistsData ?? []) {
      if (w.id) map.set(w.id, w.name);
    }
    return map;
  }, [watchlistsData]);

  const [groupsSelected, setGroupsSelected] = useState<string[]>(['none']);
  const [groupingPageIndex, setGroupingPageIndex] = useState(0);
  const [groupingPageSize, setGroupingPageSize] = useState(25);

  const combinedFilter = useMemo(
    () => buildCombinedFilter(esFilter, entityFilters, viewBy),
    [esFilter, entityFilters, viewBy]
  );

  const groupingState = useMemo<EntityURLStateResult>(
    () => ({
      query: (combinedFilter as ESBoolQuery | undefined) ?? {
        bool: { filter: [], must: [], should: [], must_not: [] },
      },
      setUrlQuery: () => {},
      pageSize: groupingPageSize,
      pageIndex: groupingPageIndex,
      onChangePage: setGroupingPageIndex,
      onChangeItemsPerPage: setGroupingPageSize,
      sort: [],
      filters: [],
      onSort: () => {},
      onResetFilters: () => {},
      getRowsFromPages: () => [],
    }),
    [combinedFilter, groupingPageSize, groupingPageIndex]
  );

  const isGroupSelected = !isNoneGroup(groupsSelected);

  const groupBySelectorElement = (
    <GroupSelector
      groupingId="ea-new-home-group-by"
      groupsSelected={groupsSelected}
      onGroupChange={(key) => {
        setGroupsSelected((prev) => {
          if (key === 'none') return ['none'];
          const cleaned = prev.filter((g) => g !== 'none');
          if (cleaned.includes(key)) {
            const next = cleaned.filter((g) => g !== key);
            return next.length ? next : ['none'];
          }
          return [...cleaned, key];
        });
      }}
      options={GROUP_BY_OPTIONS.filter(
        (o) => !(viewBy === 'resolved' && o.key === ENTITY_GROUPING_OPTIONS.RESOLUTION)
      )}
      fields={isDataViewLoading ? [] : dataView.fields.getAll()}
      title={GROUP_BY_SELECTOR_TITLE}
      maxGroupingLevels={3}
      settings={{ hideCustomFieldOption: false }}
    />
  );

  const viewBySelectorElement = (
    <GroupSelector
      groupingId="ea-new-home-view-by"
      groupsSelected={[viewBy]}
      onGroupChange={(key) => {
        const nextView = key as 'resolved' | 'raw';
        setViewBy(nextView);
        if (nextView === 'resolved') {
          setGroupsSelected((prev) => {
            const filtered = prev.filter((g) => g !== ENTITY_GROUPING_OPTIONS.RESOLUTION);
            return filtered.length ? filtered : ['none'];
          });
        }
      }}
      options={VIEW_BY_OPTIONS}
      fields={[]}
      title={VIEW_BY_SELECTOR_TITLE}
      maxGroupingLevels={1}
      settings={{ hideNoneOption: true, hideCustomFieldOption: true }}
    />
  );

  const viewControls = (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>{viewBySelectorElement}</EuiFlexItem>
      <EuiFlexItem grow={false}>{groupBySelectorElement}</EuiFlexItem>
    </EuiFlexGroup>
  );

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'entityAnalyticsManagement',
          label: MANAGEMENT_LABEL,
          iconType: 'gear' as const,
          href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.entityAnalyticsManagement }),
        },
      ],
    }),
    [getSecuritySolutionUrl]
  );

  const { data: entityStoreStatusData } = useEntityStoreStatus();
  const entityStoreDisabled =
    entityStoreStatusData?.status === 'not_installed' ||
    entityStoreStatusData?.status === 'stopped';
  const entityStoreInstalling = entityStoreStatusData?.status === 'installing';

  if (isDataViewLoading || entityStoreInstalling) return <PageLoader />;
  if (isDataViewError) return <DataViewErrorComponent />;
  if (entityStoreDisabled) return <EntityStoreDisabledEmptyPrompt />;

  return (
    <>
      <Global
        styles={css`
          body.euiDataGrid__restrictBody .entityAnalyticsPageHeader,
          body.euiDataGrid__restrictBody .entityAnalyticsSearchSection {
            display: none;
          }
        `}
      />
      <div className="entityAnalyticsPageHeader">
        <AppHeader title={PAGE_TITLE} menu={menu} spacing="flush" />
      </div>
      <SecuritySolutionPageWrapper noPadding data-test-subj="entityAnalyticsNewHomePage">
        <div
          className="entityAnalyticsSearchSection"
          css={css`
            padding-block-start: ${euiTheme.size.s};
            display: flex;
            flex-direction: column;
            height: 100%;
          `}
        >
          {/* SiemSearchBar has internal left padding; pull it left so its content aligns with the page edge */}
          <div
            css={css`
              margin-inline-start: -${euiTheme.size.s};
            `}
          >
            <EntitySearchBar
              dataView={dataView}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>

          <EuiSpacer size="s" />

          <EntityFiltersBar
            filters={entityFilters}
            onFiltersChange={setEntityFilters}
            spaceId={spaceId}
            view={viewBy}
            esFilter={esFilter}
            watchlistNames={watchlistNames}
          />
        </div>

        <EuiSpacer size="m" />

        <div
          css={css`
            padding-inline: ${euiTheme.size.base};
            padding-block-end: ${euiTheme.size.base};
          `}
        >
          <DataViewContext.Provider value={{ dataView, dataViewIsLoading: isDataViewLoading }}>
            {isGroupSelected ? (
              <EntitiesGroups
                state={groupingState}
                groupsSelected={groupsSelected}
                timeRange={timeRange}
                watchlistNames={watchlistNames}
                view={viewBy}
                groupSelectorComponent={viewControls}
                cellHandlers={cellHandlers}
                rowActions={rowActions}
              />
            ) : (
              <EntitiesGrid
                columns={activeColumns}
                view={viewBy}
                timeRange={timeRange}
                watchlistNames={watchlistNames}
                whereExpression={whereExpression}
                cellHandlers={cellHandlers}
                rowActions={rowActions}
                groupSelectorComponent={viewControls}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={setSort}
                pageIndex={pageIndex}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </DataViewContext.Provider>
        </div>
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};
