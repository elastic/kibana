/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiErrorBoundary, EuiLoadingSpinner } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { FETCH_STATUS, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useFetchDashboardById } from './hooks/use_fetch_dashboard_by_id';
import { DatePicker } from './components/date_picker/date_picker';
import { DatePickerProvider } from './hooks/use_date_picker';
import { RenderDashboard } from './components/dashboard/render_dashboard';

export const Dashboard = () => {
  const {
    services: {
      observabilityShared: {
        navigation: { PageTemplate },
      },
    },
  } = useKibanaContextForPlugin();

  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { data: dashboardData, status } = useFetchDashboardById(dashboardId);

  const kubernetesLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'kubernetes',
  });

  useMetricsBreadcrumbs([
    {
      text: i18n.translate('xpack.infra.kubernetes.breadcrumbsTitle', {
        defaultMessage: 'Kubernetes',
      }),
      ...kubernetesLinkProps,
    },
    {
      text: dashboardId,
    },
  ]);

  const [pageDashTitle, setPageTitle] = useState<string | undefined>(
    i18n.translate('xpack.infra.kubernetes.pageTitle', {
      defaultMessage: 'Kubernetes Dashboard',
    })
  );

  useEffect(() => {
    if (dashboardData && dashboardData.status === 'success') {
      const dashboardTitle = dashboardData?.attributes?.title;
      setPageTitle(dashboardTitle);
    }
  }, [dashboardData]);

  if (status === FETCH_STATUS.LOADING && !dashboardData) {
    return <EuiLoadingSpinner />;
  }

  return (
    <DatePickerProvider dateRange={undefined}>
      <EuiErrorBoundary>
        <PageTemplate
          pageHeader={{
            pageTitle: pageDashTitle,
            rightSideItems: [<DatePicker />],
          }}
          data-test-subj="infraKubernetesPage"
        >
          <RenderDashboard />
        </PageTemplate>
      </EuiErrorBoundary>
    </DatePickerProvider>
  );
};
