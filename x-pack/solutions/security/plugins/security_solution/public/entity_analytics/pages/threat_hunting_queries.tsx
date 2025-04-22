/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiLoadingSpinner, EuiFlexItem } from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';

const ThreatHuntingQueriesComponent = () => {
  return (
    <>
      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
        <HeaderPage title={'Threat Hunting Queries'} />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <h2>{'Loading...'}</h2>
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.privilegedUserMonitoring} />
    </>
  );
};

export const ThreatHuntingQueriesPage = React.memo(ThreatHuntingQueriesComponent);
