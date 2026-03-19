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
  MANAGEMENT_ROUTING_SCRIPTS_LIBRARY_PATH,
  MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
  MANAGEMENT_ROUTING_TRUSTED_DEVICES_PATH,
} from '../common/constants';
import { NotFoundPage } from '../../app/404';
import { EndpointsContainer } from './endpoint_hosts';
import { PolicyContainer } from './policy';
import { TrustedAppsContainer } from './trusted_apps';
import { MANAGEMENT_PATH, SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { EventFiltersContainer } from './event_filters';
import { getEndpointListPath } from '../common/routing';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { HostIsolationExceptionsContainer } from './host_isolation_exceptions';
import { BlocklistContainer } from './blocklist';
import { ResponseActionsContainer } from './response_actions';
import { PrivilegedRoute } from '../components/privileged_route';
import { SecurityRoutePageWrapper } from '../../common/components/security_route_page_wrapper';
import { TrustedDevicesContainer } from './trusted_devices';
import { EndpointExceptionsContainer } from './endpoint_exceptions';
import { ScriptsLibraryContainer } from './scripts_library';

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

const EndpointExceptionsTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.endpointExceptions}>
    <EndpointExceptionsContainer />
    <SpyRoute pageName={SecurityPageName.endpointExceptions} />
  </TrackApplicationView>
);

const TrustedAppTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.trustedApps}>
    <TrustedAppsContainer />
    <SpyRoute pageName={SecurityPageName.trustedApps} />
  </TrackApplicationView>
);

const TrustedDevicesTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.trustedDevices}>
    <TrustedDevicesContainer />
    <SpyRoute pageName={SecurityPageName.trustedDevices} />
  </TrackApplicationView>
);

const EventFilterTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.eventFilters}>
    <EventFiltersContainer />
    <SpyRoute pageName={SecurityPageName.eventFilters} />
  </TrackApplicationView>
);

const HostIsolationExceptionsTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.hostIsolationExceptions}>
    <HostIsolationExceptionsContainer />
    <SpyRoute pageName={SecurityPageName.hostIsolationExceptions} />
  </TrackApplicationView>
);

const ResponseActionsTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.responseActionsHistory}>
    <ResponseActionsContainer />
    <SpyRoute pageName={SecurityPageName.responseActionsHistory} />
  </TrackApplicationView>
);

const ScriptsLibraryTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.scriptsLibrary}>
    <ScriptsLibraryContainer />
    <SpyRoute pageName={SecurityPageName.scriptsLibrary} />
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
          component={EndpointExceptionsTelemetry}
          hasPrivilege={canReadEndpointExceptions}
        />
      )}
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_TRUSTED_APPS_PATH}
        component={TrustedAppTelemetry}
        hasPrivilege={canReadTrustedApplications}
      />
      {trustedDevicesEnabled && (
        <PrivilegedRoute
          path={MANAGEMENT_ROUTING_TRUSTED_DEVICES_PATH}
          component={TrustedDevicesTelemetry}
          hasPrivilege={canReadTrustedDevices}
        />
      )}
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_EVENT_FILTERS_PATH}
        component={EventFilterTelemetry}
        hasPrivilege={canReadEventFilters}
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH}
        component={HostIsolationExceptionsTelemetry}
        hasPrivilege={canReadHostIsolationExceptions}
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_BLOCKLIST_PATH}
        component={BlocklistContainer}
        hasPrivilege={canReadBlocklist}
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH}
        component={ResponseActionsTelemetry}
        hasPrivilege={canReadActionsLogManagement}
      />

      {showScriptsLibrary && (
        <PrivilegedRoute
          path={MANAGEMENT_ROUTING_SCRIPTS_LIBRARY_PATH}
          component={ScriptsLibraryTelemetry}
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
