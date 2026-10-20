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
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isNoneGroup } from '@kbn/grouping';
import { EntityType, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
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
  useSearchBarExpression,
  INDIVIDUAL_ROWS_COLUMNS,
  RESOLVED_ROWS_COLUMNS,
  getEntityId,
  getString,
  ENTITY_TYPE_FIELD,
} from '../components/home/entities_grid';
import { toDsl, toEsql } from '../components/home/entities_grid/active_filters';
import type { ActiveFilters } from '../components/home/entities_grid/active_filters';
import { useEntityFilterOverrides } from '../components/home/entities_grid/hooks/use_entity_grid_data';
import { isFilteringByGroupValue } from '../components/home/entities_grid/queries/resolved_entities';
import type { RowActions, CellHandlers, Row, RowsMode } from '../components/home/entities_grid';
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
import type { EntityViewMode } from '../../../common/entity_analytics/entity_store/resolution_group';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { EntityAnalyticsHomeHeader } from './entity_analytics_home_header';
import { useKibana } from '../../common/lib/kibana';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { ENTITY_PROMPT } from '../../agent_builder/components/prompts';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';
import { useReportAddToChat } from '../../agent_builder/hooks/use_report_add_to_chat';
import {
  useAlertBasedTiles,
  useAlertBasedTilesDelta,
  useAlertBasedTilesSeries,
  useEntitiesWithAnomaliesCount,
  useEntitiesWithAnomaliesDelta,
  useEntitiesWithAnomaliesSeries,
  useNewEntityCount,
  useNewEntityDelta,
  useNewEntitySeries,
  useNewlyHighCriticalCount,
  useNewlyHighCriticalDelta,
  useRiskMoversCount,
  useRiskMoversDelta,
  useRiskTilesSeries,
} from '../components/home/needs_attention_tiles/hooks';
import { RISK_MOVER_MIN_SCORE_CHANGE } from '../components/home/needs_attention_tiles/queries/risk_history';
import { SignalCards } from '../components/home/needs_attention_tiles/signal_cards';
import { getEntityAnalyticsNewHomeScopeId } from '../common/alert_time_range_overrides';
import {
  MAX_TILE_FILTER_ENTITY_IDS,
  getCappedTileEntityIds,
} from '../components/home/needs_attention_tiles/tile_entity_filter';
import {
  EMPTY_ENTITY_IDS,
  type SignalCardData,
  type SignalCardId,
} from '../components/home/needs_attention_tiles/data';

const GROUP_BY_SETTINGS = { hideCustomFieldOption: false };

const hiddenCss = css`
  display: none;
`;

const isStoreEntityType = (value: unknown): value is EntityType =>
  EntityType.safeParse(value).success;

/** Host and user keep their type; every other entity type opens as generic. */
const toSecurityEntityType = (
  rawType: string | undefined
): SecurityEntityType.host | SecurityEntityType.user | SecurityEntityType.generic => {
  if (rawType === 'host') return SecurityEntityType.host;
  if (rawType === 'user') return SecurityEntityType.user;
  return SecurityEntityType.generic;
};

/** The entity a row stands for; a row without an id has nothing to open. */
const getRowEntity = (row: Row) => {
  const entityId = getEntityId(row);
  return entityId
    ? {
        entityId,
        entityName: getString(row, 'entity.name'),
        entityType: getString(row, ENTITY_TYPE_FIELD),
      }
    : undefined;
};

/** A resolved row stands for its whole group, so its flyouts show the group too. */
const getEntityViewMode = (rowsMode: RowsMode): EntityViewMode =>
  rowsMode === 'resolved' ? 'resolved' : 'single';

const ROWS_OPTIONS: ReadonlyArray<LabeledOption<RowsMode>> = [
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
  const { agentBuilder } = useKibana().services;
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();
  const reportAddToChat = useReportAddToChat();
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
    activeTile,
    setActiveTile,
  } = useEntityAnalyticsUrlState();
  // Flyouts opened from the table query alerts over the range it shows.
  const scopeId = getEntityAnalyticsNewHomeScopeId(timeRange);

  const [isGridFullScreen, setIsGridFullScreen] = useState(false);

  const activeColumns = rowsMode === 'individual' ? INDIVIDUAL_ROWS_COLUMNS : RESOLVED_ROWS_COLUMNS;

  const cellHandlers = useMemo<CellHandlers>(
    () => ({
      onEntityNameClick: (row, rowMode) => {
        const entity = getRowEntity(row);
        if (!entity) return;
        openEntityFlyout({
          entityId: entity.entityId,
          entityName: entity.entityName,
          engineType: entity.entityType,
          scopeId,
          contextID: scopeId,
          origin: FLYOUT_ORIGIN.ENTITIES_TABLE,
          mode: getEntityViewMode(rowMode),
        });
      },
      onGroupSizeClick: (row) => {
        const entity = getRowEntity(row);
        if (!entity || !isStoreEntityType(entity.entityType)) return;
        openEntityResolution({
          entityId: entity.entityId,
          entityName: entity.entityName ?? '',
          entityType: entity.entityType,
          scopeId,
        });
      },
      onAlertCountClick: (row, rowMode) => {
        const entity = getRowEntity(row);
        if (!entity) return;
        const entityType = toSecurityEntityType(entity.entityType);
        openEntityAlertsInsights({
          entityType,
          value:
            entityType === SecurityEntityType.generic ? entity.entityId : entity.entityName ?? '',
          entityId: entity.entityId,
          scopeId,
          mode: getEntityViewMode(rowMode),
        });
      },
      onAnomalyCountClick: (row, rowMode) => {
        const entity = getRowEntity(row);
        const entityType = toSecurityEntityType(entity?.entityType);
        if (!entity || entityType === SecurityEntityType.generic) return;
        openEntityAnomalyInsights({
          entityType,
          value: entity.entityName ?? '',
          entityId: entity.entityId,
          mode: getEntityViewMode(rowMode),
        });
      },
    }),
    [
      openEntityFlyout,
      openEntityResolution,
      openEntityAlertsInsights,
      openEntityAnomalyInsights,
      scopeId,
    ]
  );

  const rowActions = useMemo<RowActions>(
    () => ({
      onInvestigateInTimeline: (row) => {
        const entity = getRowEntity(row);
        if (!entity?.entityName || !isStoreEntityType(entity.entityType)) return;
        const kqlFilter = euidApi?.euid.kql.getEuidFilterBasedOnDocument(
          euidApi.getBuiltInEntityDefinition(entity.entityType),
          row
        );
        if (kqlFilter) {
          investigateInTimeline({ query: { query: kqlFilter, language: 'kuery' } });
          return;
        }
        const field = EntityTypeToIdentifierField[entity.entityType] ?? 'entity.id';
        const dataProviders = createDataProviders({
          contextId: scopeId,
          field,
          values: entity.entityName,
        });
        if (dataProviders?.length) investigateInTimeline({ dataProviders });
      },
      onOpenEntityGraph: (row) => {
        const entity = getRowEntity(row);
        if (!entity) return;
        openEntityGraphView({
          entityId: entity.entityId,
          entityName: entity.entityName ?? '',
          scopeId,
          onShowEntity: ({ engineType, entityId: relatedId, entityName: relatedName }) => {
            openEntityFlyout({
              engineType,
              entityId: relatedId,
              entityName: relatedName,
              scopeId,
            });
          },
        });
      },
      onAddToChat: isAgentChatExperienceEnabled
        ? (row) => {
            const entity = getRowEntity(row);
            if (!entity?.entityName || !isStoreEntityType(entity.entityType)) return;
            const { entityId, entityName, entityType } = entity;
            reportAddToChat({ pathway: 'entities_grid_row_actions', attachments: ['entity'] });
            agentBuilder?.openChat({
              newConversation: true,
              initialMessage: ENTITY_PROMPT,
              sessionTag: 'security',
              attachments: [
                {
                  id: `${SecurityAgentBuilderAttachments.entity}-${entityId}`,
                  type: SecurityAgentBuilderAttachments.entity,
                  data: {
                    identifierType: entityType,
                    identifier: entityName,
                    entityStoreId: entityId,
                    attachmentLabel: `${entityType}: ${entityName}`,
                  },
                },
              ],
            });
          }
        : undefined,
    }),
    [
      agentBuilder,
      euidApi,
      investigateInTimeline,
      isAgentChatExperienceEnabled,
      openEntityGraphView,
      openEntityFlyout,
      reportAddToChat,
      scopeId,
    ]
  );

  const { filterQuery: esFilter } = useGlobalFilterQuery({ dataView });
  const searchExpression = useSearchBarExpression();

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
    severeAlertsCount,
    severeAlertsEntityIds,
    watchlistedCount,
    watchlistedEntityIds,
    isLoading: alertBasedLoading,
    isCountPending: alertBasedPending,
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
    isCountPending: anomaliesPending,
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
    isCountPending: newEntityPending,
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
    isCountPending: riskMoversPending,
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
    isCountPending: newlyHCPending,
  } = useNewlyHighCriticalCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  });

  // Count first, for the whole page: the deltas start only once every count has loaded, so a delta
  // never slows a count (a count whose query cannot run is not waited for).
  const areCountsLoaded =
    !alertBasedPending &&
    !anomaliesPending &&
    !newEntityPending &&
    !riskMoversPending &&
    !newlyHCPending;
  const deltaOptions = {
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
    isReady: areCountsLoaded,
  };
  const {
    severeAlertsDelta: alertsDelta,
    watchlistedDelta,
    isDeltaLoading,
    isHistoryMissing: alertBasedHistoryMissing,
    reachesBack: alertBasedReachesBack,
  } = useAlertBasedTilesDelta({
    ...deltaOptions,
    severeAlertsCount,
    watchlistedCount,
  });
  const {
    delta: anomaliesDelta,
    isDeltaLoading: anomaliesDeltaLoading,
    isHistoryMissing: anomaliesHistoryMissing,
    reachesBack: anomaliesReachesBack,
  } = useEntitiesWithAnomaliesDelta({ ...deltaOptions, count: anomaliesCount });
  const {
    delta: newEntityDelta,
    isDeltaLoading: newEntityDeltaLoading,
    isHistoryMissing: newEntityHistoryMissing,
    reachesBack: newEntityReachesBack,
  } = useNewEntityDelta({ ...deltaOptions, count: newEntityCount });
  const {
    delta: riskMoversDelta,
    isDeltaLoading: riskMoversDeltaLoading,
    isHistoryMissing: riskMoversHistoryMissing,
    reachesBack: riskMoversReachesBack,
  } = useRiskMoversDelta({ ...deltaOptions, count: riskMoversCount });
  const {
    delta: newlyHCDelta,
    isDeltaLoading: newlyHCDeltaLoading,
    isHistoryMissing: newlyHCHistoryMissing,
    reachesBack: newlyHCReachesBack,
  } = useNewlyHighCriticalDelta({ ...deltaOptions, count: newlyHCCount });

  // The sparklines follow the deltas: they start once the counts and the deltas have settled, and
  // only for a tile whose history reaches back twice the range, so they never delay them.
  const { alertsTrend, watchlistedTrend } = useAlertBasedTilesSeries({
    ...deltaOptions,
    isReady: areCountsLoaded && !isDeltaLoading,
    reachesBack: alertBasedReachesBack,
    severeAlertsCount,
    watchlistedCount,
  });
  const { trend: anomaliesTrend } = useEntitiesWithAnomaliesSeries({
    ...deltaOptions,
    isReady: areCountsLoaded && !anomaliesDeltaLoading,
    reachesBack: anomaliesReachesBack,
    count: anomaliesCount,
  });
  const { trend: newEntityTrend } = useNewEntitySeries({
    ...deltaOptions,
    isReady: areCountsLoaded && !newEntityDeltaLoading,
    reachesBack: newEntityReachesBack,
    count: newEntityCount,
  });
  // The two risk tiles read the same risk score history, so one query serves both sparklines.
  const { riskMoversTrend, newlyHighCriticalTrend: newlyHCTrend } = useRiskTilesSeries({
    ...deltaOptions,
    isReady: areCountsLoaded && !riskMoversDeltaLoading && !newlyHCDeltaLoading,
    riskMoversReachesBack,
    newlyHighCriticalReachesBack: newlyHCReachesBack,
    riskMoversCount,
    newlyHighCriticalCount: newlyHCCount,
  });

  const handleFilterForCard = useCallback(
    (cardId: SignalCardId) => {
      setActiveTile(activeTile === cardId ? null : cardId);
    },
    [activeTile, setActiveTile]
  );

  const selectedEntityIds = useMemo(() => {
    if (!activeTile) {
      return EMPTY_ENTITY_IDS;
    }
    switch (activeTile) {
      case 'entitiesWithAlerts':
        return severeAlertsEntityIds;
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
    severeAlertsEntityIds,
    anomaliesEntityIds,
    riskMoversEntityIds,
    newlyHCEntityIds,
    watchlistedEntityIds,
    newEntityEntityIds,
  ]);

  const cappedTileEntityIds = useMemo(
    () => (activeTile ? getCappedTileEntityIds(selectedEntityIds) : null),
    [activeTile, selectedEntityIds]
  );

  const activeFilters = useMemo(
    (): ActiveFilters => ({
      search: { esql: searchExpression, dsl: esFilter },
      entityFilters,
      tileEntityIds: cappedTileEntityIds,
      rowsMode,
    }),
    [searchExpression, esFilter, entityFilters, cappedTileEntityIds, rowsMode]
  );
  // Strings, so a tile refetch with the same entities doesn't reset the pages below.
  const { searchExpression: gridSearchExpression, entityExpression: gridEntityExpression } =
    useMemo(() => toEsql(activeFilters), [activeFilters]);
  // Group by reads the grid's rows with DSL, so it takes the overrides the grid's filters read.
  const { data: entityFilterOverrides } = useEntityFilterOverrides({
    rowsMode,
    entityExpression: gridEntityExpression,
  });
  const isGroupingQueryReady =
    !isFilteringByGroupValue({ rowsMode, entityExpression: gridEntityExpression }) ||
    entityFilterOverrides != null;
  const groupingQuery = useMemo(
    () => toDsl(activeFilters, entityFilterOverrides),
    [activeFilters, entityFilterOverrides]
  );

  const groupingState = useMemo<EntityURLStateResult>(
    () => ({
      query: groupingQuery ?? {
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
    [groupingQuery, groupingPageSize, groupingPageIndex]
  );

  useUpdateEffect(() => {
    setGroupingPageIndex(0);
  }, [gridSearchExpression, gridEntityExpression, rowsMode]);

  useUpdateEffect(() => {
    if (!activeTile || selectedEntityIds.length <= MAX_TILE_FILTER_ENTITY_IDS) {
      return;
    }
    addWarning({
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.home.tiles.cardFilterLimitTitle',
        {
          defaultMessage: 'Table shows {limit} of {count} entities',
          values: { limit: MAX_TILE_FILTER_ENTITY_IDS, count: selectedEntityIds.length },
        }
      ),
      text: i18n.translate(
        'xpack.securitySolution.entityAnalytics.home.tiles.cardFilterLimitDescription',
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
        value: severeAlertsCount,
        delta: alertsDelta,
        isDeltaLoading,
        isDeltaUnavailable: alertBasedHistoryMissing,
        trend: alertsTrend,
        isLoading: alertBasedLoading,
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAlerts.description',
          {
            defaultMessage:
              'Entities with at least one high or critical alert in the last {timeRange}',
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
        delta: anomaliesDelta,
        isDeltaLoading: anomaliesDeltaLoading,
        isDeltaUnavailable: anomaliesHistoryMissing,
        trend: anomaliesTrend,
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
        delta: riskMoversDelta,
        isDeltaLoading: riskMoversDeltaLoading,
        isDeltaUnavailable: riskMoversHistoryMissing,
        trend: riskMoversTrend,
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
                  defaultMessage: 'Entities whose risk score rose ≥{points} points vs yesterday',
                  values: { points: RISK_MOVER_MIN_SCORE_CHANGE },
                }
              )
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.home.tiles.riskMovers.description',
                {
                  defaultMessage:
                    'Entities whose risk score rose ≥{points} points vs the previous {timeRange}',
                  values: { timeRange, points: RISK_MOVER_MIN_SCORE_CHANGE },
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
        delta: newlyHCDelta,
        isDeltaLoading: newlyHCDeltaLoading,
        isDeltaUnavailable: newlyHCHistoryMissing,
        trend: newlyHCTrend,
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
        delta: watchlistedDelta,
        isDeltaLoading,
        isDeltaUnavailable: alertBasedHistoryMissing,
        trend: watchlistedTrend,
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
        delta: newEntityDelta,
        isDeltaLoading: newEntityDeltaLoading,
        isDeltaUnavailable: newEntityHistoryMissing,
        trend: newEntityTrend,
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
      severeAlertsCount,
      alertsDelta,
      alertsTrend,
      alertBasedLoading,
      isDeltaLoading,
      alertBasedHistoryMissing,
      anomaliesCount,
      anomaliesDelta,
      anomaliesTrend,
      anomaliesDeltaLoading,
      anomaliesHistoryMissing,
      anomaliesLoading,
      riskMoversCount,
      riskMoversDelta,
      riskMoversTrend,
      riskMoversDeltaLoading,
      riskMoversHistoryMissing,
      riskMoversLoading,
      newlyHCCount,
      newlyHCDelta,
      newlyHCTrend,
      newlyHCDeltaLoading,
      newlyHCHistoryMissing,
      newlyHCLoading,
      newlyHCMissingIndex,
      watchlistedCount,
      watchlistedDelta,
      watchlistedTrend,
      newEntityCount,
      newEntityDelta,
      newEntityTrend,
      newEntityDeltaLoading,
      newEntityHistoryMissing,
      newEntityLoading,
      riskMoversMissingIndex,
      timeRange,
    ]
  );

  const onGroupChange = useCallback((key: string) => {
    setGroupsSelected((prev) => {
      if (key === 'none') return ['none'];
      const cleaned = prev.filter((g) => g !== 'none');
      if (cleaned.includes(key)) {
        const next = cleaned.filter((g) => g !== key);
        return next.length ? next : ['none'];
      }
      return [...cleaned, key];
    });
  }, []);

  const onRowsModeChange = useCallback(
    (next: RowsMode) => {
      setRowsMode(next);
      if (next === 'resolved') {
        setGroupsSelected((prev) => {
          const filtered = prev.filter((g) => g !== ENTITY_GROUPING_OPTIONS.RESOLUTION);
          return filtered.length ? filtered : ['none'];
        });
      }
    },
    [setRowsMode]
  );

  const groupByOptions = useMemo(() => {
    const options: Array<{ key: string; label: string }> = GROUP_BY_OPTIONS.filter(
      (o) => !(rowsMode === 'resolved' && o.key === ENTITY_GROUPING_OPTIONS.RESOLUTION)
    );
    // The selector names a selection only from its options, so a custom field joins them, as in kbn-grouping.
    const customFields = groupsSelected
      .filter((key) => key !== 'none' && !options.some((o) => o.key === key))
      .map((key) => ({ key, label: key }));
    return [...options, ...customFields];
  }, [rowsMode, groupsSelected]);
  const groupByFields = useMemo(
    () => (isDataViewLoading ? [] : dataView.fields.getAll()),
    [isDataViewLoading, dataView]
  );

  // Memoized: the grid toolbar rebuilds whenever this element changes.
  const tableControls = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <LabeledOptionSelector
            title={ROWS_SELECTOR_TITLE}
            options={ROWS_OPTIONS}
            selectedKey={rowsMode}
            onChange={onRowsModeChange}
            data-test-subj="eaRowsModeSelector"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <GroupSelector
            groupingId="ea-new-home-group-by"
            groupsSelected={groupsSelected}
            onGroupChange={onGroupChange}
            options={groupByOptions}
            fields={groupByFields}
            title={GROUP_BY_SELECTOR_TITLE}
            maxGroupingLevels={3}
            settings={GROUP_BY_SETTINGS}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [rowsMode, onRowsModeChange, groupsSelected, onGroupChange, groupByOptions, groupByFields]
  );

  const dataViewContextValue = useMemo(
    () => ({ dataView, dataViewIsLoading: isDataViewLoading }),
    [dataView, isDataViewLoading]
  );

  if (isDataViewLoading || entityStoreStatusLoading || entityStoreInstalling) return <PageLoader />;
  if (isDataViewError) return <DataViewErrorComponent />;
  if (entityStoreDisabled) return <EntityStoreDisabledEmptyPrompt />;

  return (
    <>
      <div className="entityAnalyticsPageHeader" css={isGridFullScreen ? hiddenCss : undefined}>
        <EntityAnalyticsHomeHeader />
      </div>
      <SecuritySolutionPageWrapper noPadding data-test-subj="entityAnalyticsNewHomePage">
        <div
          className="entityAnalyticsSearchSection"
          css={[
            css`
              padding-block-start: ${euiTheme.size.s};
              display: flex;
              flex-direction: column;
              height: 100%;
            `,
            isGridFullScreen && hiddenCss,
          ]}
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
              onFilterForCard={handleFilterForCard}
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
          <DataViewContext.Provider value={dataViewContextValue}>
            {isGroupSelected ? (
              <EntitiesGroups
                state={groupingState}
                groupsSelected={groupsSelected}
                timeRange={timeRange}
                watchlistNames={watchlistNames}
                rowsMode={rowsMode}
                searchExpression={gridSearchExpression}
                entityExpression={gridEntityExpression}
                isQueryReady={isGroupingQueryReady}
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
                searchExpression={gridSearchExpression}
                entityExpression={gridEntityExpression}
                cellHandlers={cellHandlers}
                rowActions={rowActions}
                toolbarControls={tableControls}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={setSort}
                onFullScreenChange={setIsGridFullScreen}
              />
            )}
          </DataViewContext.Provider>
        </div>
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};

interface LabeledOption<K extends string> {
  key: K;
  label: string;
  description?: string;
}

interface LabeledOptionSelectorProps<K extends string> {
  title: string;
  options: ReadonlyArray<LabeledOption<K>>;
  selectedKey: K;
  onChange: (key: K) => void;
  'data-test-subj'?: string;
}

const LabeledOptionSelector = <K extends string>({
  title,
  options,
  selectedKey,
  onChange,
  'data-test-subj': dataTestSubj,
}: LabeledOptionSelectorProps<K>) => {
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
      aria-label={title}
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
