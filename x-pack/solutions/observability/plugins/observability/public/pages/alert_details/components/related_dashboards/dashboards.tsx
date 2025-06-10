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
import { Dashboard, DashboardMetadata } from './dashboard';

export function Dashboards({
  title,
  isLoadingDashboards,
  dashboards,
  actionButtonProps,
}: {
  title: string;
  isLoadingDashboards: boolean;
  dashboards?: DashboardMetadata[];
  actionButtonProps?: { onClick: (dashboard: DashboardMetadata) => void; label: string };
}) {
  const wrapWithHeader = (component: React.ReactNode) => {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiFlexGroup gutterSize="xs" responsive={false}>
          <EuiFlexItem>
            <EuiTitle>
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
    dashboards.map((d) => (
      <Dashboard key={d.id} dashboard={d} actionButtonProps={actionButtonProps} />
    ))
  );
}
