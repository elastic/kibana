/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import { useGetWatchlists } from '../api/hooks/use_get_watchlists';
import { useErrorToast } from '../../common/hooks/use_error_toast';
import { useTimeRangeParam } from '../components/home/use_time_range_param';
import {
  useEntityFiltersParam,
  getEntityFilterTerms,
} from '../components/home/use_entity_filters_param';
import { EntityFiltersBar } from '../components/home/entity_filters_bar';
import {
  useEntitiesWithAlertsCount,
  useEntitiesWithAnomaliesCount,
  useWatchlistedCount,
  useNewEntityCount,
  useRiskMoversCount,
  useNewlyHighCriticalCount,
} from '../components/home/hooks';
import { SignalCards } from '../components/home/facelift/v5/signal_cards';
import type { ActiveFilter, SignalCardData } from '../components/home/facelift/v5/data';
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

// ES has a 1 MB HTTP body limit. A terms filter with thousands of entity IDs easily
// exceeds it once the grouping aggregation is added. Cap at 500 IDs; beyond that,
// return null so the table shows all entities (tile stays highlighted for context).
const MAX_CARD_FILTER_TERMS = 500;
const toTermsFilter = (ids: string[]): QueryDslQueryContainer | null => {
  if (ids.length === 0) return null;
  const capped = ids.length > MAX_CARD_FILTER_TERMS ? ids.slice(0, MAX_CARD_FILTER_TERMS) : ids;
  return { terms: { 'entity.id': capped } };
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

  const { count: alertsCount, entityIds: alertsEntityIds, isLoading: alertsLoading } =
    useEntitiesWithAlertsCount({ spaceId: resolvedSpaceId });
  const { count: anomaliesCount, entityIds: anomaliesEntityIds, isLoading: anomaliesLoading } =
    useEntitiesWithAnomaliesCount({ spaceId: resolvedSpaceId });
  const { count: watchlistedCount, entityIds: watchlistedEntityIds, isLoading: watchlistedLoading } =
    useWatchlistedCount({ spaceId: resolvedSpaceId, timeRange, entityFilters });
  const { count: newEntityCount, entityIds: newEntityEntityIds, isLoading: newEntityLoading } =
    useNewEntityCount({ spaceId: resolvedSpaceId, timeRange, entityFilters });
  const { count: riskMoversCount, entityIds: riskMoversEntityIds, isLoading: riskMoversLoading } =
    useRiskMoversCount({ spaceId: resolvedSpaceId, timeRange, entityFilters });
  const { count: newlyHCCount, entityIds: newlyHCEntityIds, isLoading: newlyHCLoading } =
    useNewlyHighCriticalCount({ spaceId: resolvedSpaceId, timeRange, entityFilters });

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
        title: 'Entities with alerts',
        value: alertsLoading ? 0 : alertsCount,
        description: 'Entities with at least one alert in the last 24h',
        filterLabel: 'Entities with alerts (24h)',
      },
      {
        id: 'entitiesWithAnomalies',
        title: 'Entities with anomalies',
        value: anomaliesLoading ? 0 : anomaliesCount,
        description: 'Entities with at least one ML anomaly in the last 24h',
        filterLabel: 'Entities with anomalies (24h)',
      },
      {
        id: 'riskMovers',
        title: 'Risk movers',
        value: riskMoversLoading ? 0 : riskMoversCount,
        description:
          timeRange === '24h'
            ? 'Entities whose risk score rose ≥10 points vs yesterday'
            : `Entities whose risk score rose ≥10 points vs the previous ${timeRange}`,
        filterLabel: 'Risk movers',
      },
      {
        id: 'newlyHighCritical',
        title: 'Newly high/critical',
        value: newlyHCLoading ? 0 : newlyHCCount,
        description:
          timeRange === '24h'
            ? 'Entities that crossed into High or Critical risk since yesterday'
            : `Entities that crossed into High or Critical risk in the last ${timeRange}`,
        filterLabel: 'Newly high/critical',
      },
      {
        id: 'watchlisted',
        title: 'Watchlisted',
        value: watchlistedLoading ? 0 : watchlistedCount,
        description: 'Entities on a watchlist with a risk score above zero',
        filterLabel: 'Watchlisted',
      },
      {
        id: 'newEntity',
        title: 'New entity',
        value: newEntityLoading ? 0 : newEntityCount,
        description: `Entities first seen in the last ${timeRange} with a risk score above zero`,
        filterLabel: `New entity (last ${timeRange})`,
      },
    ],
    [
      alertsCount,
      alertsLoading,
      anomaliesCount,
      anomaliesLoading,
      riskMoversCount,
      riskMoversLoading,
      newlyHCCount,
      newlyHCLoading,
      watchlistedCount,
      watchlistedLoading,
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

  if (isDataViewLoading) return <EuiLoadingSpinner size="l" />;
  if (isDataViewError) return <DataViewErrorComponent />;

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
          <div
            css={css`
              padding-inline-start: ${euiTheme.size.s};
              padding-inline-end: ${euiTheme.size.s};
            `}
          >
            <SignalCards
              activeFilter={activeFilter}
              cards={signalCards}
              onFilterForCard={handleFilterForCard}
            />
          </div>
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
