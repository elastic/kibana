/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiErrorBoundary } from '@elastic/eui';
import { DashboardListingTable } from '@kbn/dashboard-plugin/public';
import { useLocation } from 'react-router-dom';
import type { RouteState } from '@kbn/metrics-data-access-plugin/public';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export const Kubernetes = () => {
  const {
    services: {
      observabilityShared: {
        navigation: { PageTemplate },
      },
      application: { navigateToApp, getUrlForApp },
    },
  } = useKibanaContextForPlugin();

  useMetricsBreadcrumbs([
    {
      text: i18n.translate('xpack.infra.kubernetes.breadcrumbsTitle', {
        defaultMessage: 'Kubernetes',
      }),
    },
  ]);

  const location = useLocation<RouteState>();

  const getKubernetesPageUrl = useCallback(
    ({ id }: { id: string }) => `kubernetes/${id}${location.search}`,

    [location.search]
  );

  const getOtelKubernetesDashboardUrl = useCallback(
    (id: string) =>
      `${getUrlForApp('metrics', {
        path: getKubernetesPageUrl({
          id,
        }),
      })}`,
    [getKubernetesPageUrl, getUrlForApp]
  );

  const goToDashboard = useCallback(
    (dashboardId: string | undefined) => {
      navigateToApp('metrics', {
        replace: true,
        path: getOtelKubernetesDashboardUrl(dashboardId ?? ''),
      });
    },
    [getOtelKubernetesDashboardUrl, navigateToApp]
  );

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
            defaultMessage: 'Dashboards:',
          })}
        </p>

        <DashboardListingTable
          disableCreateDashboardButton={false}
          getDashboardUrl={getOtelKubernetesDashboardUrl}
          goToDashboard={goToDashboard}
          initialFilter='tag:("OpenTelemetry")'
          urlStateEnabled={false}
          showCreateDashboardButton={false}
        />
      </PageTemplate>
    </EuiErrorBoundary>
  );
};
