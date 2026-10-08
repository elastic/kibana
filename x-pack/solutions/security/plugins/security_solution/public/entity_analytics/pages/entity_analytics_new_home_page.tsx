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
  useEntitiesWithAnomaliesCountWithDelta as useEntitiesWithAnomaliesCount,
  useNewEntityCountWithDelta as useNewEntityCount,
  useRiskMoversCountWithDelta as useRiskMoversCount,
  useNewlyHighCriticalCountWithDelta as useNewlyHighCriticalCount,
} from '../components/home/needs_attention_tiles/hooks';
// Switch to useAlertBasedTiles to disable deltas, useAlertBasedTilesWithDelta to enable them.
import { useAlertBasedTilesWithDelta as useAlertBasedTiles } from '../components/home/needs_attention_tiles/hooks/use_entities_with_alerts_tiles';
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
    alertsCount,
    alertsDelta,
    alertsEntityIds,
    watchlistedCount,
    watchlistedDelta,
    watchlistedEntityIds,
    isDeltaLoading,
    alertsTrend,
    watchlistedTrend,
    isTrendLoading: alertsTrendLoading,
    isLoading: alertBasedLoading,
  } = useAlertBasedTiles({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  });
  const {
    count: anomaliesCount,
    delta: anomaliesDelta,
    entityIds: anomaliesEntityIds,
    isLoading: anomaliesLoading,
    isDeltaLoading: anomaliesDeltaLoading,
    trend: anomaliesTrend,
    isTrendLoading: anomaliesTrendLoading,
  } = useEntitiesWithAnomaliesCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  });
  const {
    count: newEntityCount,
    delta: newEntityDelta,
    entityIds: newEntityEntityIds,
    isLoading: newEntityLoading,
    isDeltaLoading: newEntityDeltaLoading,
    trend: newEntityTrend,
    isTrendLoading: newEntityTrendLoading,
  } = useNewEntityCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  });
  const {
    count: riskMoversCount,
    delta: riskMoversDelta,
    entityIds: riskMoversEntityIds,
    isLoading: riskMoversLoading,
    isMissingIndex: riskMoversMissingIndex,
    isDeltaLoading: riskMoversDeltaLoading,
    trend: riskMoversTrend,
    isTrendLoading: riskMoversTrendLoading,
  } = useRiskMoversCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  });
  const {
    count: newlyHCCount,
    delta: newlyHCDelta,
    entityIds: newlyHCEntityIds,
    isLoading: newlyHCLoading,
    isMissingIndex: newlyHCMissingIndex,
    isDeltaLoading: newlyHCDeltaLoading,
    trend: newlyHCTrend,
    isTrendLoading: newlyHCTrendLoading,
  } = useNewlyHighCriticalCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
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
        trend: alertsTrend,
        isTrendLoading: alertsTrendLoading,
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
        delta: anomaliesDelta,
        isDeltaLoading: anomaliesDeltaLoading,
        trend: anomaliesTrend,
        isTrendLoading: anomaliesTrendLoading,
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
        trend: riskMoversTrend,
        isTrendLoading: riskMoversTrendLoading,
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
        delta: newlyHCDelta,
        isDeltaLoading: newlyHCDeltaLoading,
        trend: newlyHCTrend,
        isTrendLoading: newlyHCTrendLoading,
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
        trend: watchlistedTrend,
        isTrendLoading: alertsTrendLoading,
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
        trend: newEntityTrend,
        isTrendLoading: newEntityTrendLoading,
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
      watchlistedTrend,
      alertsTrendLoading,
      alertBasedLoading,
      isDeltaLoading,
      anomaliesCount,
      anomaliesDelta,
      anomaliesDeltaLoading,
      anomaliesTrend,
      anomaliesTrendLoading,
      anomaliesLoading,
      riskMoversCount,
      riskMoversDelta,
      riskMoversDeltaLoading,
      riskMoversTrend,
      riskMoversTrendLoading,
      riskMoversLoading,
      newlyHCCount,
      newlyHCDelta,
      newlyHCDeltaLoading,
      newlyHCTrend,
      newlyHCTrendLoading,
      newlyHCLoading,
      newlyHCMissingIndex,
      watchlistedCount,
      watchlistedDelta,
      newEntityCount,
      newEntityDelta,
      newEntityDeltaLoading,
      newEntityTrend,
      newEntityTrendLoading,
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
      <EntityAnalyticsHomeHeader timeRange={timeRange} />
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
