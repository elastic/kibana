/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import type { EntityRiskScore, EntityType } from '../../../common/search_strategy';
import type {
  PrivilegedUserDoc,
  PrivmonLoginDoc,
} from '../../../common/api/entity_analytics/privmon';
import { PRIVILEGED_USER_MONITORING } from '../../app/translations';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../sourcerer/containers';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { NewPrivilegedUsers } from '../components/privileged_users/new_privileged_users';
import { REQUEST_NAMES, useFetch } from '../../common/hooks/use_fetch';
import { KibanaServices } from '../../common/lib/kibana';
import { RiskyUsersWithPrivilege } from '../components/privileged_users/risky_users_with_privilege';
import { SuccessfulPrivilegedAccess } from '../components/privileged_users/successful_privileged_access';
import { UnusualAccessPatterns } from '../components/privileged_users/unusual_access_patterns';

interface PrivilegedUserResponse {
  successfulPrivilegedAccess: PrivmonLoginDoc[];
  newPrivilegedUsers: PrivilegedUserDoc[];
  riskPrivilegedUsers: Array<EntityRiskScore<EntityType.user>>;
  unusualAccessPatterns: Alert[];
}

const fetchPrivilegedUsersData = (): Promise<PrivilegedUserResponse> =>
  KibanaServices.get().http.fetch('/api/privileged_users', {
    prependBasePath: true,
    version: '2023-10-31',
    method: 'GET',
  });

const EntityAnalyticsPrivilegedUserComponent = () => {
  const { loading: isSourcererLoading } = useSourcererDataView();
  const {
    data = {
      newPrivilegedUsers: [],
      riskPrivilegedUsers: [],
      successfulPrivilegedAccess: [],
      unusualAccessPatterns: [],
    },
    isLoading,
  } = useFetch<{}, PrivilegedUserResponse, undefined>(
    REQUEST_NAMES.PRIVILEGED_USER_DATA,
    fetchPrivilegedUsersData,
    {
      initialParameters: {},
    }
  );

  return (
    <>
      <SecuritySolutionPageWrapper noPadding={false}>
        <HeaderPage title={PRIVILEGED_USER_MONITORING} />
        <EuiCallOut
          title="This page is a throwaway proof of concept only!"
          color="warning"
          iconType="alert"
          size="s"
        />
        <EuiSpacer size="l" />
        {isSourcererLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <EuiFlexGroup direction="row" wrap>
            <EuiFlexItem style={{ minWidth: 600 }}>
              <RiskyUsersWithPrivilege
                isLoading={isLoading}
                data={data.riskPrivilegedUsers}
                privilegedUsers={data.newPrivilegedUsers}
              />
            </EuiFlexItem>

            <EuiFlexItem style={{ minWidth: 600 }}>
              <SuccessfulPrivilegedAccess
                isLoading={isLoading}
                data={data.successfulPrivilegedAccess}
                privilegedUsers={data.newPrivilegedUsers}
              />
            </EuiFlexItem>

            <EuiFlexItem style={{ minWidth: 600 }}>
              <NewPrivilegedUsers isLoading={isLoading} data={data.newPrivilegedUsers} />
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: 600 }}>
              <UnusualAccessPatterns
                isLoading={isLoading}
                alerts={data.unusualAccessPatterns}
                privilegedUsers={data.newPrivilegedUsers}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.entityAnalyticsPrivilegedUserMonitoring} />
      <SpyRoute pageName={SecurityPageName.entityAnalytics} />
    </>
  );
};

export const EntityAnalyticsPrivilegedUser = React.memo(EntityAnalyticsPrivilegedUserComponent);
