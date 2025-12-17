/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { EuiSpacer, EuiTabbedContent, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { UnsavedChangesConfirmModal } from './unsaved_changes_confirm_modal';
import { useLicense } from '../../../../../common/hooks/use_license';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { ProtectionUpdatesLayout } from '../protection_updates/protection_updates_layout';
import { PolicySettingsLayout } from '../policy_settings_layout';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import {
  getBlocklistsListPath,
  getEndpointExceptionsListPath,
  getEventFiltersListPath,
  getHostIsolationExceptionsListPath,
  getPolicyBlocklistsPath,
  getPolicyDetailPath,
  getPolicyDetailsArtifactsListPath,
  getPolicyEndpointExceptionsPath,
  getPolicyEventFiltersPath,
  getPolicyHostIsolationExceptionsPath,
  getPolicyProtectionUpdatesPath,
  getPolicyTrustedAppsPath,
  getPolicyTrustedDevicesPath,
  getTrustedAppsListPath,
  getTrustedDevicesListPath,
} from '../../../../common/routing';
import { useHttp, useToasts } from '../../../../../common/lib/kibana';
import { ManagementPageLoader } from '../../../../components/management_page_loader';
import {
  isOnBlocklistsView,
  isOnEndpointExceptionsView,
  isOnHostIsolationExceptionsView,
  isOnPolicyEventFiltersView,
  isOnPolicyFormView,
  isOnPolicyTrustedAppsView,
  isOnPolicyTrustedDevicesView,
  isOnProtectionUpdatesView,
  policyDetails,
  policyIdFromParams,
} from '../../store/policy_details/selectors';
import { PolicyArtifactsLayout } from '../artifacts/layout/policy_artifacts_layout';
import { usePolicyDetailsSelector } from '../policy_hooks';
import { POLICY_ARTIFACT_EVENT_FILTERS_LABELS } from './event_filters_translations';
import { POLICY_ARTIFACT_TRUSTED_APPS_LABELS } from './trusted_apps_translations';
import { POLICY_ARTIFACT_HOST_ISOLATION_EXCEPTIONS_LABELS } from './host_isolation_exceptions_translations';
import { POLICY_ARTIFACT_BLOCKLISTS_LABELS } from './blocklists_translations';
import { TrustedAppsApiClient } from '../../../trusted_apps/service/api_client';
import { EventFiltersApiClient } from '../../../event_filters/service/api_client';
import { BlocklistsApiClient } from '../../../blocklist/services/blocklists_api_client';
import { HostIsolationExceptionsApiClient } from '../../../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { SEARCHABLE_FIELDS as TRUSTED_APPS_SEARCHABLE_FIELDS } from '../../../trusted_apps/constants';
import { SEARCHABLE_FIELDS as EVENT_FILTERS_SEARCHABLE_FIELDS } from '../../../event_filters/constants';
import { SEARCHABLE_FIELDS as HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS } from '../../../host_isolation_exceptions/constants';
import { SEARCHABLE_FIELDS as BLOCKLISTS_SEARCHABLE_FIELDS } from '../../../blocklist/constants';
import { SEARCHABLE_FIELDS as TRUSTED_DEVICES_SEARCHABLE_FIELDS } from '../../../trusted_devices/constants';
import type { PolicyDetailsRouteState } from '../../../../../../common/endpoint/types';
import { useHostIsolationExceptionsAccess } from '../../../../hooks/artifacts/use_host_isolation_exceptions_access';
import { TrustedDevicesApiClient } from '../../../trusted_devices/service/api_client';
import { POLICY_ARTIFACT_TRUSTED_DEVICES_LABELS } from './trusted_devices_translations';
import { ENDPOINT_EXCEPTIONS_SEARCHABLE_FIELDS } from '../../../endpoint_exceptions/constants';
import { EndpointExceptionsApiClient } from '../../../endpoint_exceptions/service/api_client';
import { POLICY_ARTIFACT_ENDPOINT_EXCEPTIONS_LABELS } from './endpoint_exceptions_translations';
import { TrustedAppsCardDecorator } from '../../../trusted_apps/view/trusted_apps_list';
import { EventFiltersCardDecorator } from '../../../event_filters/view/event_filters_list';

enum PolicyTabKeys {
  SETTINGS = 'settings',
  TRUSTED_APPS = 'trustedApps',
  EVENT_FILTERS = 'eventFilters',
  HOST_ISOLATION_EXCEPTIONS = 'hostIsolationExceptions',
  BLOCKLISTS = 'blocklists',
  PROTECTION_UPDATES = 'protectionUpdates',
  TRUSTED_DEVICES = 'trustedDevices',
  ENDPOINT_EXCEPTIONS = 'endpointExceptions',
}

interface PolicyTab {
  id: PolicyTabKeys;
  name: string;
  content: React.ReactNode;
}

export const PolicyTabs = React.memo(() => {
  const history = useHistory();
  const http = useHttp();
  const toasts = useToasts();
  const theme = useEuiTheme();

  const isInSettingsTab = usePolicyDetailsSelector(isOnPolicyFormView);
  const isInTrustedAppsTab = usePolicyDetailsSelector(isOnPolicyTrustedAppsView);
  const isInTrustedDevicesTab = usePolicyDetailsSelector(isOnPolicyTrustedDevicesView);
  const isInEventFiltersTab = usePolicyDetailsSelector(isOnPolicyEventFiltersView);
  const isInHostIsolationExceptionsTab = usePolicyDetailsSelector(isOnHostIsolationExceptionsView);
  const isInBlocklistsTab = usePolicyDetailsSelector(isOnBlocklistsView);
  const isInEndpointExceptionsTab = usePolicyDetailsSelector(isOnEndpointExceptionsView);
  const isInProtectionUpdatesTab = usePolicyDetailsSelector(isOnProtectionUpdatesView);
  const policyId = usePolicyDetailsSelector(policyIdFromParams);

  const [unsavedChangesModal, setUnsavedChangesModal] = useState<{
    showModal: boolean;
    nextTab: EuiTabbedContentTab | null;
  }>({ showModal: false, nextTab: null });

  const [unsavedChanges, setUnsavedChanges] = useState<
    Record<PolicyTabKeys.SETTINGS | PolicyTabKeys.PROTECTION_UPDATES, boolean>
  >({
    [PolicyTabKeys.SETTINGS]: false,
    [PolicyTabKeys.PROTECTION_UPDATES]: false,
  });

  const setTabUnsavedChanges = useCallback(
    (tab: PolicyTabKeys.SETTINGS | PolicyTabKeys.PROTECTION_UPDATES) =>
      (hasUnsavedChanges: boolean) => {
        if (unsavedChanges[tab] !== hasUnsavedChanges) {
          setUnsavedChanges((prev) => ({ ...prev, [tab]: hasUnsavedChanges }));
        }
      },
    [unsavedChanges]
  );

  // By the time the tabs load, we know that we already have a `policyItem` since a conditional
  // check is done at the `PageDetails` component level. So asserting to non-null/undefined here.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const policyItem = usePolicyDetailsSelector(policyDetails)!;
  const {
    canReadTrustedApplications,
    canWriteTrustedApplications,
    canReadEventFilters,
    canWriteEventFilters,
    canAccessHostIsolationExceptions,
    canReadHostIsolationExceptions,
    canWriteHostIsolationExceptions,
    canReadBlocklist,
    canWriteBlocklist,
    canReadTrustedDevices,
    canWriteTrustedDevices,
    canReadEndpointExceptions,
    canWriteEndpointExceptions,
    loading: isPrivilegesLoading,
  } = useUserPrivileges().endpointPrivileges;
  const { state: routeState = {} } = useLocation<PolicyDetailsRouteState>();

  const isTrustedDevicesFeatureEnabled = useIsExperimentalFeatureEnabled('trustedDevices');
  const isEndpointExceptionsMovedUnderManagementFeatureEnabled = useIsExperimentalFeatureEnabled(
    'endpointExceptionsMovedUnderManagement'
  );

  const isEnterprise = useLicense().isEnterprise();
  const isTrustedDevicesEnabled =
    isEnterprise && isTrustedDevicesFeatureEnabled && canReadTrustedDevices;

  const getHostIsolationExceptionsApiClientInstance = useCallback(
    () => HostIsolationExceptionsApiClient.getInstance(http),
    [http]
  );

  const { hasAccessToHostIsolationExceptions, isHostIsolationExceptionsAccessLoading } =
    useHostIsolationExceptionsAccess(
      canAccessHostIsolationExceptions,
      canReadHostIsolationExceptions,
      getHostIsolationExceptionsApiClientInstance
    );

  // move the user out of this route if they can't access it
  useEffect(() => {
    if (isHostIsolationExceptionsAccessLoading || isPrivilegesLoading) {
      return;
    }

    const redirectHostIsolationException =
      isInHostIsolationExceptionsTab &&
      (!canReadHostIsolationExceptions ||
        (!isHostIsolationExceptionsAccessLoading && !hasAccessToHostIsolationExceptions));

    if (
      (isInTrustedAppsTab && !canReadTrustedApplications) ||
      (isInEventFiltersTab && !canReadEventFilters) ||
      redirectHostIsolationException ||
      (isInBlocklistsTab && !canReadBlocklist) ||
      (isInEndpointExceptionsTab && !canReadEndpointExceptions) ||
      (isInTrustedDevicesTab && !canReadTrustedDevices)
    ) {
      history.replace(getPolicyDetailPath(policyId));
      toasts.addDanger(
        i18n.translate('xpack.securitySolution.policyDetails.missingArtifactAccess', {
          defaultMessage:
            'You do not have the required Kibana permissions to use the given artifact.',
        })
      );
    }
  }, [
    canReadBlocklist,
    canReadEndpointExceptions,
    canReadEventFilters,
    canReadHostIsolationExceptions,
    canReadTrustedApplications,
    canReadTrustedDevices,
    hasAccessToHostIsolationExceptions,
    history,
    isHostIsolationExceptionsAccessLoading,
    isInBlocklistsTab,
    isInEndpointExceptionsTab,
    isInEventFiltersTab,
    isInHostIsolationExceptionsTab,
    isInProtectionUpdatesTab,
    isInTrustedAppsTab,
    isInTrustedDevicesTab,
    isPrivilegesLoading,
    policyId,
    toasts,
  ]);

  const getTrustedAppsApiClientInstance = useCallback(
    () => TrustedAppsApiClient.getInstance(http),
    [http]
  );

  const getTrustedDevicesApiClientInstance = useCallback(
    () => TrustedDevicesApiClient.getInstance(http),
    [http]
  );

  const getEventFiltersApiClientInstance = useCallback(
    () => EventFiltersApiClient.getInstance(http),
    [http]
  );

  const getBlocklistsApiClientInstance = useCallback(
    () => BlocklistsApiClient.getInstance(http),
    [http]
  );

  const getEndpointExceptionsApiClientInstance = useCallback(
    () => EndpointExceptionsApiClient.getInstance(http),
    [http]
  );

  const tabs: Record<PolicyTabKeys, PolicyTab | undefined> = useMemo(() => {
    const trustedAppsLabels = {
      ...POLICY_ARTIFACT_TRUSTED_APPS_LABELS,
      layoutAboutMessage: (count: number, link: React.ReactElement): React.ReactNode => (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.trustedApps.list.about"
          defaultMessage="There {count, plural, one {is} other {are}} {count} trusted {count, plural, =1 {application} other {applications}} associated with this policy. Click here to {link}"
          values={{ count, link }}
        />
      ),
    };

    const trustedDevicesLabels = {
      ...POLICY_ARTIFACT_TRUSTED_DEVICES_LABELS,
      layoutAboutMessage: (count: number, link: React.ReactElement): React.ReactNode => (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.trustedDevices.list.about"
          defaultMessage="There {count, plural, one {is} other {are}} {count} trusted {count, plural, =1 {device} other {devices}} associated with this policy. Click here to {link}"
          values={{ count, link }}
        />
      ),
    };

    const eventFiltersLabels = {
      ...POLICY_ARTIFACT_EVENT_FILTERS_LABELS,
      layoutAboutMessage: (count: number, link: React.ReactElement): React.ReactNode => (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.eventFilters.list.about"
          defaultMessage="There {count, plural, one {is} other {are}} {count} event {count, plural, =1 {filter} other {filters}} associated with this policy. Click here to {link}"
          values={{ count, link }}
        />
      ),
    };

    const hostIsolationExceptionsLabels = {
      ...POLICY_ARTIFACT_HOST_ISOLATION_EXCEPTIONS_LABELS,
      layoutAboutMessage: (count: number, link: React.ReactElement): React.ReactNode => (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.about"
          defaultMessage="There {count, plural, one {is} other {are}} {count} host isolation {count, plural, =1 {exception} other {exceptions}} associated with this policy. Click here to {link}"
          values={{ count, link }}
        />
      ),
    };

    const blocklistsLabels = {
      ...POLICY_ARTIFACT_BLOCKLISTS_LABELS,
      layoutAboutMessage: (count: number, link: React.ReactElement): React.ReactNode => (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.blocklist.list.about"
          defaultMessage="There {count, plural, one {is} other {are}} {count} {count, plural, =1 {blocklist} other {blocklist entries}} associated with this policy. Click here to {link}"
          values={{ count, link }}
        />
      ),
    };

    const endpointExceptionsLabels = {
      ...POLICY_ARTIFACT_ENDPOINT_EXCEPTIONS_LABELS,
      layoutAboutMessage: (count: number, link: React.ReactElement): React.ReactNode => (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.endpointExceptions.list.about"
          defaultMessage="There {count, plural, one {is} other {are}} {count} {count, plural, =1 {endpoint exception} other {endpoint exceptions}} associated with this policy. Click here to {link}"
          values={{ count, link }}
        />
      ),
    };

    return {
      [PolicyTabKeys.SETTINGS]: {
        id: PolicyTabKeys.SETTINGS,
        name: i18n.translate('xpack.securitySolution.endpoint.policy.details.tabs.policyForm', {
          defaultMessage: 'Policy settings',
        }),
        content: (
          <>
            <EuiSpacer />

            <PolicySettingsLayout
              policy={policyItem}
              setUnsavedChanges={setTabUnsavedChanges(PolicyTabKeys.SETTINGS)}
            />
          </>
        ),
        'data-test-subj': 'policySettingsTab',
      },
      [PolicyTabKeys.TRUSTED_APPS]: canReadTrustedApplications
        ? {
            id: PolicyTabKeys.TRUSTED_APPS,
            name: i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.tabs.trustedApps',
              {
                defaultMessage: 'Trusted applications',
              }
            ),
            content: (
              <>
                <EuiSpacer />
                <PolicyArtifactsLayout
                  policyItem={policyItem}
                  labels={trustedAppsLabels}
                  getExceptionsListApiClient={getTrustedAppsApiClientInstance}
                  searchableFields={TRUSTED_APPS_SEARCHABLE_FIELDS}
                  getArtifactPath={getTrustedAppsListPath}
                  getPolicyArtifactsPath={getPolicyDetailsArtifactsListPath}
                  canWriteArtifact={canWriteTrustedApplications}
                  CardDecorator={TrustedAppsCardDecorator}
                />
              </>
            ),
            'data-test-subj': 'policyTrustedAppsTab',
          }
        : undefined,
      [PolicyTabKeys.TRUSTED_DEVICES]: isTrustedDevicesEnabled
        ? {
            id: PolicyTabKeys.TRUSTED_DEVICES,
            name: i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.tabs.trustedDevices',
              {
                defaultMessage: 'Trusted devices',
              }
            ),
            content: (
              <>
                <EuiSpacer />
                <PolicyArtifactsLayout
                  policyItem={policyItem}
                  labels={trustedDevicesLabels}
                  getExceptionsListApiClient={getTrustedDevicesApiClientInstance}
                  searchableFields={TRUSTED_DEVICES_SEARCHABLE_FIELDS}
                  getArtifactPath={getTrustedDevicesListPath}
                  getPolicyArtifactsPath={getPolicyTrustedDevicesPath}
                  canWriteArtifact={canWriteTrustedDevices}
                />
              </>
            ),
            'data-test-subj': 'policyTrustedDevicesTab',
          }
        : undefined,
      [PolicyTabKeys.EVENT_FILTERS]: canReadEventFilters
        ? {
            id: PolicyTabKeys.EVENT_FILTERS,
            name: i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.tabs.eventFilters',
              {
                defaultMessage: 'Event filters',
              }
            ),
            content: (
              <>
                <EuiSpacer />
                <PolicyArtifactsLayout
                  policyItem={policyItem}
                  labels={eventFiltersLabels}
                  getExceptionsListApiClient={getEventFiltersApiClientInstance}
                  searchableFields={EVENT_FILTERS_SEARCHABLE_FIELDS}
                  getArtifactPath={getEventFiltersListPath}
                  getPolicyArtifactsPath={getPolicyEventFiltersPath}
                  canWriteArtifact={canWriteEventFilters}
                  CardDecorator={EventFiltersCardDecorator}
                />
              </>
            ),
            'data-test-subj': 'policyEventFiltersTab',
          }
        : undefined,
      [PolicyTabKeys.HOST_ISOLATION_EXCEPTIONS]: hasAccessToHostIsolationExceptions
        ? {
            id: PolicyTabKeys.HOST_ISOLATION_EXCEPTIONS,
            name: i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.tabs.isInHostIsolationExceptions',
              {
                defaultMessage: 'Host isolation exceptions',
              }
            ),
            content: (
              <>
                <EuiSpacer />
                <PolicyArtifactsLayout
                  policyItem={policyItem}
                  labels={hostIsolationExceptionsLabels}
                  getExceptionsListApiClient={getHostIsolationExceptionsApiClientInstance}
                  searchableFields={HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS}
                  getArtifactPath={getHostIsolationExceptionsListPath}
                  getPolicyArtifactsPath={getPolicyHostIsolationExceptionsPath}
                  canWriteArtifact={canWriteHostIsolationExceptions}
                />
              </>
            ),
            'data-test-subj': 'policyHostIsolationExceptionsTab',
          }
        : undefined,
      [PolicyTabKeys.BLOCKLISTS]: canReadBlocklist
        ? {
            id: PolicyTabKeys.BLOCKLISTS,
            name: i18n.translate('xpack.securitySolution.endpoint.policy.details.tabs.blocklists', {
              defaultMessage: 'Blocklist',
            }),
            content: (
              <>
                <EuiSpacer />
                <PolicyArtifactsLayout
                  policyItem={policyItem}
                  labels={blocklistsLabels}
                  getExceptionsListApiClient={getBlocklistsApiClientInstance}
                  searchableFields={BLOCKLISTS_SEARCHABLE_FIELDS}
                  getArtifactPath={getBlocklistsListPath}
                  getPolicyArtifactsPath={getPolicyBlocklistsPath}
                  canWriteArtifact={canWriteBlocklist}
                />
              </>
            ),
            'data-test-subj': 'policyBlocklistTab',
          }
        : undefined,
      [PolicyTabKeys.ENDPOINT_EXCEPTIONS]:
        isEndpointExceptionsMovedUnderManagementFeatureEnabled && canReadEndpointExceptions
          ? {
              id: PolicyTabKeys.ENDPOINT_EXCEPTIONS,
              name: i18n.translate(
                'xpack.securitySolution.endpoint.policy.details.tabs.endpointExceptions',
                {
                  defaultMessage: 'Endpoint exceptions',
                }
              ),
              content: (
                <>
                  <EuiSpacer />
                  <PolicyArtifactsLayout
                    policyItem={policyItem}
                    labels={endpointExceptionsLabels}
                    getExceptionsListApiClient={getEndpointExceptionsApiClientInstance}
                    searchableFields={ENDPOINT_EXCEPTIONS_SEARCHABLE_FIELDS}
                    getArtifactPath={getEndpointExceptionsListPath}
                    getPolicyArtifactsPath={getPolicyEndpointExceptionsPath}
                    canWriteArtifact={canWriteEndpointExceptions}
                  />
                </>
              ),
              'data-test-subj': 'policyEndpointExceptionsTab',
            }
          : undefined,

      [PolicyTabKeys.PROTECTION_UPDATES]: isEnterprise
        ? {
            id: PolicyTabKeys.PROTECTION_UPDATES,
            name: i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.tabs.protectionUpdates',
              {
                defaultMessage: 'Protection updates',
              }
            ),
            content: (
              <>
                <EuiSpacer />
                <ProtectionUpdatesLayout
                  policy={policyItem}
                  setUnsavedChanges={setTabUnsavedChanges(PolicyTabKeys.PROTECTION_UPDATES)}
                />
              </>
            ),
            'data-test-subj': 'policyProtectionUpdatesTab',
          }
        : undefined,
    };
  }, [
    policyItem,
    setTabUnsavedChanges,
    canReadTrustedApplications,
    getTrustedAppsApiClientInstance,
    canWriteTrustedApplications,
    isTrustedDevicesEnabled,
    getTrustedDevicesApiClientInstance,
    canWriteTrustedDevices,
    canReadEventFilters,
    getEventFiltersApiClientInstance,
    canWriteEventFilters,
    hasAccessToHostIsolationExceptions,
    getHostIsolationExceptionsApiClientInstance,
    canWriteHostIsolationExceptions,
    canReadBlocklist,
    getBlocklistsApiClientInstance,
    canWriteBlocklist,
    isEndpointExceptionsMovedUnderManagementFeatureEnabled,
    canReadEndpointExceptions,
    getEndpointExceptionsApiClientInstance,
    canWriteEndpointExceptions,
    isEnterprise,
  ]);

  // convert tabs object into an array EuiTabbedContent can understand
  const tabsList: PolicyTab[] = useMemo(
    () => Object.values(tabs).filter((tab): tab is PolicyTab => tab !== undefined),
    [tabs]
  );

  const currentSelectedTab = useMemo(() => {
    const defaultTab = tabs[PolicyTabKeys.SETTINGS];
    let selectedTab: PolicyTab | undefined;

    if (isInSettingsTab) {
      selectedTab = tabs[PolicyTabKeys.SETTINGS];
    } else if (isInTrustedAppsTab) {
      selectedTab = tabs[PolicyTabKeys.TRUSTED_APPS];
    } else if (isInTrustedDevicesTab) {
      selectedTab = tabs[PolicyTabKeys.TRUSTED_DEVICES];
    } else if (isInEventFiltersTab) {
      selectedTab = tabs[PolicyTabKeys.EVENT_FILTERS];
    } else if (isInHostIsolationExceptionsTab) {
      selectedTab = tabs[PolicyTabKeys.HOST_ISOLATION_EXCEPTIONS];
    } else if (isInBlocklistsTab) {
      selectedTab = tabs[PolicyTabKeys.BLOCKLISTS];
    } else if (isInEndpointExceptionsTab) {
      selectedTab = tabs[PolicyTabKeys.ENDPOINT_EXCEPTIONS];
    } else if (isInProtectionUpdatesTab) {
      selectedTab = tabs[PolicyTabKeys.PROTECTION_UPDATES];
    }

    return selectedTab || defaultTab;
  }, [
    tabs,
    isInSettingsTab,
    isInTrustedAppsTab,
    isInTrustedDevicesTab,
    isInEventFiltersTab,
    isInHostIsolationExceptionsTab,
    isInBlocklistsTab,
    isInEndpointExceptionsTab,
    isInProtectionUpdatesTab,
  ]);

  const cancelUnsavedChangesModal = useCallback(() => {
    setUnsavedChangesModal({ showModal: false, nextTab: null });
  }, [setUnsavedChangesModal]);

  const changeTab = useCallback(
    (selectedTab: EuiTabbedContentTab) => {
      if (unsavedChangesModal.showModal) {
        cancelUnsavedChangesModal();
      }
      let path: string = '';
      switch (selectedTab.id) {
        case PolicyTabKeys.SETTINGS:
          path = getPolicyDetailPath(policyId);
          break;
        case PolicyTabKeys.TRUSTED_APPS:
          path = getPolicyTrustedAppsPath(policyId);
          break;
        case PolicyTabKeys.TRUSTED_DEVICES:
          path = getPolicyTrustedDevicesPath(policyId);
          break;
        case PolicyTabKeys.EVENT_FILTERS:
          path = getPolicyEventFiltersPath(policyId);
          break;
        case PolicyTabKeys.HOST_ISOLATION_EXCEPTIONS:
          path = getPolicyHostIsolationExceptionsPath(policyId);
          break;
        case PolicyTabKeys.BLOCKLISTS:
          path = getPolicyBlocklistsPath(policyId);
          break;
        case PolicyTabKeys.ENDPOINT_EXCEPTIONS:
          path = getPolicyEndpointExceptionsPath(policyId);
          break;
        case PolicyTabKeys.PROTECTION_UPDATES:
          path = getPolicyProtectionUpdatesPath(policyId);
          break;
      }
      history.push(path, routeState?.backLink ? { backLink: routeState.backLink } : null);
    },
    [
      cancelUnsavedChangesModal,
      history,
      policyId,
      routeState?.backLink,
      unsavedChangesModal.showModal,
    ]
  );

  const onTabClickHandler = useCallback(
    (selectedTab: EuiTabbedContentTab) => {
      if (
        (isInSettingsTab && unsavedChanges[PolicyTabKeys.SETTINGS]) ||
        (isInProtectionUpdatesTab && unsavedChanges[PolicyTabKeys.PROTECTION_UPDATES])
      ) {
        setUnsavedChangesModal({ showModal: true, nextTab: selectedTab });
      } else {
        changeTab(selectedTab);
      }
    },
    [changeTab, isInProtectionUpdatesTab, isInSettingsTab, unsavedChanges]
  );

  const confirmUnsavedChangesModal = useCallback(() => {
    if (unsavedChangesModal.nextTab) {
      changeTab(unsavedChangesModal.nextTab);
    }
  }, [changeTab, unsavedChangesModal.nextTab]);

  // show loader for privileges validation
  if (isPrivilegesLoading || isHostIsolationExceptionsAccessLoading) {
    return <ManagementPageLoader data-test-subj="privilegesLoading" />;
  }

  return (
    <>
      {unsavedChangesModal.showModal && (
        <UnsavedChangesConfirmModal
          onCancel={cancelUnsavedChangesModal}
          onConfirm={confirmUnsavedChangesModal}
        />
      )}
      <EuiTabbedContent
        data-test-subj="policyTabs"
        tabs={tabsList}
        selectedTab={currentSelectedTab}
        size="l"
        onTabClick={onTabClickHandler}
        css={css`
          & [role='tablist'] {
            flex-wrap: wrap;
            row-gap: ${theme.euiTheme.size.xs};
            column-gap: ${theme.euiTheme.size.l};
          }
        `}
      />
    </>
  );
});

PolicyTabs.displayName = 'PolicyTabs';
