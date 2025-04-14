/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '../../app/types';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';

const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.pageTitle',
  {
    defaultMessage: 'Privileged User Monitoring',
  }
);

export const EntityAnalyticsPrivilegedUserMonitoringPage = () => {
  return (
    <SecuritySolutionPageWrapper>
      <HeaderPage title={PAGE_TITLE} />
      <SpyRoute pageName={SecurityPageName.privilegedUserMonitoring} />
    </SecuritySolutionPageWrapper>
  );
};
