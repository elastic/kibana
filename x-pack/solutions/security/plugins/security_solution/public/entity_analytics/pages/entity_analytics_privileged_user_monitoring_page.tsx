/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingLogo,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import type { PrivMonHealthResponse } from '../../../common/api/entity_analytics/privilege_monitoring/health.gen';
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
import { usePrivilegedMonitoringEngineStatus } from '../api/hooks/use_privileged_monitoring_engine_status';
import { PrivilegedUserMonitoringManageDataSources } from '../components/privileged_user_monitoring_manage_data_sources';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useLinkInfo, useUpdateLinkConfig } from '../../common/links/links_hooks';
import { PageLoader } from '../../common/components/page_loader';
import { DataViewManagerScopeName } from '../../data_view_manager/constants';

type PageState =
  | { type: 'fetchingEngineStatus' }
  | { type: 'onboarding' }
  | {
      type: 'initializingEngine';
      initResponse?: InitMonitoringEngineResponse | PrivMonHealthResponse;
      userCount: number;
    }
  | { type: 'dashboard'; onboardingCallout?: OnboardingCallout; error: string | undefined }
  | { type: 'initializingEngine'; initResponse?: InitMonitoringEngineResponse; userCount: number }
  | { type: 'manageDataSources' };

type Action =
  | { type: 'INITIALIZING_ENGINE'; userCount: number; initResponse?: InitMonitoringEngineResponse }
  | { type: 'UPDATE_INIT_ENGINE_RESPONSE'; initResponse: InitMonitoringEngineResponse }
  | {
      type: 'SHOW_DASHBOARD';
      onboardingCallout?: OnboardingCallout;
      error?: string;
    }
  | {
      type: 'SHOW_ONBOARDING';
    }
  | { type: 'SHOW_MANAGE_DATA_SOURCES' };

const initialState: PageState = { type: 'fetchingEngineStatus' };
function reducer(state: PageState, action: Action): PageState {
  switch (action.type) {
    case 'SHOW_DASHBOARD':
      return {
        type: 'dashboard',
        onboardingCallout: action.onboardingCallout,
        error: action.error,
      };
    case 'SHOW_ONBOARDING':
      return { type: 'onboarding' };
    case 'INITIALIZING_ENGINE':
      return {
        type: 'initializingEngine',
        userCount: action.userCount,
        initResponse: action.initResponse,
      };

    case 'UPDATE_INIT_ENGINE_RESPONSE':
      if (state.type === 'initializingEngine') {
        return {
          ...state,
          initResponse: action.initResponse,
        };
      }
      return state;
    case 'SHOW_MANAGE_DATA_SOURCES':
      return { type: 'manageDataSources' };
    default:
      return state;
  }
}

export const EntityAnalyticsPrivilegedUserMonitoringPage = () => {
  const { initPrivilegedMonitoringEngine } = useEntityAnalyticsRoutes();
  const [state, dispatch] = useReducer(reducer, initialState);

  const {
    indicesExist: oldIndicesExist,
    loading: oldIsSourcererLoading,
    sourcererDataView: oldSourcererDataViewSpec,
  } = useSourcererDataView();
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataView, status } = useDataView(DataViewManagerScopeName.explore);
  const { dataViewSpec } = useDataViewSpec(DataViewManagerScopeName.explore); // TODO: newDataViewPicker - this could be left, as the fieldMap spec is actually being used

  const isSourcererLoading = useMemo(
    () => (newDataViewPickerEnabled ? status !== 'ready' : oldIsSourcererLoading),
    [newDataViewPickerEnabled, oldIsSourcererLoading, status]
  );

  const indicesExist = useMemo(
    () => (newDataViewPickerEnabled ? !!dataView?.matchedIndices?.length : oldIndicesExist),
    [dataView?.matchedIndices?.length, newDataViewPickerEnabled, oldIndicesExist]
  );

  const sourcererDataView = newDataViewPickerEnabled ? dataViewSpec : oldSourcererDataViewSpec;
  const engineStatus = usePrivilegedMonitoringEngineStatus();
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

  const onManageUserClicked = useCallback(() => {
    dispatch({ type: 'SHOW_MANAGE_DATA_SOURCES' });
  }, []);

  const onBackToDashboardClicked = useCallback(() => {
    dispatch({ type: 'SHOW_DASHBOARD' });
  }, []);

  useEffect(() => {
    if (engineStatus.isLoading) {
      return;
    }

    if (engineStatus.isError) {
      const errorMessage = engineStatus.error?.body.message ?? engineStatus.data?.error?.message;

      return dispatch({
        type: 'SHOW_DASHBOARD',
        onboardingCallout: undefined,
        error: errorMessage,
      });
    }

    if (engineStatus.data?.status === 'not_found') {
      return dispatch({ type: 'SHOW_ONBOARDING' });
    } else {
      return dispatch({ type: 'SHOW_DASHBOARD' });
    }
  }, [
    engineStatus.data?.error?.message,
    engineStatus.data?.status,
    engineStatus.error?.body,
    engineStatus.isError,
    engineStatus.isLoading,
  ]);

  const linkInfo = useLinkInfo(SecurityPageName.entityAnalyticsPrivilegedUserMonitoring);
  const updateLinkConfig = useUpdateLinkConfig();

  // Update UrlParam to add hideTimeline to the URL when the onboarding is loaded and removes it when dashboard is loaded
  useEffect(() => {
    // do not change the link config when the engine status is being fetched
    if (state.type === 'fetchingEngineStatus') {
      return;
    }

    const hideTimeline = ['onboarding', 'initializingEngine'].includes(state.type);
    // update the hideTimeline property in the link config. This call triggers expensive operations, use with love
    const hideTimelineConfig = linkInfo?.hideTimeline ?? false;

    if (hideTimeline !== hideTimelineConfig) {
      updateLinkConfig(SecurityPageName.entityAnalyticsPrivilegedUserMonitoring, { hideTimeline });
    }
  }, [linkInfo?.hideTimeline, state.type, updateLinkConfig]);

  const fullHeightCSS = css`
    min-height: calc(100vh - 240px);
  `;

  if (newDataViewPickerEnabled && status === 'pristine') {
    return <PageLoader />;
  }

  if (!indicesExist) {
    return <EmptyPrompt />;
  }

  return (
    <>
      {state.type === 'dashboard' && (
        <FiltersGlobal>
          <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
        </FiltersGlobal>
      )}

      <SecuritySolutionPageWrapper>
        {state.type === 'fetchingEngineStatus' ||
          (isSourcererLoading && (
            <>
              <HeaderPage
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboards.pageTitle"
                    defaultMessage="Privileged user monitoring"
                  />
                }
              />
              <EuiFlexGroup alignItems="center" justifyContent="center" css={fullHeightCSS}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingLogo logo="logoSecurity" size="xl" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ))}

        {state.type === 'onboarding' && (
          <>
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
            <EuiFlexGroup css={fullHeightCSS}>
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
              badgeOptions={{
                beta: true,
                text: i18n.translate(
                  'xpack.securitySolution.privilegedUserMonitoring.dashboards.betaStatus',
                  {
                    defaultMessage: 'TECHNICAL PREVIEW',
                  }
                ),
              }}
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
                    defaultMessage="Manage data sources"
                  />
                </EuiButtonEmpty>,
              ]}
            />
            <PrivilegedUserMonitoring
              callout={state.onboardingCallout}
              error={state.error}
              onManageUserClicked={onManageUserClicked}
              sourcererDataView={sourcererDataView}
            />
          </>
        )}

        {state.type === 'manageDataSources' && (
          <PrivilegedUserMonitoringManageDataSources
            onBackToDashboardClicked={onBackToDashboardClicked}
          />
        )}

        <SpyRoute pageName={SecurityPageName.entityAnalyticsPrivilegedUserMonitoring} />
      </SecuritySolutionPageWrapper>
    </>
  );
};
