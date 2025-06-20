/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useReducer } from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiLoadingLogo,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import type { InitMonitoringEngineResponse } from '../../../common/api/entity_analytics/privilege_monitoring/engine/init.gen';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { PrivilegedUserMonitoringSampleDashboardsPanel } from '../components/privileged_user_monitoring_onboarding/sample_dashboards_panel';
import { PrivilegedUserMonitoringOnboardingPanel } from '../components/privileged_user_monitoring_onboarding/onboarding_panel';
import type { OnboardingCallout } from '../components/privileged_user_monitoring';
import { PrivilegedUserMonitoring } from '../components/privileged_user_monitoring';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useDataViewSpec } from '../../data_view_manager/hooks/use_data_view_spec';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../sourcerer/containers';
import { HeaderPage } from '../../common/components/header_page';
import { useEntityAnalyticsRoutes } from '../api/api';

type PageState =
  | { type: 'onboarding' }
  | { type: 'initializingEngine'; initResponse?: InitMonitoringEngineResponse; userCount: number }
  | { type: 'dashboard'; onboardingCallout?: OnboardingCallout };

type Action =
  | { type: 'INITIALIZING_ENGINE'; userCount: number; initResponse?: InitMonitoringEngineResponse }
  | { type: 'UPDATE_INIT_ENGINE_RESPONSE'; initResponse: InitMonitoringEngineResponse }
  | {
      type: 'SHOW_DASHBOARD';
      onboardingCallout?: OnboardingCallout;
    };

const initialState: PageState = { type: 'onboarding' };

function reducer(state: PageState, action: Action): PageState {
  switch (action.type) {
    case 'INITIALIZING_ENGINE':
      return {
        type: 'initializingEngine',
        userCount: action.userCount,
        initResponse: action.initResponse,
      };
    case 'SHOW_DASHBOARD':
      return { type: 'dashboard', onboardingCallout: action.onboardingCallout };
    case 'UPDATE_INIT_ENGINE_RESPONSE':
      if (state.type === 'initializingEngine') {
        return {
          ...state,
          initResponse: action.initResponse,
        };
      }
      return state;
    default:
      return state;
  }
}

export const EntityAnalyticsPrivilegedUserMonitoringPage = () => {
  const { initPrivilegedMonitoringEngine } = useEntityAnalyticsRoutes();
  const [state, dispatch] = useReducer(reducer, initialState);

  const { sourcererDataView: oldSourcererDataView } = useSourcererDataView();
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataViewSpec } = useDataViewSpec();

  const sourcererDataView = newDataViewPickerEnabled ? dataViewSpec : oldSourcererDataView;

  const initEngineCallBack = useCallback(
    async (userCount: number) => {
      dispatch({ type: 'INITIALIZING_ENGINE', userCount });
      const response = await initPrivilegedMonitoringEngine();
      dispatch({ type: 'UPDATE_INIT_ENGINE_RESPONSE', initResponse: response });

      // TODO add status polling when BE API supports it
      if (response.status === 'started') {
        dispatch({
          type: 'SHOW_DASHBOARD',
          onboardingCallout: { userCount },
        });
      }
    },
    [initPrivilegedMonitoringEngine]
  );

  const onManageUserClicked = useCallback(() => {}, []);

  return (
    <>
      {state.type === 'dashboard' && (
        <FiltersGlobal>
          <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
        </FiltersGlobal>
      )}

      <SecuritySolutionPageWrapper>
        {state.type === 'onboarding' && (
          <>
            <EuiButtonEmpty onClick={() => dispatch({ type: 'SHOW_DASHBOARD' })}>
              {'Go to dashboards =>'}
            </EuiButtonEmpty>
            <PrivilegedUserMonitoringOnboardingPanel onComplete={initEngineCallBack} />
            <EuiSpacer size="l" />
            <PrivilegedUserMonitoringSampleDashboardsPanel />
          </>
        )}

        {state.type === 'initializingEngine' && (
          <>
            <HeaderPage
              title={
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboards.pageTitle"
                  defaultMessage="Privileged user monitoring"
                />
              }
            />
            <EuiFlexGroup
              css={css`
                min-height: calc(100vh - 240px);
              `}
            >
              {state.initResponse?.status === 'error' ? (
                <EuiEmptyPrompt
                  iconType="error"
                  color="danger"
                  title={
                    <h2>
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.initEngine.error.title"
                        defaultMessage="Error initializing resources"
                      />
                    </h2>
                  }
                  body={
                    <EuiText color="subdued" data-test-subj="bodyText">
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.initEngine.error.body"
                        defaultMessage="Sorry, there was an error initializing the privileged monitoring resources. Contact your administrator for help."
                      />
                    </EuiText>
                  }
                />
              ) : (
                <EuiEmptyPrompt
                  paddingSize="l"
                  hasShadow
                  titleSize="l"
                  color="plain"
                  title={
                    <h2>
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.initEngine.title"
                        defaultMessage="Setting up privileged user monitoring"
                      />
                    </h2>
                  }
                  icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
                  body={
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.initEngine.description"
                      defaultMessage="We're currently analyzing your connected data sources to set up a comprehensive Privileged user monitoring. This may take a few moments."
                    />
                  }
                />
              )}
            </EuiFlexGroup>
          </>
        )}

        {state.type === 'dashboard' && (
          <>
            <HeaderPage
              title={
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboards.pageTitle"
                  defaultMessage="Privileged user monitoring"
                />
              }
              rightSideItems={[
                <EuiButtonEmpty onClick={onManageUserClicked} iconType="gear" color="primary">
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboards.manageUsersButton"
                    defaultMessage="Manage users"
                  />
                </EuiButtonEmpty>,
              ]}
            />
            <PrivilegedUserMonitoring
              callout={state.onboardingCallout}
              onManageUserClicked={onManageUserClicked}
            />
          </>
        )}

        <SpyRoute pageName={SecurityPageName.entityAnalyticsPrivilegedUserMonitoring} />
      </SecuritySolutionPageWrapper>
    </>
  );
};
