/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiLoadingSpinner, EuiFlexItem } from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram-plugin/public';
import { UnifiedHistogramContainer } from '@kbn/unified-histogram-plugin/public';
import useAsync from 'react-use/lib/useAsync';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useKibana } from '../../common/lib/kibana';

const DENY_PUSH = `from logs-okta*
| where @timestamp > NOW() - 7 day
| eval target_time_window = DATE_TRUNC(10 minutes, @timestamp)
| where event.action == "user.mfa.okta_verify.deny_push"
| stats deny_push_count = count(*) by target_time_window, okta.actor.alternate_id
| where deny_push_count >= 5`;

function HistogramComponent() {
  // Get required Kibana services
  const capabilities = useKibana().services.application.capabilities;
  const allServices = useKibana().services;

  const services: UnifiedHistogramServices = {
    ...allServices,
    capabilities,
  };

  const dataViewAsync = useAsync(() => {
    return getESQLAdHocDataview(DENY_PUSH, allServices.dataViews);
  }, [DENY_PUSH, allServices.dataViews]);

  if (!dataViewAsync.value) {
    return <EuiLoadingSpinner size="l" />;
  }

  const dataParams = {
    dataView: dataViewAsync.value,
    query: { query: DENY_PUSH, language: 'esql' },
    filters: [],
    timeRange: { from: 'now-48h', to: 'now' },
    // relativeTimeRange: { from: 900, to: 0 },
    container: null,
  };

  return (
    <EuiFlexItem grow={true}>
      <UnifiedHistogramContainer services={services} {...dataParams}>
        <>{'hello'}</>
      </UnifiedHistogramContainer>
    </EuiFlexItem>
  );
}

const PrivilegedUserMonitoringComponent = () => {
  return (
    <>
      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
        <HeaderPage title={'Threat Hunting Queries'} />
        <EuiFlexGroup>
          <HistogramComponent />
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.privilegedUserMonitoring} />
    </>
  );
};

export const PrivilegedUserMonitoringPage = React.memo(PrivilegedUserMonitoringComponent);
