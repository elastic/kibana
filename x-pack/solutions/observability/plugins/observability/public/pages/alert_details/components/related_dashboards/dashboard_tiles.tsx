/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import type { RelatedDashboard } from '@kbn/observability-schema';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { ActionButtonProps } from './dashboard_tile';
import { DashboardTile } from './dashboard_tile';

export function DashboardTiles({
  title,
  isLoadingDashboards,
  dashboards,
  dataTestSubj,
  timeRange,
}: {
  title: string;
  isLoadingDashboards: boolean;
  dashboards?: Array<RelatedDashboard & { actionButtonProps?: ActionButtonProps }>;
  dataTestSubj: string;
  timeRange: NonNullable<DashboardLocatorParams['time_range']>;
}) {
  const wrapWithHeader = (component: React.ReactNode) => {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiFlexGroup gutterSize="xs" responsive={false}>
          <EuiFlexItem>
            <EuiTitle data-test-subj={dataTestSubj}>
              <h2>{title}</h2>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {component}
      </>
    );
  };

  if (isLoadingDashboards) return wrapWithHeader(<EuiLoadingSpinner />);

  if (!dashboards || !dashboards.length)
    return wrapWithHeader(
      <EuiText>
        {i18n.translate('xpack.observability.relatedDashboards.noDashboardsTextLabel', {
          defaultMessage: 'No dashboards',
        })}
      </EuiText>
    );

  return wrapWithHeader(
    dashboards.map(({ actionButtonProps, ...rest }) => (
      <DashboardTile
        key={rest.id}
        dashboard={rest}
        actionButtonProps={actionButtonProps}
        timeRange={timeRange}
      />
    ))
  );
}
