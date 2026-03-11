/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { i18n } from '@kbn/i18n';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { Watchlists } from '../components/watchlists';

const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistsManagement.pageTitle',
  {
    defaultMessage: 'Watchlists Management',
  }
);

export const EntityAnalyticsWatchlistsManagementPage = () => {
  return (
    <>
      <SecuritySolutionPageWrapper data-test-subj="watchlistManagementPage">
        <HeaderPage title={PAGE_TITLE} />
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem>
            <Watchlists />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.entityAnalyticsWatchlists} />
    </>
  );
};
