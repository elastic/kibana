/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { PrivilegedUserMonitoringSampleDashboardsPanel } from '../components/privileged_user_monitoring_onboarding/sample_dashboards_panel';
import { PrivilegedUserMonitoringOnboardingPanel } from '../components/privileged_user_monitoring_onboarding/onboarding_panel';
import { PrivilegedUserMonitoring } from '../components/privileged_user_monitoring';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useDataViewSpec } from '../../data_view_manager/hooks/use_data_view_spec';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../sourcerer/containers';
import { HeaderPage } from '../../common/components/header_page';

export const EntityAnalyticsPrivilegedUserMonitoringPage = () => {
  // TODO Delete-me when the onboarding flow is implemented
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(true);

  const { sourcererDataView: oldSourcererDataView } = useSourcererDataView();
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataViewSpec } = useDataViewSpec();

  const sourcererDataView = newDataViewPickerEnabled ? dataViewSpec : oldSourcererDataView;

  return (
    <>
      {isOnboardingVisible && (
        <SecuritySolutionPageWrapper>
          <EuiButtonEmpty
            onClick={() => {
              setIsOnboardingVisible(false);
            }}
          >
            {'Go to dashboards =>'}
          </EuiButtonEmpty>
          <PrivilegedUserMonitoringOnboardingPanel />
          <EuiSpacer size="l" />
          <PrivilegedUserMonitoringSampleDashboardsPanel />
        </SecuritySolutionPageWrapper>
      )}

      {!isOnboardingVisible && (
        <>
          <FiltersGlobal>
            <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
          </FiltersGlobal>
          <SecuritySolutionPageWrapper>
            <HeaderPage
              title={
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboards.pageTitle"
                  defaultMessage="Privileged user monitoring"
                />
              }
              rightSideItems={[
                <EuiButtonEmpty
                  onClick={() => {
                    // TODO Implement the settings page
                  }}
                  iconType="gear"
                  color="primary"
                >
                  {'Manage users'}
                </EuiButtonEmpty>,
              ]}
            />
            <PrivilegedUserMonitoring />
          </SecuritySolutionPageWrapper>
        </>
      )}

      <SpyRoute pageName={SecurityPageName.entityAnalyticsPrivilegedUserMonitoring} />
    </>
  );
};
