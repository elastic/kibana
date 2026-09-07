/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Redirect } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { NotesContainer } from './notes';
import { ManagementEmptyStateWrapper } from '../components/management_empty_state_wrapper';
import {
  MANAGEMENT_ROUTING_BLOCKLIST_PATH,
  MANAGEMENT_ROUTING_ENDPOINT_EXCEPTIONS_PATH,
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_EVENT_FILTERS_PATH,
  MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH,
  MANAGEMENT_ROUTING_NOTES_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH,
  MANAGEMENT_ROUTING_SCRIPT_LIBRARY_PATH,
  MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
  MANAGEMENT_ROUTING_TRUSTED_DEVICES_PATH,
} from '../common/constants';
import { NotFoundPage } from '../../app/404';
import { EndpointsContainer } from './endpoint_hosts';
import { PolicyContainer } from './policy';
import { MANAGEMENT_PATH, SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { getEndpointListPath } from '../common/routing';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { ResponseActionsContainer } from './response_actions';
import { PrivilegedRoute } from '../components/privileged_route';
import { SecurityRoutePageWrapper } from '../../common/components/security_route_page_wrapper';
import { ArtifactsPage } from './artifacts';
import { ScriptLibraryContainer } from './script_library';

const EndpointTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.endpoints}>
    <EndpointsContainer />
    <SpyRoute pageName={SecurityPageName.endpoints} />
  </TrackApplicationView>
);

const PolicyTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.policies}>
    <PolicyContainer />
    <SpyRoute pageName={SecurityPageName.policies} />
  </TrackApplicationView>
);

const ResponseActionsTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.responseActionsHistory}>
    <ResponseActionsContainer />
    <SpyRoute pageName={SecurityPageName.responseActionsHistory} />
  </TrackApplicationView>
);

const ScriptLibraryTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.scriptLibrary}>
    <ScriptLibraryContainer />
    <SpyRoute pageName={SecurityPageName.scriptLibrary} />
  </TrackApplicationView>
);

const Notes = () => (
  <SecurityRoutePageWrapper pageName={SecurityPageName.notes}>
    <NotesContainer />
  </SecurityRoutePageWrapper>
);

export const ManagementContainer = memo(() => {
  const trustedDevicesEnabled = useIsExperimentalFeatureEnabled('trustedDevices');
  const endpointExceptionsMovedUnderManagement = useIsExperimentalFeatureEnabled(
    'endpointExceptionsMovedUnderManagement'
  );
  const showScriptsLibrary = useIsExperimentalFeatureEnabled(
    'responseActionsScriptLibraryManagement'
  );

  const {
    loading,
    canReadPolicyManagement,
    canReadBlocklist,
    canReadTrustedApplications,
    canReadTrustedDevices,
    canReadEventFilters,
    canReadActionsLogManagement,
    canReadEndpointList,
    canReadHostIsolationExceptions,
    canReadEndpointExceptions,
    canReadScriptsLibrary,
  } = useUserPrivileges().endpointPrivileges;

  // Lets wait until we can verify permissions
  if (loading) {
    return (
      <ManagementEmptyStateWrapper>
        <EuiEmptyPrompt
          icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
          title={
            <h2>
              {i18n.translate(
                'xpack.securitySolution.endpoint.managementContainer.loadingEndpointManagement',
                {
                  defaultMessage: 'Loading Endpoint Management',
                }
              )}
            </h2>
          }
        />
      </ManagementEmptyStateWrapper>
    );
  }

  return (
    <Routes>
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_ENDPOINTS_PATH}
        component={EndpointTelemetry}
        hasPrivilege={canReadEndpointList}
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_POLICIES_PATH}
        component={PolicyTelemetry}
        hasPrivilege={canReadPolicyManagement}
      />
      {endpointExceptionsMovedUnderManagement && (
        <PrivilegedRoute
          path={MANAGEMENT_ROUTING_ENDPOINT_EXCEPTIONS_PATH}
          component={ArtifactsPage}
          hasPrivilege={canReadEndpointExceptions}
          exact
        />
      )}
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_TRUSTED_APPS_PATH}
        component={ArtifactsPage}
        hasPrivilege={canReadTrustedApplications}
        exact
      />
      {trustedDevicesEnabled && (
        <PrivilegedRoute
          path={MANAGEMENT_ROUTING_TRUSTED_DEVICES_PATH}
          component={ArtifactsPage}
          hasPrivilege={canReadTrustedDevices}
          exact
        />
      )}
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_EVENT_FILTERS_PATH}
        component={ArtifactsPage}
        hasPrivilege={canReadEventFilters}
        exact
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH}
        component={ArtifactsPage}
        hasPrivilege={canReadHostIsolationExceptions}
        exact
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_BLOCKLIST_PATH}
        component={ArtifactsPage}
        hasPrivilege={canReadBlocklist}
        exact
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH}
        component={ResponseActionsTelemetry}
        hasPrivilege={canReadActionsLogManagement}
      />

      {showScriptsLibrary && (
        <PrivilegedRoute
          path={MANAGEMENT_ROUTING_SCRIPT_LIBRARY_PATH}
          component={ScriptLibraryTelemetry}
          hasPrivilege={canReadScriptsLibrary}
        />
      )}

      <Route path={MANAGEMENT_ROUTING_NOTES_PATH} component={Notes} />

      {canReadEndpointList && (
        <Route path={MANAGEMENT_PATH} exact>
          <Redirect to={getEndpointListPath({ name: 'endpointList' })} />
        </Route>
      )}
      <Route path="*" component={NotFoundPage} />
    </Routes>
  );
});

ManagementContainer.displayName = 'ManagementContainer';
