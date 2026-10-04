/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  type EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { GroupSelector } from '@kbn/grouping/src/components/group_selector';
import { Global, css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isNoneGroup } from '@kbn/grouping';
import type { EntityType } from '@kbn/entity-store/public';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { PageLoader } from '../../common/components/page_loader';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { EntitySearchBar } from '../components/home/entity_search_bar';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useGlobalFilterQuery } from '../../common/hooks/use_global_filter_query';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import { DataViewErrorComponent } from '../../common/components/data_view_error';
import { useEntityStoreStatus } from '../components/entity_store/hooks/use_entity_store';
import { EntityStoreDisabledEmptyPrompt } from './entity_store_disabled_empty_prompt';
import { useGetWatchlists } from '../api/hooks/use_get_watchlists';
import { useErrorToast } from '../../common/hooks/use_error_toast';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { DataViewContext } from '../components/home/entities_table';
import {
  EntitiesGroups,
  EntitiesGrid,
  useEntityAnalyticsUrlState,
  useEntityGridFilters,
  buildEntityFiltersQuery,
  INDIVIDUAL_ROWS_COLUMNS,
  RESOLVED_ROWS_COLUMNS,
  toList,
  joinAnd,
} from '../components/home/new_entities_table';
import type {
  RowActions,
  CellHandlers,
  EntityFilters,
  RowsMode,
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
import { EntityAnalyticsHomeHeader } from './entity_analytics_home_header';
import { isDefined } from '../../../common/utils/nullable';
import {
  useAlertBasedTiles,
  useEntitiesWithAnomaliesCount,
  useNewEntityCount,
  useRiskMoversCount,
  useNewlyHighCriticalCount,
} from '../components/home/needs_attention_tiles/hooks';
import { SignalCards } from '../components/home/needs_attention_tiles/signal_cards';
import {
  EMPTY_ENTITY_IDS,
  type SignalCardData,
  type SignalCardId,
} from '../components/home/needs_attention_tiles/data';

const ENTITY_TABLE_SCOPE_ID = 'entity-analytics-new-entities-table';

/** Cap tile → table IN-list size; ES|QL IN lists and ES terms queries both have practical limits. */
const MAX_TILE_FILTER_ENTITY_IDS = 1000;

const ROWS_OPTIONS = [
  {
    key: 'resolved',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.rows.resolvedLabel', {
      defaultMessage: 'Resolved entities',
    }),
    description: i18n.translate(
      'xpack.securitySolution.entityAnalytics.home.rows.resolvedDescription',
      {
        defaultMessage: 'One row per resolved entity; its individual records are nested underneath',
      }
    ),
  },
  {
    key: 'individual',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.rows.individualLabel', {
      defaultMessage: 'Individual records',
    }),
    description: i18n.translate(
      'xpack.securitySolution.entityAnalytics.home.rows.individualDescription',
      {
        defaultMessage: 'One row per individual entity record; no resolution applied',
      }
    ),
  },
] as const;

const GROUP_BY_OPTIONS = [
  {
    key: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE,
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.groupBy.entityTypeLabel', {
      defaultMessage: 'Entity type',
    }),
  },
  {
    key: ENTITY_GROUPING_OPTIONS.RESOLUTION,
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.groupBy.resolutionLabel', {
      defaultMessage: 'Resolution',
    }),
  },
] as const;


const GROUP_BY_SELECTOR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.groupBySelector.title',
  { defaultMessage: 'Group by' }
);

const ROWS_SELECTOR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.rowsSelector.title',
  { defaultMessage: 'Rows' }
);

const buildCombinedFilter = (
  esFilter: ESBoolQuery | undefined,
  entityFilters: EntityFilters,
  rowsMode: RowsMode,
  tileFilter?: QueryDslQueryContainer | null
) => {
  const filterClauses: QueryDslQueryContainer[] = [
    esFilter,
    ...buildEntityFiltersQuery(entityFilters),
    tileFilter,
  ].filter(isDefined);

  const mustNotClauses =
    rowsMode === 'resolved'
      ? [{ exists: { field: 'entity.relationships.resolution.resolved_to' } }]
      : [];
  return filterClauses.length || mustNotClauses.length
    ? { bool: { filter: filterClauses, must: [], must_not: mustNotClauses, should: [] } }
    : undefined;
};

/** DSL counterpart of the tile ES|QL clause (grouping buckets use this path). */
const buildTileFilter = (ids: string[], rowsMode: RowsMode): QueryDslQueryContainer => {
  if (!ids.length) return { match_none: {} };
  if (rowsMode === 'individual') {
    return {
      bool: {
        should: [
          { terms: { 'entity.id': ids } },
          { terms: { 'entity.relationships.resolution.resolved_to': ids } },
        ],
        minimum_should_match: 1,
      },
    };
  }
  return { terms: { 'entity.id': ids } };
};

export const EntityAnalyticsNewHomePage: React.FC = () => {
  const spaceId = useSpaceId();
  const {
    dataView,
    isLoading: isDataViewLoading,
    error: isDataViewError,
  } = useEntityStoreDataView(spaceId);
  const { euiTheme } = useEuiTheme();
  const { addWarning } = useAppToasts();
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
    rowsMode,
    setRowsMode,
    sortField,
    sortDirection,
    setSort,
    pageIndex,
    pageSize,
    setPage,
    setPageSize,
    activeTile,
    setActiveTile,
  } = useEntityAnalyticsUrlState();

  const activeColumns = rowsMode === 'individual' ? INDIVIDUAL_ROWS_COLUMNS : RESOLVED_ROWS_COLUMNS;

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
  const { searchExpression, entityExpression } = useEntityGridFilters();

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

  const isGroupSelected = !isNoneGroup(groupsSelected);

  const { data: entityStoreStatusData, isLoading: entityStoreStatusLoading } =
    useEntityStoreStatus();
  const entityStoreDisabled =
    entityStoreStatusData?.status === 'not_installed' ||
    entityStoreStatusData?.status === 'stopped';
  const entityStoreInstalling = entityStoreStatusData?.status === 'installing';
  // Hooks must run before the disabled-prompt return. Skip ES|QL until the store
  // is known to be running so we do not query a missing entities-latest alias.
  const skipTileQueries =
    !spaceId || entityStoreStatusLoading || entityStoreDisabled || entityStoreInstalling;

  const resolvedSpaceId = spaceId ?? 'default';

  const {
    alertsCount,
    alertsEntityIds,
    watchlistedCount,
    watchlistedEntityIds,
    isLoading: alertBasedLoading,
  } = useAlertBasedTiles({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  });
  const {
    count: anomaliesCount,
    entityIds: anomaliesEntityIds,
    isLoading: anomaliesLoading,
  } = useEntitiesWithAnomaliesCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  });
  const {
    count: newEntityCount,
    entityIds: newEntityEntityIds,
    isLoading: newEntityLoading,
  } = useNewEntityCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  });
  const {
    count: riskMoversCount,
    entityIds: riskMoversEntityIds,
    isLoading: riskMoversLoading,
    isMissingIndex: riskMoversMissingIndex,
  } = useRiskMoversCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  });
  const {
    count: newlyHCCount,
    entityIds: newlyHCEntityIds,
    isLoading: newlyHCLoading,
    isMissingIndex: newlyHCMissingIndex,
  } = useNewlyHighCriticalCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  });

  const handleFilterForTile = useCallback(
    (tileId: SignalCardId) => {
      setActiveTile(activeTile === tileId ? null : tileId);
    },
    [activeTile, setActiveTile]
  );

  const selectedEntityIds = useMemo(() => {
    if (!activeTile) {
      return EMPTY_ENTITY_IDS;
    }
    switch (activeTile) {
      case 'entitiesWithAlerts':
        return alertsEntityIds;
      case 'entitiesWithAnomalies':
        return anomaliesEntityIds;
      case 'riskMovers':
        return riskMoversEntityIds;
      case 'newlyHighCritical':
        return newlyHCEntityIds;
      case 'watchlisted':
        return watchlistedEntityIds;
      case 'newEntity':
        return newEntityEntityIds;
      default:
        return EMPTY_ENTITY_IDS;
    }
  }, [
    activeTile,
    alertsEntityIds,
    anomaliesEntityIds,
    riskMoversEntityIds,
    newlyHCEntityIds,
    watchlistedEntityIds,
    newEntityEntityIds,
  ]);

  const cappedTileEntityIds = useMemo(() => {
    if (!activeTile) return null;
    return selectedEntityIds.length > MAX_TILE_FILTER_ENTITY_IDS
      ? selectedEntityIds.slice(0, MAX_TILE_FILTER_ENTITY_IDS)
      : selectedEntityIds;
  }, [activeTile, selectedEntityIds]);

  const tileWhereExpression = useMemo(() => {
    if (cappedTileEntityIds == null) return undefined;
    // Always constrain when a tile is active — empty list matches nothing so the
    // table stays consistent with a 0-count tile rather than falling back to all entities.
    if (!cappedTileEntityIds.length) return 'false';
    const list = toList(cappedTileEntityIds);
    // Tiles emit resolved (effective) ids. Resolved rows: parent rows only.
    // Individual rows: parent + members of those identities.
    return rowsMode === 'individual'
      ? `(entity.id IN (${list}) OR entity.relationships.resolution.resolved_to IN (${list}))`
      : `entity.id IN (${list})`;
  }, [cappedTileEntityIds, rowsMode]);

  const tileFilter = useMemo((): QueryDslQueryContainer | null => {
    if (cappedTileEntityIds == null) return null;
    return buildTileFilter(cappedTileEntityIds, rowsMode);
  }, [cappedTileEntityIds, rowsMode]);

  const combinedFilter = useMemo(
    () => buildCombinedFilter(esFilter, entityFilters, rowsMode, tileFilter),
    [esFilter, entityFilters, rowsMode, tileFilter]
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

  const gridEntityExpression = useMemo(
    () => joinAnd(entityExpression, tileWhereExpression),
    [entityExpression, tileWhereExpression]
  );

  useUpdateEffect(() => {
    setPage(0);
  }, [searchExpression, gridEntityExpression, setPage]);

  useUpdateEffect(() => {
    setGroupingPageIndex(0);
  }, [tileWhereExpression, searchExpression, entityExpression, rowsMode]);

  useUpdateEffect(() => {
    if (!activeTile || selectedEntityIds.length <= MAX_TILE_FILTER_ENTITY_IDS) {
      return;
    }
    addWarning({
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.home.tiles.tileFilterLimitTitle',
        {
          defaultMessage: 'Table shows {limit} of {count} entities',
          values: { limit: MAX_TILE_FILTER_ENTITY_IDS, count: selectedEntityIds.length },
        }
      ),
      text: i18n.translate(
        'xpack.securitySolution.entityAnalytics.home.tiles.tileFilterLimitDescription',
        {
          defaultMessage:
            'The table is limited to {limit} entities from this tile. Narrow the time range or filters to see a smaller set.',
          values: { limit: MAX_TILE_FILTER_ENTITY_IDS },
        }
      ),
    });
  }, [activeTile, selectedEntityIds.length, addWarning]);

  const signalCards = useMemo(
    (): SignalCardData[] => [
      {
        id: 'entitiesWithAlerts',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAlerts.title',
          {
            defaultMessage: 'Entities with alerts',
          }
        ),
        value: alertsCount,
        isLoading: alertBasedLoading,
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAlerts.description',
          {
            defaultMessage: 'Entities with at least one alert in the last {timeRange}',
            values: { timeRange },
          }
        ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAlerts.filterLabel',
          {
            defaultMessage: 'Entities with alerts ({timeRange})',
            values: { timeRange },
          }
        ),
      },
      {
        id: 'entitiesWithAnomalies',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAnomalies.title',
          {
            defaultMessage: 'Entities with anomalies',
          }
        ),
        value: anomaliesCount,
        isLoading: anomaliesLoading,
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAnomalies.description',
          {
            defaultMessage: 'Entities with at least one ML anomaly in the last {timeRange}',
            values: { timeRange },
          }
        ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAnomalies.filterLabel',
          {
            defaultMessage: 'Entities with anomalies ({timeRange})',
            values: { timeRange },
          }
        ),
      },
      {
        id: 'riskMovers',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.riskMovers.title',
          {
            defaultMessage: 'Risk movers',
          }
        ),
        value: riskMoversCount,
        isLoading: riskMoversLoading,
        noDataMessage: riskMoversMissingIndex
          ? i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.riskMovers.noData', {
              defaultMessage: 'Requires risk score history data',
            })
          : undefined,
        description:
          timeRange === '24h'
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.home.tiles.riskMovers.description24h',
                {
                  defaultMessage: 'Entities whose risk score rose ≥10 points vs yesterday',
                }
              )
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.home.tiles.riskMovers.description',
                {
                  defaultMessage:
                    'Entities whose risk score rose ≥10 points vs the previous {timeRange}',
                  values: { timeRange },
                }
              ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.riskMovers.filterLabel',
          {
            defaultMessage: 'Risk movers',
          }
        ),
      },
      {
        id: 'newlyHighCritical',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.newlyHighCritical.title',
          {
            defaultMessage: 'Newly high/critical',
          }
        ),
        value: newlyHCCount,
        isLoading: newlyHCLoading,
        noDataMessage: newlyHCMissingIndex
          ? i18n.translate(
              'xpack.securitySolution.entityAnalytics.home.tiles.newlyHighCritical.noData',
              {
                defaultMessage: 'Requires risk score history data',
              }
            )
          : undefined,
        description:
          timeRange === '24h'
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.home.tiles.newlyHighCritical.description24h',
                {
                  defaultMessage:
                    'Entities that crossed into High or Critical risk since yesterday',
                }
              )
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.home.tiles.newlyHighCritical.description',
                {
                  defaultMessage:
                    'Entities that crossed into High or Critical risk in the last {timeRange}',
                  values: { timeRange },
                }
              ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.newlyHighCritical.filterLabel',
          {
            defaultMessage: 'Newly high/critical',
          }
        ),
      },
      {
        id: 'watchlisted',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.watchlisted.title',
          {
            defaultMessage: 'Watchlisted',
          }
        ),
        value: watchlistedCount,
        isLoading: alertBasedLoading,
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.watchlisted.description',
          {
            defaultMessage:
              'Entities on a watchlist with at least one alert in the last {timeRange}',
            values: { timeRange },
          }
        ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.watchlisted.filterLabel',
          {
            defaultMessage: 'Watchlisted',
          }
        ),
      },
      {
        id: 'newEntity',
        title: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.newEntity.title', {
          defaultMessage: 'New entity',
        }),
        value: newEntityCount,
        isLoading: newEntityLoading,
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.newEntity.description',
          {
            defaultMessage:
              'Entities first seen in the last {timeRange} with a risk score above zero',
            values: { timeRange },
          }
        ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.newEntity.filterLabel',
          {
            defaultMessage: 'New entity (last {timeRange})',
            values: { timeRange },
          }
        ),
      },
    ],
    [
      alertsCount,
      alertBasedLoading,
      anomaliesCount,
      anomaliesLoading,
      riskMoversCount,
      riskMoversLoading,
      newlyHCCount,
      newlyHCLoading,
      newlyHCMissingIndex,
      watchlistedCount,
      newEntityCount,
      newEntityLoading,
      riskMoversMissingIndex,
      timeRange,
    ]
  );

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
        (o) => !(rowsMode === 'resolved' && o.key === ENTITY_GROUPING_OPTIONS.RESOLUTION)
      )}
      fields={isDataViewLoading ? [] : dataView.fields.getAll()}
      title={GROUP_BY_SELECTOR_TITLE}
      maxGroupingLevels={3}
      settings={{ hideCustomFieldOption: false }}
    />
  );

  const rowsSelectorElement = (
    <LabeledOptionSelector
      title={ROWS_SELECTOR_TITLE}
      options={ROWS_OPTIONS}
      selectedKey={rowsMode}
      onChange={(key) => {
        const next = key as RowsMode;
        setRowsMode(next);
        if (next === 'resolved') {
          setGroupsSelected((prev) => {
            const filtered = prev.filter((g) => g !== ENTITY_GROUPING_OPTIONS.RESOLUTION);
            return filtered.length ? filtered : ['none'];
          });
        }
      }}
      data-test-subj="eaRowsModeSelector"
    />
  );

  const tableControls = (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>{rowsSelectorElement}</EuiFlexItem>
      <EuiFlexItem grow={false}>{groupBySelectorElement}</EuiFlexItem>
    </EuiFlexGroup>
  );

  if (isDataViewLoading || entityStoreStatusLoading || entityStoreInstalling)
    return <PageLoader />;
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
        <EntityAnalyticsHomeHeader />
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
            rowsMode={rowsMode}
            esFilter={esFilter}
            watchlistNames={watchlistNames}
          />

          <EuiSpacer size="m" />

          <div
            css={css`
              padding-inline: ${euiTheme.size.base};
            `}
          >
            <SignalCards
              activeTile={activeTile}
              cards={signalCards}
              onFilterForTile={handleFilterForTile}
            />
          </div>
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
                rowsMode={rowsMode}
                tileWhereExpression={tileWhereExpression}
                groupSelectorComponent={tableControls}
                cellHandlers={cellHandlers}
                rowActions={rowActions}
              />
            ) : (
              <EntitiesGrid
                columns={activeColumns}
                rowsMode={rowsMode}
                timeRange={timeRange}
                watchlistNames={watchlistNames}
                searchExpression={searchExpression}
                entityExpression={gridEntityExpression}
                cellHandlers={cellHandlers}
                rowActions={rowActions}
                groupSelectorComponent={tableControls}
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

interface LabeledOption {
  key: string;
  label: string;
  description?: string;
}

interface LabeledOptionSelectorProps {
  title: string;
  options: ReadonlyArray<LabeledOption>;
  selectedKey: string;
  onChange: (key: string) => void;
  'data-test-subj'?: string;
}

const LabeledOptionSelector: React.FC<LabeledOptionSelectorProps> = ({
  title,
  options,
  selectedKey,
  onChange,
  'data-test-subj': dataTestSubj,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const selected = options.find((o) => o.key === selectedKey);
  const buttonLabel = selected?.label ?? selectedKey;

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        width: 320,
        items: options.map((option) => ({
          'data-test-subj': `labeled-option-${option.key}`,
          icon: option.key === selectedKey ? 'check' : 'empty',
          name: (
            <div>
              <EuiText size="s">
                <strong>{option.label}</strong>
              </EuiText>
              {option.description ? (
                <EuiText size="xs" color="subdued">
                  {option.description}
                </EuiText>
              ) : null}
            </div>
          ),
          onClick: () => {
            onChange(option.key);
            setIsPopoverOpen(false);
          },
        })),
      },
    ],
    [onChange, options, selectedKey]
  );

  return (
    <EuiPopover
      data-test-subj={dataTestSubj ?? 'labeledOptionSelector'}
      button={
        <EuiButtonEmpty
          data-test-subj="labeled-option-selector-button"
          flush="both"
          iconSide="right"
          iconSize="s"
          iconType="chevronSingleDown"
          onClick={() => setIsPopoverOpen((open) => !open)}
          title={buttonLabel}
          size="xs"
        >
          {`${title}: ${buttonLabel}`}
        </EuiButtonEmpty>
      }
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
