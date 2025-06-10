/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiErrorBoundary, EuiLoadingSpinner } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DashboardApi, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { FETCH_STATUS, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { KUBERNETES_DASHBOARD_LOCATOR_ID } from '@kbn/observability-shared-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useFetchDashboardById } from './hooks/use_fetch_dashboard_by_id';

export const Dashboard = () => {
  const {
    services: {
      share,
      observabilityShared: {
        navigation: { PageTemplate },
      },
    },
  } = useKibanaContextForPlugin();

  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { data: dashboardData, status } = useFetchDashboardById(dashboardId);
  const getCreationOptions = useCallback((): Promise<DashboardCreationOptions> => {
    const getInitialInput = () => ({
      viewMode: 'view' as ViewMode,
      timeRange: { from: 'now', to: 'now-15m' },
    });
    return Promise.resolve<DashboardCreationOptions>({
      getInitialInput,
    });
  }, []);

  const getLocatorParams = useCallback(
    (params: SerializableRecord) => {
      return {
        dashboardId: params?.dashboardId ?? dashboardId,
      };
    },
    [dashboardId]
  );

  const locator = useMemo(() => {
    const baseLocator = share.url.locators.get(KUBERNETES_DASHBOARD_LOCATOR_ID);
    if (!baseLocator) return;

    return {
      ...baseLocator,
      getRedirectUrl: (params: SerializableRecord) =>
        baseLocator.getRedirectUrl(getLocatorParams(params)),
      navigate: (params: SerializableRecord) => baseLocator.navigate(getLocatorParams(params)),
    };
  }, [share, getLocatorParams]);

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

  const [dashboard, setDashboard] = useState<DashboardApi | undefined>(undefined);
  const [pageDashTitle, setPageTitle] = useState<string | undefined>(
    i18n.translate('xpack.infra.kubernetes.pageTitle', {
      defaultMessage: 'Kubernetes Dashboard',
    })
  );

  useEffect(() => {
    if (!dashboard) return;
    dashboard.setTimeRange({ from: 'now', to: 'now-15m' });
    dashboard.setQuery({ query: '', language: 'kuery' });
    if (dashboardData && dashboardData.status === 'success') {
      const dashboardTitle = dashboardData?.attributes?.title;
      setPageTitle(dashboardTitle);
    }
  }, [dashboardData, dashboard, dashboardId]);

  if (status === FETCH_STATUS.LOADING && !dashboardData) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiErrorBoundary>
      <PageTemplate
        pageHeader={{
          pageTitle: pageDashTitle,
        }}
        data-test-subj="infraKubernetesPage"
      >
        <DashboardRenderer
          locator={locator}
          savedObjectId={dashboardId}
          getCreationOptions={getCreationOptions}
          onApiAvailable={setDashboard}
        />
      </PageTemplate>
    </EuiErrorBoundary>
  );
};
