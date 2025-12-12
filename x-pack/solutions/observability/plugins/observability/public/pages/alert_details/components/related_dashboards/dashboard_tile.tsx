/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiLink,
} from '@elastic/eui';
import type { SavedObjectsReference } from '@kbn/content-management-content-editor';
import type { RelatedDashboard } from '@kbn/observability-schema';
import { useKibana } from '../../../../utils/kibana_react';

export interface ActionButtonProps {
  onClick: (dashboard: RelatedDashboard) => void;
  label: string;
  isLoading: boolean;
  isDisabled: boolean;
  ruleType: string;
}

export function DashboardTile({
  dashboard,
  actionButtonProps,
  timeRange,
}: {
  dashboard: RelatedDashboard;
  actionButtonProps?: ActionButtonProps;
  timeRange: NonNullable<DashboardLocatorParams['time_range']>;
}) {
  const {
    services: {
      telemetryClient,
      share: { url: urlService },
      savedObjectsTagging: { ui: savedObjectsTaggingUi },
    },
  } = useKibana();
  const dashboardLocator = urlService.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);

  const tagsReferences: SavedObjectsReference[] = (dashboard.tags || []).flatMap((tag) => {
    const ref = savedObjectsTaggingUi.convertNameToReference(tag);
    return ref ? [{ ...ref, name: tag }] : [];
  });

  return (
    <>
      <EuiFlexGroup gutterSize="xs" responsive={false} key={dashboard.id} alignItems="center">
        <EuiFlexGroup key={dashboard.id} gutterSize="s" direction="column">
          {/* Allowing both href and onClick to allow telemetry to be reported */}
          {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
          <EuiLink
            data-test-subj={`alertDetails_viewLinkedDashboard_${actionButtonProps?.ruleType}`}
            href={dashboardLocator?.getRedirectUrl({
              dashboardId: dashboard.id,
              time_range: timeRange,
            })}
            target="_blank"
            onClick={() => {
              if (telemetryClient) {
                telemetryClient.reportLinkedDashboardViewed(
                  actionButtonProps?.ruleType || 'unknown'
                );
              }
            }}
          >
            {dashboard.title}
          </EuiLink>
          <EuiText color={'subdued'} size="s">
            {dashboard.description}
          </EuiText>
          {tagsReferences.length ? (
            <savedObjectsTaggingUi.components.TagList
              object={{
                references: tagsReferences,
              }}
            />
          ) : null}
        </EuiFlexGroup>
        {actionButtonProps ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={`addSuggestedDashboard_alertDetailsPage_${actionButtonProps.ruleType}`}
              onClick={() => {
                actionButtonProps.onClick(dashboard);
                telemetryClient.reportSuggestedDashboardAdded(actionButtonProps.ruleType);
              }}
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
