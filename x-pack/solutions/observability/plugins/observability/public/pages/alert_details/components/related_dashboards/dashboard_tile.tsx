/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiLink,
} from '@elastic/eui';
import { useKibana } from '../../../../utils/kibana_react';
export interface DashboardMetadata {
  id: string;
  title: string;
  description: string;
}

export interface ActionButtonProps {
  onClick: (dashboard: DashboardMetadata) => void;
  label: string;
  isLoading: boolean;
  isDisabled: boolean;
  ruleType: string;
}

export function DashboardTile({
  dashboard,
  actionButtonProps,
}: {
  dashboard: DashboardMetadata;
  actionButtonProps?: ActionButtonProps;
}) {
  const {
    services: {
      share: { url: urlService },
    },
  } = useKibana();
  const dashboardLocator = urlService.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);

  return (
    <>
      <EuiFlexGroup gutterSize="xs" responsive={false} key={dashboard.id}>
        <EuiFlexItem key={dashboard.id}>
          <EuiLink
            data-test-subj="o11yDashboardTileLink"
            href={dashboardLocator?.getRedirectUrl({
              dashboardId: dashboard.id,
            })}
            target="_blank"
          >
            {dashboard.title}
          </EuiLink>
          <EuiText color={'subdued'} size="s">
            {dashboard.description}
          </EuiText>
        </EuiFlexItem>
        {actionButtonProps ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={`addSuggestedDashboard_alertDetailsPage_${actionButtonProps.ruleType}`}
              onClick={() => actionButtonProps.onClick(dashboard)}
              isLoading={actionButtonProps.isLoading}
              isDisabled={actionButtonProps.isDisabled}
              iconType="plus"
            >
              <EuiText>{actionButtonProps.label}</EuiText>
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
    </>
  );
}
