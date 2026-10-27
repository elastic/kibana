/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { TableId } from '@kbn/securitysolution-data-table';
import type {
  IndexPattern,
  KubernetesPageHeaderProps,
} from '@kbn/kubernetes-security-plugin/public/types';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SecurityAppHeader } from '../../common/components/app_header';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useKibana } from '../../common/lib/kibana';
import { SecurityPageName } from '../../../common/constants';
import { DASHBOARDS, KUBERNETES } from '../../app/translations';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SiemSearchBar } from '../../common/components/search_bar';
import { inputsSelectors } from '../../common/store';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { convertToBuildEsQuery } from '../../common/lib/kuery';
import { useInvalidFilterQuery } from '../../common/hooks/use_invalid_filter_query';
import { SessionsView } from '../../common/components/sessions_viewer';
import { kubernetesSessionsHeaders } from './constants';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';

export const KubernetesContainer = React.memo(() => {
  const { kubernetesSecurity, uiSettings } = useKibana().services;

  const { from, to } = useGlobalTime();
  const { dataView } = useDataView();

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const [filterQuery, kqlError] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        dataView,
        queries: [query],
        filters,
      }),
    [dataView, filters, uiSettings, query]
  );

  useInvalidFilterQuery({
    id: 'kubernetesQuery',
    filterQuery,
    kqlError,
    query,
    startDate: from,
    endDate: to,
  });

  const renderSessionsView = useCallback(
    (sessionsFilterQuery: string | undefined) => (
      <SessionsView
        tableId={TableId.kubernetesPageSessions}
        endDate={to}
        pageFilters={[]}
        startDate={from}
        filterQuery={sessionsFilterQuery}
        columns={kubernetesSessionsHeaders}
        defaultColumns={kubernetesSessionsHeaders}
      />
    ),
    [from, to]
  );

  const indexPattern: IndexPattern = useMemo(
    () => ({
      fields: Object.values(dataView.toSpec().fields || {}),
      title: dataView.title,
    }),
    [dataView]
  );

  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const back = useMemo(
    () => ({
      href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.dashboards }),
      label: DASHBOARDS,
    }),
    [getSecuritySolutionUrl]
  );

  const renderHeader = useCallback(
    ({ description, menu }: KubernetesPageHeaderProps) => (
      <SecurityAppHeader
        title={KUBERNETES}
        spacing="largeBleed"
        back={back}
        description={description}
        menu={menu}
      />
    ),
    [back]
  );

  return (
    <SecuritySolutionPageWrapper noPadding>
      {kubernetesSecurity.getKubernetesPage({
        filter: (
          <SiemSearchBar dataView={dataView} displayStyle="inPage" id={InputsModelId.global} />
        ),
        renderHeader,
        indexPattern,
        globalFilter: {
          filterQuery,
          startDate: from,
          endDate: to,
        },
        renderSessionsView,
        dataViewId: dataView.id ?? undefined,
      })}
      <SpyRoute pageName={SecurityPageName.kubernetes} />
    </SecuritySolutionPageWrapper>
  );
});

KubernetesContainer.displayName = 'KubernetesContainer';
