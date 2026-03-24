/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { memo, useMemo } from 'react';
import { EuiSpacer, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { PackageCustomExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { NoPrivileges } from '../../../../../../common/components/no_privileges';
import { useCanAccessSomeArtifacts } from '../hooks/use_can_access_some_artifacts';
import { useHttp } from '../../../../../../common/lib/kibana';
import { TrustedAppsApiClient } from '../../../../trusted_apps/service/api_client';
import { EventFiltersApiClient } from '../../../../event_filters/service/api_client';
import { HostIsolationExceptionsApiClient } from '../../../../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { BlocklistsApiClient } from '../../../../blocklist/services';
import { EndpointExceptionsApiClient } from '../../../../endpoint_exceptions/service/api_client';
import { TrustedDevicesApiClient } from '../../../../trusted_devices/service/api_client';
import { FleetArtifactsCard } from './components/fleet_artifacts_card';
import {
  getBlocklistsListPath,
  getEventFiltersListPath,
  getHostIsolationExceptionsListPath,
  getTrustedAppsListPath,
  getTrustedDevicesListPath,
  getEndpointExceptionsListPath,
} from '../../../../../common/routing';
import {
  BLOCKLISTS_LABELS,
  EVENT_FILTERS_LABELS,
  HOST_ISOLATION_EXCEPTIONS_LABELS,
  TRUSTED_APPS_LABELS,
  TRUSTED_DEVICES_LABELS,
  ENDPOINT_EXCEPTIONS_LABELS,
} from './translations';
import { useLicense } from '../../../../../../common/hooks/use_license';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';

const TrustedAppsArtifactCard = memo<PackageCustomExtensionComponentProps>((props) => {
  const http = useHttp();
  const trustedAppsApiClientInstance = useMemo(
    () => TrustedAppsApiClient.getInstance(http),
    [http]
  );

  return (
    <FleetArtifactsCard
      {...props}
      artifactApiClientInstance={trustedAppsApiClientInstance}
      getArtifactsPath={getTrustedAppsListPath}
      labels={TRUSTED_APPS_LABELS}
      data-test-subj="trustedApps"
    />
  );
});
TrustedAppsArtifactCard.displayName = 'TrustedAppsArtifactCard';

const TrustedDevicesArtifactCard = memo<PackageCustomExtensionComponentProps>((props) => {
  const http = useHttp();
  const trustedDevicesApiClientInstance = useMemo(
    () => TrustedDevicesApiClient.getInstance(http),
    [http]
  );

  return (
    <FleetArtifactsCard
      {...props}
      artifactApiClientInstance={trustedDevicesApiClientInstance}
      getArtifactsPath={getTrustedDevicesListPath}
      labels={TRUSTED_DEVICES_LABELS}
      data-test-subj="trustedDevices"
    />
  );
});
TrustedDevicesArtifactCard.displayName = 'TrustedDevicesArtifactCard';

const EventFiltersArtifactCard = memo<PackageCustomExtensionComponentProps>((props) => {
  const http = useHttp();
  const eventFiltersApiClientInstance = useMemo(
    () => EventFiltersApiClient.getInstance(http),
    [http]
  );

  return (
    <FleetArtifactsCard
      {...props}
      artifactApiClientInstance={eventFiltersApiClientInstance}
      getArtifactsPath={getEventFiltersListPath}
      labels={EVENT_FILTERS_LABELS}
      data-test-subj="eventFilters"
    />
  );
});

EventFiltersArtifactCard.displayName = 'EventFiltersArtifactCard';

const HostIsolationExceptionsArtifactCard = memo<PackageCustomExtensionComponentProps>((props) => {
  const http = useHttp();
  const hostIsolationExceptionsApiClientInstance = useMemo(
    () => HostIsolationExceptionsApiClient.getInstance(http),
    [http]
  );

  return (
    <FleetArtifactsCard
      {...props}
      artifactApiClientInstance={hostIsolationExceptionsApiClientInstance}
      getArtifactsPath={getHostIsolationExceptionsListPath}
      labels={HOST_ISOLATION_EXCEPTIONS_LABELS}
      data-test-subj="hostIsolationExceptions"
    />
  );
});
HostIsolationExceptionsArtifactCard.displayName = 'HostIsolationExceptionsArtifactCard';

const EndpointExceptionsArtifactCard = memo<PackageCustomExtensionComponentProps>((props) => {
  const http = useHttp();
  const endpointExceptionsApiClientInstance = useMemo(
    () => EndpointExceptionsApiClient.getInstance(http),
    [http]
  );

  return (
    <FleetArtifactsCard
      {...props}
      artifactApiClientInstance={endpointExceptionsApiClientInstance}
      getArtifactsPath={getEndpointExceptionsListPath}
      labels={ENDPOINT_EXCEPTIONS_LABELS}
      data-test-subj="endpointExceptions"
    />
  );
});
EndpointExceptionsArtifactCard.displayName = 'EndpointExceptionsArtifactCard';

const BlockListArtifactCard = memo<PackageCustomExtensionComponentProps>((props) => {
  const http = useHttp();
  const blocklistsApiClientInstance = useMemo(() => BlocklistsApiClient.getInstance(http), [http]);

  return (
    <FleetArtifactsCard
      {...props}
      artifactApiClientInstance={blocklistsApiClientInstance}
      getArtifactsPath={getBlocklistsListPath}
      labels={BLOCKLISTS_LABELS}
      data-test-subj="blocklists"
    />
  );
});
BlockListArtifactCard.displayName = 'BlockListArtifactCard';

/**
 * The UI displayed in Fleet's Endpoint integration page, under the `Advanced` tab
 */
export const EndpointPackageCustomExtension = memo<PackageCustomExtensionComponentProps>(
  (props) => {
    const {
      loading,
      canReadBlocklist,
      canReadEventFilters,
      canReadTrustedApplications,
      canReadHostIsolationExceptions,
      canReadTrustedDevices,
      canReadEndpointExceptions,
    } = useUserPrivileges().endpointPrivileges;

    const userCanAccessContent = useCanAccessSomeArtifacts();
    const isEnterprise = useLicense().isEnterprise();
    const trustedDevicesVisible =
      useIsExperimentalFeatureEnabled('trustedDevices') && canReadTrustedDevices && isEnterprise;
    const endpointExceptionsVisible =
      useIsExperimentalFeatureEnabled('endpointExceptionsMovedUnderManagement') &&
      canReadEndpointExceptions;

    const artifactCards: ReactElement = useMemo(() => {
      if (loading) {
        return <></>;
      }

      if (!userCanAccessContent) {
        return <NoPrivileges docLinkSelector={(links) => links.securitySolution.privileges} />;
      }

      return (
        <div data-test-subj="fleetEndpointPackageCustomContent">
          {canReadTrustedApplications && (
            <>
              <TrustedAppsArtifactCard {...props} />
              <EuiSpacer />
            </>
          )}

          {trustedDevicesVisible && (
            <>
              <TrustedDevicesArtifactCard {...props} />
              <EuiSpacer />
            </>
          )}

          {canReadEventFilters && (
            <>
              <EventFiltersArtifactCard {...props} />
              <EuiSpacer />
            </>
          )}

          {endpointExceptionsVisible && (
            <>
              <EndpointExceptionsArtifactCard {...props} />
              <EuiSpacer />
            </>
          )}

          {canReadHostIsolationExceptions && (
            <>
              <HostIsolationExceptionsArtifactCard {...props} />
              <EuiSpacer />
            </>
          )}

          {canReadBlocklist && <BlockListArtifactCard {...props} />}
        </div>
      );
    }, [
      loading,
      userCanAccessContent,
      canReadTrustedApplications,
      props,
      trustedDevicesVisible,
      canReadEventFilters,
      endpointExceptionsVisible,
      canReadHostIsolationExceptions,
      canReadBlocklist,
    ]);

    if (loading) {
      return (
        <EuiFlexGroup alignItems="center" justifyContent={'spaceAround'}>
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xl" />
            <EuiLoadingSpinner size="l" data-test-subj="endpointExtensionLoadingSpinner" />
            <EuiSpacer size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return artifactCards;
  }
);

EndpointPackageCustomExtension.displayName = 'EndpointPackageCustomExtension';
