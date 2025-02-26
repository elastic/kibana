/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { ALERT_START, ALERT_END } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import { EuiLink, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { GetRecommendedDashboardsResponse } from '@kbn/observability-schema';
import { TimeRange } from '@kbn/es-query';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { useKibana } from '../../../utils/kibana_react';
import { TopAlert } from '../../..';

interface RelatedDashboardsProps {
  alert: TopAlert;
  recommendedDashboards: GetRecommendedDashboardsResponse['dashboards'];
}

export function RelatedDashboards({ alert, recommendedDashboards }: RelatedDashboardsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });

  const alertStart = alert.fields[ALERT_START];
  const alertEnd = alert.fields[ALERT_END];
  const {
    services: {
      share: { url: urlService },
    },
  } = useKibana();

  useEffect(() => {
    setTimeRange(getPaddedAlertTimeRange(alertStart!, alertEnd));
  }, [alertStart, alertEnd]);

  const dashboardLocator = urlService.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
  return (
    <div>
      <EuiSpacer size="l" />
      <EuiText size="s">
        <h2>
          {i18n.translate('xpack.observability.linkedDashboards.title', {
            defaultMessage: 'Linked Dashboards',
          })}
        </h2>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiText size="s">
        <h2>
          {i18n.translate('xpack.observability.recommendedDashboards.title', {
            defaultMessage: 'Recommended Dashboards',
          })}
        </h2>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column">
        {recommendedDashboards.map((dashboard) => (
          <EuiFlexItem key={dashboard.id}>
            <EuiLink
              href={dashboardLocator?.getRedirectUrl({
                dashboardId: dashboard.id,
                timeRange,
              })}
              target="_blank"
              data-test-subj="linkedDashboard"
            >
              {dashboard.title}
            </EuiLink>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
}
