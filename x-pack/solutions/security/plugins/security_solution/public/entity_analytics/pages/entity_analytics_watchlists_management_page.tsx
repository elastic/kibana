/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HeaderPage } from '@kbn/cases-plugin/public/components/header_page';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';

const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistsManagement.pageTitle',
  {
    defaultMessage: 'Watchlists Management',
  }
);

export const EntityAnalyticsWatchlistsManagementPage = () => {
  return (
    <SecuritySolutionPageWrapper>
      <HeaderPage title={PAGE_TITLE} />
      <SpyRoute pageName={SecurityPageName.entityAnalyticsWatchlists} />
    </SecuritySolutionPageWrapper>
  );
};
