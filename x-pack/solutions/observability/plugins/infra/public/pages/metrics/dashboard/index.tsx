/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiErrorBoundary, EuiLoadingSpinner } from '@elastic/eui';
import { useLocation, useParams } from 'react-router-dom';
import { FETCH_STATUS, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useTimeRange } from '../../../hooks/use_time_range';
import { TimeRangeMetadataProvider } from '../../../hooks/use_timerange_metadata';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useFetchDashboardById } from './hooks/use_fetch_dashboard_by_id';
import { PageContent } from './components/page_content/page_content';

export const Dashboard = () => {
  const {
    services: {
      observabilityShared: {
        navigation: { PageTemplate },
      },
      data: {
        query: { timefilter },
      },
    },
  } = useKibanaContextForPlugin();

  const { from, to } = timefilter.timefilter.getTime();

  const parsedDateRange = useTimeRange({
    rangeFrom: from,
    rangeTo: to,
  });

  const { search } = useLocation();
  const { namespace, name } = useParams<{ namespace: string; name?: string }>();
  const { dashboardId, entityId, kuery } = useMemo(() => {
    const query = new URLSearchParams(search);
    return {
      dashboardId: query.get('dashboardId') ?? '',
      entityId: query.get('entityId'),
      kuery: query.get('kuery') ? decodeURIComponent(query.get('kuery')!) : undefined,
    };
  }, [search]);

  const { data: dashboardData, status } = useFetchDashboardById(dashboardId);

  const kubernetesLinkProps = useLinkProps({
    app: 'metrics',
    pathname: namespace,
  });

  const pageTitle = useMemo(
    () => (name ?? namespace).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()),
    [namespace, name]
  );

  useMetricsBreadcrumbs([
    {
      text: i18n.translate('xpack.infra.kubernetes.breadcrumbsTitle', {
        defaultMessage: 'Kubernetes',
      }),
      ...kubernetesLinkProps,
    },
    {
      text: pageTitle,
    },
  ]);

  if (status === FETCH_STATUS.LOADING && !dashboardData) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiErrorBoundary>
      <PageTemplate
        pageHeader={{
          pageTitle,
        }}
        data-test-subj="infraKubernetesPage"
      >
        <TimeRangeMetadataProvider
          kuery=""
          dataSource="kubernetes"
          start={parsedDateRange.from}
          end={parsedDateRange.to}
        >
          <PageContent dashboardId={dashboardId} entityId={entityId} kuery={kuery} />
        </TimeRangeMetadataProvider>
      </PageTemplate>
    </EuiErrorBoundary>
  );
};
