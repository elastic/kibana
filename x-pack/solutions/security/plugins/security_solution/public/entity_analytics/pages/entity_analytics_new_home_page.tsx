/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiLoadingSpinner, EuiPanel, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
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
import { useTimeRangeParam } from '../components/home/use_time_range_param';
import {
  useEntityFiltersParam,
  getEntityFilterTerms,
} from '../components/home/use_entity_filters_param';
import { EntityFiltersBar } from '../components/home/entity_filters_bar';
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
import {
  EMPTY_ENTITY_IDS,
  type ActiveFilter,
  type SignalCardData,
} from '../components/home/needs_attention_tiles/data';
import {
  DataViewContext,
  useEntityURLState,
  DEFAULT_ENTITIES_TABLE_CONFIG,
  DEFAULT_ENTITIES_TABLE_SORT,
  type EntitiesBaseURLQuery,
  EntitiesTableSection,
  type URLQuery,
} from '../components/home/entities_table';
import { ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY } from '../components/home/constants';
import { EntityAnalyticsHomeHeader } from './entity_analytics_home_header';

const combineFilters = (
  parts: Array<QueryDslQueryContainer | null | undefined>
): QueryDslQueryContainer | undefined => {
  const active = parts.filter((p): p is QueryDslQueryContainer => p !== null && p !== undefined);
  if (!active.length) return undefined;
  return { bool: { filter: active } };
};

export const toTermsFilter = (ids: string[]): QueryDslQueryContainer | null => {
  if (ids.length === 0) return null;
  return { terms: { 'entity.id': ids } };
};

const getDefaultQuery = ({ query, filters }: EntitiesBaseURLQuery): URLQuery => ({
  query,
  filters,
  pageFilters: [],
  sort: DEFAULT_ENTITIES_TABLE_SORT,
  pageIndex: 0,
});

/** ES `terms` queries fail above 65,536 values; keep the table well under that. */
const MAX_CARD_FILTER_ENTITY_IDS = 1000;

export const EntityAnalyticsNewHomePage: React.FC = () => {
  const spaceId = useSpaceId();
  const {
    dataView,
    isLoading: isDataViewLoading,
    error: isDataViewError,
  } = useEntityStoreDataView(spaceId);
  const { euiTheme } = useEuiTheme();

  const { filterQuery: esFilter } = useGlobalFilterQuery({ dataView });

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

  const { addWarning } = useAppToasts();
  const [timeRange, setTimeRange] = useTimeRangeParam();
  const [viewBy] = useState<'resolved' | 'raw'>('resolved');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);

  const { entityFilters, setEntityFilters } = useEntityFiltersParam();

  const baseFilter = useMemo(
    () => combineFilters([esFilter, ...getEntityFilterTerms(entityFilters)]),
    [esFilter, entityFilters]
  );

  const resolvedSpaceId = spaceId ?? 'default';
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

  const {
    severeAlertsCount: alertsCount,
    severeAlertsEntityIds: alertsEntityIds,
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
    severeAlertsCount: alertsCount,
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
    severeAlertsCount: alertsCount,
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

  const handleFilterForCard = useCallback((cardId: ActiveFilter['cardId']) => {
    setActiveFilter((prev) =>
      prev?.cardId === cardId ? null : { type: 'card', cardId, label: cardId }
    );
  }, []);

  const selectedEntityIds = useMemo(() => {
    if (!activeFilter || activeFilter.type !== 'card') {
      return EMPTY_ENTITY_IDS;
    }
    switch (activeFilter.cardId) {
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
    activeFilter,
    alertsEntityIds,
    anomaliesEntityIds,
    riskMoversEntityIds,
    newlyHCEntityIds,
    watchlistedEntityIds,
    newEntityEntityIds,
  ]);

  const cardFilter = useMemo((): QueryDslQueryContainer | null => {
    if (!activeFilter || activeFilter.type !== 'card') return null;
    // Always return a terms filter when a card is active — an empty array matches nothing,
    // keeping the table consistent with the tile (0 shown) rather than falling back to all entities.
    const ids =
      selectedEntityIds.length > MAX_CARD_FILTER_ENTITY_IDS
        ? selectedEntityIds.slice(0, MAX_CARD_FILTER_ENTITY_IDS)
        : selectedEntityIds;
    return { terms: { 'entity.id': ids } };
  }, [activeFilter, selectedEntityIds]);

  useUpdateEffect(() => {
    if (!activeFilter || selectedEntityIds.length <= MAX_CARD_FILTER_ENTITY_IDS) {
      return;
    }
    addWarning({
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.home.tiles.cardFilterLimitTitle',
        {
          defaultMessage: 'Table shows {limit} of {count} entities',
          values: { limit: MAX_CARD_FILTER_ENTITY_IDS, count: selectedEntityIds.length },
        }
      ),
      text: i18n.translate(
        'xpack.securitySolution.entityAnalytics.home.tiles.cardFilterLimitDescription',
        {
          defaultMessage:
            'The table is limited to {limit} entities from this tile. Narrow the time range or filters to see a smaller set.',
          values: { limit: MAX_CARD_FILTER_ENTITY_IDS },
        }
      ),
    });
  }, [activeFilter, selectedEntityIds.length, addWarning]);

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
      alertsCount,
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

  const dataViewContextValue = useMemo(
    () => ({ dataView, dataViewIsLoading: isDataViewLoading }),
    [dataView, isDataViewLoading]
  );

  if (isDataViewLoading || entityStoreStatusLoading || entityStoreInstalling) {
    return <EuiLoadingSpinner size="l" />;
  }
  if (isDataViewError) return <DataViewErrorComponent />;
  if (entityStoreDisabled) return <EntityStoreDisabledEmptyPrompt />;

  return (
    <>
      <EntityAnalyticsHomeHeader />
      <SecuritySolutionPageWrapper noPadding data-test-subj="entityAnalyticsNewHomePage">
        <div
          css={css`
            padding-block-start: ${euiTheme.size.s};
            display: flex;
            flex-direction: column;
            height: 100%;
          `}
        >
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
            esFilter={combineFilters([esFilter, cardFilter])}
            watchlistNames={watchlistNames}
          />
          <EuiSpacer size="m" />
          <SignalCards
            activeFilter={activeFilter}
            cards={signalCards}
            onFilterForCard={handleFilterForCard}
          />
          <EuiSpacer size="m" />
          <EuiPanel
            hasBorder
            css={css`
              padding-inline: ${euiTheme.size.s};
            `}
          >
            <DataViewContext.Provider value={dataViewContextValue}>
              <EntityAnalyticsEntitiesTableContent
                baseFilter={baseFilter}
                cardFilter={cardFilter}
              />
            </DataViewContext.Provider>
          </EuiPanel>
        </div>
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};

const EntityAnalyticsEntitiesTableContent = ({
  baseFilter,
  cardFilter,
}: {
  baseFilter?: QueryDslQueryContainer;
  cardFilter: QueryDslQueryContainer | null;
}) => {
  const urlState = useEntityURLState({
    paginationLocalStorageKey: ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
    defaultQuery: getDefaultQuery,
  });

  const onChangePageRef = useRef(urlState.onChangePage);
  onChangePageRef.current = urlState.onChangePage;
  const filterResetKey = `${JSON.stringify(baseFilter ?? null)}|${JSON.stringify(cardFilter)}`;
  useUpdateEffect(() => {
    onChangePageRef.current(0);
  }, [filterResetKey]);

  const state = useMemo(() => {
    const extraFilters = (
      [baseFilter ?? null, cardFilter] as Array<QueryDslQueryContainer | null>
    ).filter((f): f is QueryDslQueryContainer => f !== null && f !== undefined);

    if (!extraFilters.length) return urlState;

    return {
      ...urlState,
      query: {
        ...urlState.query,
        bool: {
          ...urlState.query?.bool,
          filter: [...(urlState.query?.bool?.filter ?? []), ...extraFilters],
        },
      },
    };
  }, [urlState, baseFilter, cardFilter]);

  return <EntitiesTableSection state={state} config={DEFAULT_ENTITIES_TABLE_CONFIG} />;
};
