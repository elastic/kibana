/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiLoadingSpinner, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { buildEsQuery } from '@kbn/es-query';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { EntitySearchBar } from '../components/home/entity_search_bar';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import {
  globalFiltersQuerySelector,
  globalQuerySelector,
} from '../../common/store/inputs/selectors';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import { useWatchlistNames } from '../components/home/use_watchlist_names';
import { useTimeRangeParam } from '../components/home/use_time_range_param';
import { useEntityFiltersParam } from '../components/home/use_entity_filters_param';
import { EntityFiltersBar } from '../components/home/entity_filters_bar';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.home.pageTitle', {
  defaultMessage: 'Entity Analytics',
});

const MANAGEMENT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.managementLink',
  { defaultMessage: 'Management' }
);

export const EntityAnalyticsNewHomePage: React.FC = () => {
  const spaceId = useSpaceId();
  const { dataView, isLoading: isDataViewLoading } = useEntityStoreDataView(spaceId);
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { euiTheme } = useEuiTheme();

  const globalFilters = useDeepEqualSelector(globalFiltersQuerySelector());
  const globalQuery = useDeepEqualSelector(globalQuerySelector());

  const esFilter = useMemo(() => {
    try {
      return buildEsQuery(dataView, [globalQuery], globalFilters);
    } catch {
      return undefined;
    }
  }, [dataView, globalQuery, globalFilters]);

  const watchlistNames = useWatchlistNames();
  const [timeRange, setTimeRange] = useTimeRangeParam();
  const [viewBy] = useState<'resolved' | 'raw'>('resolved');

  const { entityFilters, setEntityFilters } = useEntityFiltersParam();

  // const baseFilter = useMemo(
  //   () => combineFilters([esFilter, ...getEntityFilterTerms(entityFilters)]),
  //   [esFilter, entityFilters]
  // );

  // const [selectedTileId, setSelectedTileId] = useTileParam();

  // tile hooks filters: esFilter + entity filters
  // const { entityIds: alertEntityIds } = useEntitiesWithAlertsCount({ spaceId, filter: baseFilter });

  // const tileEntityIds = useMemo(() => {
  //   if (selectedTileId === 'entitiesWithAlerts') return alertEntityIds;
  //   if (selectedTileId === 'entitiesWithAnomalies') return anomalyEntityIds;
  //   return [];
  // }, [selectedTileId, alertEntityIds, anomalyEntityIds]);

  // const tileFilter = selectedTileId
  //   ? { terms: { 'entity.id': tileEntityIds } }
  //   : undefined;

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

  if (isDataViewLoading) return <EuiLoadingSpinner size="l" />;

  return (
    <>
      <AppHeader title={PAGE_TITLE} menu={menu} spacing="flush" />
      <SecuritySolutionPageWrapper noPadding data-test-subj="entityAnalyticsNewHomePage">
        <div
          css={css`
            padding-block-start: ${euiTheme.size.s};
            margin-inline-start: -${euiTheme.size.s};
            display: flex;
            flex-direction: column;
            height: 100%;
          `}
        >
          <EntitySearchBar
            dataView={dataView}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
          <EuiSpacer size="s" />
          <div
            css={css`
              padding-inline-start: ${euiTheme.size.s};
            `}
          >
            <EntityFiltersBar
              filters={entityFilters}
              onFiltersChange={setEntityFilters}
              spaceId={spaceId}
              view={viewBy}
              esFilter={esFilter}
              // tileFilter={tileFilter}
              watchlistNames={watchlistNames}
            />
          </div>
        </div>
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};
