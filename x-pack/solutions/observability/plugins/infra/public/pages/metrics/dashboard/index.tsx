/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiErrorBoundary } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DashboardApi, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export const Dashboard = () => {
  const {
    services: {
      observabilityShared: {
        navigation: { PageTemplate },
      },
    },
  } = useKibanaContextForPlugin();

  const { dashboardId } = useParams<{ dashboardId: string }>();
  const getCreationOptions = useCallback((): Promise<DashboardCreationOptions> => {
    const getInitialInput = () => ({
      viewMode: 'view' as ViewMode,
      timeRange: { from: 'now', to: 'now-15m' },
    });
    return Promise.resolve<DashboardCreationOptions>({
      getInitialInput,
    });
  }, []);

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

  useEffect(() => {
    if (!dashboard) return;
    dashboard.setTimeRange({ from: 'now', to: 'now-15m' });
    dashboard.setQuery({ query: '', language: 'kuery' });
  }, [dashboard]);

  return (
    <EuiErrorBoundary>
      <PageTemplate
        pageHeader={{
          pageTitle: i18n.translate('xpack.infra.kubernetes.pageTitle', {
            defaultMessage: 'Kubernetes',
          }),
        }}
        data-test-subj="infraKubernetesPage"
      >
        <p>
          {i18n.translate('xpack.infra.kubernetes.p.dashboardsLabel', {
            defaultMessage: 'Dashboard:',
          })}{' '}
          <span data-test-subj="infraKubernetesDashboardId">{dashboardId}</span>
        </p>
        <DashboardRenderer
          // TODO: Uncomment when locator is available
          // locator={locator}
          savedObjectId={dashboardId}
          getCreationOptions={getCreationOptions}
          onApiAvailable={setDashboard}
        />
      </PageTemplate>
    </EuiErrorBoundary>
  );
};
