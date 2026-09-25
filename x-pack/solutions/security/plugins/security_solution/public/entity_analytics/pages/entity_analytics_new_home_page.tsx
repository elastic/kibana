/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiLoadingSpinner, EuiPanel, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
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
import { useTimeRangeParam } from '../components/home/use_time_range_param';
import {
  useEntityFiltersParam,
  getEntityFilterTerms,
} from '../components/home/use_entity_filters_param';
import { EntityFiltersBar } from '../components/home/entity_filters_bar';
import {
  useAlertBasedTiles,
  useEntitiesWithAnomaliesCount,
  useNewEntityCount,
  useRiskMoversCount,
  useNewlyHighCriticalCount,
} from '../components/home/needs_attention_tiles/hooks';
import { SignalCards } from '../components/home/needs_attention_tiles/signal_cards';
import type { ActiveFilter, SignalCardData } from '../components/home/needs_attention_tiles/data';
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

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.home.pageTitle', {
  defaultMessage: 'Entity Analytics',
});

const MANAGEMENT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.managementLink',
  { defaultMessage: 'Management' }
);

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

export const EntityAnalyticsNewHomePage: React.FC = () => {
  const spaceId = useSpaceId();
  const {
    dataView,
    isLoading: isDataViewLoading,
    error: isDataViewError,
  } = useEntityStoreDataView(spaceId);
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
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

  const [timeRange, setTimeRange] = useTimeRangeParam();
  const [viewBy] = useState<'resolved' | 'raw'>('resolved');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);

  const { entityFilters, setEntityFilters } = useEntityFiltersParam();

  const baseFilter = useMemo(
    () => combineFilters([esFilter, ...getEntityFilterTerms(entityFilters)]),
    [esFilter, entityFilters]
  );

  const resolvedSpaceId = spaceId ?? 'default';

  const {
    alertsCount,
    alertsEntityIds,
    watchlistedCount,
    watchlistedEntityIds,
    isLoading: alertBasedLoading,
  } = useAlertBasedTiles({ spaceId: resolvedSpaceId, timeRange, entityFilters });
  const {
    count: anomaliesCount,
    entityIds: anomaliesEntityIds,
    isLoading: anomaliesLoading,
  } = useEntitiesWithAnomaliesCount({ spaceId: resolvedSpaceId, timeRange, entityFilters });
  const {
    count: newEntityCount,
    entityIds: newEntityEntityIds,
    isLoading: newEntityLoading,
  } = useNewEntityCount({ spaceId: resolvedSpaceId, timeRange, entityFilters });
  const {
    count: riskMoversCount,
    entityIds: riskMoversEntityIds,
    isLoading: riskMoversLoading,
    isMissingIndex: riskMoversMissingIndex,
  } = useRiskMoversCount({ spaceId: resolvedSpaceId, timeRange, entityFilters });
  const {
    count: newlyHCCount,
    entityIds: newlyHCEntityIds,
    isLoading: newlyHCLoading,
    isMissingIndex: newlyHCMissingIndex,
  } = useNewlyHighCriticalCount({ spaceId: resolvedSpaceId, timeRange, entityFilters });

  const handleFilterForCard = useCallback((cardId: ActiveFilter['cardId']) => {
    setActiveFilter((prev) =>
      prev?.cardId === cardId ? null : { type: 'card', cardId, label: cardId }
    );
  }, []);

  const cardFilter = useMemo((): QueryDslQueryContainer | null => {
    if (!activeFilter || activeFilter.type !== 'card') return null;
    switch (activeFilter.cardId) {
      case 'entitiesWithAlerts':
        return toTermsFilter(alertsEntityIds);
      case 'entitiesWithAnomalies':
        return toTermsFilter(anomaliesEntityIds);
      case 'riskMovers':
        return toTermsFilter(riskMoversEntityIds);
      case 'newlyHighCritical':
        return toTermsFilter(newlyHCEntityIds);
      case 'watchlisted':
        return toTermsFilter(watchlistedEntityIds);
      case 'newEntity':
        return toTermsFilter(newEntityEntityIds);
      default:
        return null;
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
      watchlistedCount,
      newEntityCount,
      newEntityLoading,
      timeRange,
    ]
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

  const dataViewContextValue = useMemo(
    () => ({ dataView, dataViewIsLoading: isDataViewLoading }),
    [dataView, isDataViewLoading]
  );

  const { data: entityStoreStatusData } = useEntityStoreStatus();
  const entityStoreDisabled =
    entityStoreStatusData?.status === 'not_installed' ||
    entityStoreStatusData?.status === 'stopped';
  const entityStoreInstalling = entityStoreStatusData?.status === 'installing';

  if (isDataViewLoading || entityStoreInstalling) return <EuiLoadingSpinner size="l" />;
  if (isDataViewError) return <DataViewErrorComponent />;
  if (entityStoreDisabled) return <EntityStoreDisabledEmptyPrompt />;

  return (
    <>
      <AppHeader title={PAGE_TITLE} menu={menu} spacing="flush" />
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
            esFilter={esFilter}
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

  const prevCardFilterRef = useRef(cardFilter);
  useEffect(() => {
    if (prevCardFilterRef.current !== cardFilter) {
      prevCardFilterRef.current = cardFilter;
      urlState.onChangePage(0);
    }
  }, [cardFilter, urlState.onChangePage]);

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
