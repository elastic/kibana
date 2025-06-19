/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiLoadingSpinner, EuiSwitch } from '@elastic/eui';
import { useTimeRangeMetadataContext } from '../../../../../hooks/use_timerange_metadata';
import { RenderDashboard } from '../dashboard/render_dashboard';

const OverviewDashboardsPerSchema = {
  semconv: 'kubernetes_otel-cluster-overview',
  ecs: 'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c',
} as const;

export const PageContent = ({
  dashboardId,
  hasMultipleDashboards,
}: {
  dashboardId: string;
  hasMultipleDashboards: boolean;
}) => {
  const { data, status } = useTimeRangeMetadataContext();
  const [currentDashboardId, setCurrentDashboardId] = useState(
    hasMultipleDashboards ? OverviewDashboardsPerSchema.semconv : dashboardId
  );

  const onChange = (e: { target: { checked: React.SetStateAction<boolean> } }) => {
    setCurrentDashboardId(
      e.target.checked
        ? OverviewDashboardsPerSchema.semconv
        : dashboardId ?? OverviewDashboardsPerSchema.ecs
    );
  };

  const shouldRenderMultipleDashboardsToggle = useMemo(
    () =>
      Object.keys(OverviewDashboardsPerSchema).every((key) =>
        data?.schemas.includes(key as keyof typeof OverviewDashboardsPerSchema)
      ),
    [data?.schemas]
  );

  if (status === 'loading') {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (data?.schemas === undefined) {
    return null;
  }

  if (shouldRenderMultipleDashboardsToggle) {
    return (
      <>
        <EuiFormRow
          display="columnCompressed"
          label={
            <span id={currentDashboardId}>
              {i18n.translate('xpack.infra.pageContent.span.otelfocusedDashboardLabel', {
                defaultMessage: 'OTel-focused dashboard',
              })}
            </span>
          }
        >
          <EuiSwitch
            label={currentDashboardId === OverviewDashboardsPerSchema.semconv ? 'otel' : 'ecs'}
            checked={currentDashboardId === OverviewDashboardsPerSchema.semconv}
            onChange={onChange}
            aria-describedby={currentDashboardId}
            compressed
          />
        </EuiFormRow>
        <RenderDashboard dashboardId={currentDashboardId} />
      </>
    );
  }

  return <RenderDashboard dashboardId={dashboardId} />;
};
