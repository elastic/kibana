/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { PrivilegedUserMonitoringSampleDashboardsPanel } from '../components/privileged_user_monitoring_onboarding/sample_dashboards_panel';
import { PrivilegedUserMonitoringOnboardingPanel } from '../components/privileged_user_monitoring_onboarding/onboarding_panel';

export const EntityAnalyticsPrivilegedUserMonitoringPage = () => {
  return (
    <SecuritySolutionPageWrapper>
      <PrivilegedUserMonitoringOnboardingPanel />
      <EuiSpacer size="l" />
      <PrivilegedUserMonitoringSampleDashboardsPanel />
      <SpyRoute pageName={SecurityPageName.entityAnalyticsPrivilegedUserMonitoring} />
    </SecuritySolutionPageWrapper>
  );
};
