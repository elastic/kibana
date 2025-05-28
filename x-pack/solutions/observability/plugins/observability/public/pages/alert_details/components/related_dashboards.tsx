/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { useKibana } from '../../../utils/kibana_react';
import { TopAlert } from '../../..';

interface RelatedDashboardsProps {
  alert: TopAlert;
  relatedDashboards: Array<{ id: string }>;
}

export function RelatedDashboards({ alert, relatedDashboards }: RelatedDashboardsProps) {
  const [dashboardsMeta, setDashboardsMeta] = useState<
    Array<{ id: string; title: string; description: string }>
  >([]);

  const {
    services: {
      share: { url: urlService },
      dashboard: dashboardService,
    },
  } = useKibana();

  const dashboardLocator = urlService.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);

  useEffect(() => {
    if (!relatedDashboards?.length || !dashboardService) {
      return;
    }

    const fetchDashboards = async () => {
      const dashboardPromises = relatedDashboards.map(async (dashboard) => {
        try {
          const findDashboardsService = await dashboardService.findDashboardsService();
          const response = await findDashboardsService.findById(dashboard.id);

          if (response.status === 'error') {
            return null;
          }

          return {
            id: dashboard.id,
            title: response.attributes.title,
            description: response.attributes.description,
          };
        } catch (dashboardError) {
          return null;
        }
      });

      const results = await Promise.all(dashboardPromises);

      // Filter out null results (failed dashboard fetches)
      const validDashboards = results.filter(Boolean) as Array<{
        id: string;
        title: string;
        description: string;
      }>;

      setDashboardsMeta(validDashboards);
    };

    fetchDashboards();
  }, [relatedDashboards, dashboardService, setDashboardsMeta]);

  return (
    <div>
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.observability.alertDetails.relatedDashboards', {
                defaultMessage: 'Linked dashboards',
              })}
            </h2>
          </EuiTitle>
          <EuiHorizontalRule margin="xs" />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      {dashboardsMeta.map((dashboard) => (
        <>
          <EuiFlexGroup gutterSize="xs" responsive={false} key={dashboard.id}>
            <EuiFlexItem key={dashboard.id}>
              <EuiText size="s">
                <a
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (dashboardLocator) {
                      const url = await dashboardLocator.getUrl({
                        dashboardId: dashboard.id,
                      });
                      window.open(url, '_blank');
                    } else {
                      console.error('Dashboard locator is not available');
                    }
                  }}
                >
                  {dashboard.title}
                </a>
              </EuiText>
              <EuiText color={'subdued'} size="s">
                {dashboard.description}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="xs" />
        </>
      ))}
    </div>
  );
}
