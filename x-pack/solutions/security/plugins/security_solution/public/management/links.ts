/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { SECURITY_UI_SHOW_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { checkArtifactHasData } from './services/exceptions_list/check_artifact_has_data';
import {
  calculateEndpointAuthz,
  getEndpointAuthzInitialState,
} from '../../common/endpoint/service/authz';
import {
  ENDPOINT_EXCEPTIONS_PATH,
  ENDPOINTS_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
  MANAGE_PATH,
  POLICIES_PATH,
  RESPONSE_ACTIONS_HISTORY_PATH,
  SCRIPT_LIBRARY_PATH,
  SECURITY_FEATURE_ID,
  SecurityPageName,
} from '../../common/constants';
import {
  ARTIFACTS,
  ENDPOINTS,
  ENTITY_ANALYTICS,
  MANAGE,
  POLICIES,
  RESPONSE_ACTIONS_HISTORY,
  SCRIPT_LIBRARY,
} from '../app/translations';
import { licenseService } from '../common/hooks/use_license';
import type { ExperimentalFeatures } from '../../common/experimental_features';
import type { LinkItem } from '../common/links/types';
import type { StartPlugins } from '../types';
import { links as notesLink } from '../notes/links';
import {
  getBlocklistsListPath,
  getEndpointExceptionsListPath,
  getEventFiltersListPath,
  getHostIsolationExceptionsListPath,
  getTrustedAppsListPath,
  getTrustedDevicesListPath,
} from './common/routing';
import { IconResponseActionHistory } from '../common/icons/response_action_history';
import { IconEndpoints } from '../common/icons/endpoints';
import { IconPolicies } from '../common/icons/policies';
import { IconArtifacts } from '../common/icons/artifacts';
import { IconEntityAnalytics } from '../common/icons/entity_analytics';
import { IconScriptLibrary } from '../common/icons/script_library';
import { HostIsolationExceptionsApiClient } from './pages/host_isolation_exceptions/host_isolation_exceptions_api_client';
import { KibanaServices } from '../common/lib/kibana';

const categories = [
  {
    label: i18n.translate('xpack.securitySolution.appLinks.category.entityAnalytics', {
      defaultMessage: 'Entity analytics',
    }),
    linkIds: [SecurityPageName.entityAnalyticsManagement],
  },
  {
    label: i18n.translate('xpack.securitySolution.appLinks.category.endpoints', {
      defaultMessage: 'Endpoints',
    }),
    linkIds: [
      SecurityPageName.endpoints,
      SecurityPageName.policies,
      SecurityPageName.artifacts,
      SecurityPageName.responseActionsHistory,
      SecurityPageName.scriptLibrary,
    ],
  },
  {
    label: i18n.translate('xpack.securitySolution.appLinks.category.cloudSecurity', {
      defaultMessage: 'Cloud Security',
    }),
    linkIds: [SecurityPageName.cloudDefendPolicies],
  },
  {
    label: i18n.translate('xpack.securitySolution.appLinks.category.investigations', {
      defaultMessage: 'Investigations',
    }),
    linkIds: [SecurityPageName.notes],
  },
];

export const links: LinkItem = {
  id: SecurityPageName.administration,
  title: MANAGE,
  path: MANAGE_PATH,
  skipUrlState: true,
  hideTimeline: true,
  globalNavPosition: 13,
  capabilities: [SECURITY_UI_SHOW_PRIVILEGE],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.manage', {
      defaultMessage: 'Manage',
    }),
  ],
  categories,
  links: [
    {
      id: SecurityPageName.endpoints,
      description: i18n.translate('xpack.securitySolution.appLinks.endpointsDescription', {
        defaultMessage: 'Hosts running Elastic Defend.',
      }),
      landingIcon: IconEndpoints,
      title: ENDPOINTS,
      path: ENDPOINTS_PATH,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.policies,
      title: POLICIES,
      description: i18n.translate('xpack.securitySolution.appLinks.policiesDescription', {
        defaultMessage:
          'Use policies to customize endpoint and cloud workload protections and other configurations.',
      }),
      landingIcon: IconPolicies,
      path: POLICIES_PATH,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.artifacts,
      title: ARTIFACTS,
      description: i18n.translate('xpack.securitySolution.appLinks.artifactsDescription', {
        defaultMessage:
          'Manage exceptions, trusted applications, and other settings that control how endpoints are protected and respond to activity.',
      }),
      landingIcon: IconArtifacts,
      path: ENDPOINT_EXCEPTIONS_PATH,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.entityAnalyticsManagement,
      title: ENTITY_ANALYTICS,
      description: i18n.translate(
        'xpack.securitySolution.appLinks.entityAnalyticsManagementDescription',
        {
          defaultMessage:
            'Manage entity risk scores, entity store, and asset criticality settings.',
        }
      ),
      landingIcon: IconEntityAnalytics,
      path: ENTITY_ANALYTICS_MANAGEMENT_PATH,
      skipUrlState: true,
      hideTimeline: true,
      capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
      licenseType: 'platinum',
    },
    {
      id: SecurityPageName.responseActionsHistory,
      title: RESPONSE_ACTIONS_HISTORY,
      description: i18n.translate('xpack.securitySolution.appLinks.actionHistoryDescription', {
        defaultMessage: 'View the history of response actions performed on hosts.',
      }),
      landingIcon: IconResponseActionHistory,
      path: RESPONSE_ACTIONS_HISTORY_PATH,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.scriptLibrary,
      title: SCRIPT_LIBRARY,
      description: i18n.translate('xpack.securitySolution.appLinks.scriptLibraryDescription', {
        defaultMessage:
          'Upload and manage scripts to use with the runscript response action on endpoints protected by Elastic Defend.',
      }),
      landingIcon: IconScriptLibrary,
      path: SCRIPT_LIBRARY_PATH,
      skipUrlState: true,
      hideTimeline: true,
      experimentalKey: 'responseActionsScriptLibraryManagement',
      licenseType: 'enterprise',
    },
    notesLink,
  ],
};

const excludeLinks = (linkIds: SecurityPageName[]) => ({
  ...links,
  links: links.links?.filter((link) => !linkIds.includes(link.id)),
});

/** Artifact read flags used to compute first allowed artifact path. */
export interface ArtifactAuthz {
  canReadEndpointExceptions: boolean;
  canReadTrustedApplications: boolean;
  canReadTrustedDevices: boolean;
  canReadEventFilters: boolean;
  showHostIsolationExceptions: boolean;
  canReadBlocklist: boolean;
}

/**
 * Returns the path for the first artifact tab the user is allowed to access.
 * Order matches the Artifacts page tab order so the link always points at an allowed route.
 */
export const getFirstAllowedArtifactPath = (
  artifactAuthz: ArtifactAuthz,
  experimentalFeatures: ExperimentalFeatures
): string => {
  const { endpointExceptionsMovedUnderManagement, trustedDevices: trustedDevicesEnabled } =
    experimentalFeatures;
  const {
    canReadEndpointExceptions,
    canReadTrustedApplications,
    canReadTrustedDevices,
    canReadEventFilters,
    showHostIsolationExceptions,
    canReadBlocklist,
  } = artifactAuthz;

  if (endpointExceptionsMovedUnderManagement && canReadEndpointExceptions) {
    return getEndpointExceptionsListPath();
  }
  if (canReadTrustedApplications) {
    return getTrustedAppsListPath();
  }
  if (trustedDevicesEnabled && canReadTrustedDevices) {
    return getTrustedDevicesListPath();
  }
  if (canReadEventFilters) {
    return getEventFiltersListPath();
  }
  if (showHostIsolationExceptions) {
    return getHostIsolationExceptionsListPath();
  }
  if (canReadBlocklist) {
    return getBlocklistsListPath();
  }
  return getTrustedAppsListPath();
};

export const getManagementFilteredLinks = async (
  core: CoreStart,
  plugins: StartPlugins,
  experimentalFeatures: ExperimentalFeatures
): Promise<LinkItem> => {
  const { endpointExceptionsMovedUnderManagement, trustedDevices: trustedDevicesEnabled } =
    experimentalFeatures;

  const fleetAuthz = plugins.fleet?.authz;
  const currentUser = await plugins.security.authc.getCurrentUser();
  const isServerless = KibanaServices.getBuildFlavor() === 'serverless';

  const {
    canReadActionsLogManagement,
    canAccessHostIsolationExceptions,
    canReadHostIsolationExceptions,
    canReadEndpointList,
    canReadEndpointExceptions,
    canReadTrustedApplications,
    canReadTrustedDevices,
    canReadEventFilters,
    canReadBlocklist,
    canReadPolicyManagement,
    canReadScriptsLibrary,
  } =
    fleetAuthz && currentUser
      ? calculateEndpointAuthz(licenseService, fleetAuthz, currentUser.roles, isServerless)
      : getEndpointAuthzInitialState();

  const showHostIsolationExceptions =
    canAccessHostIsolationExceptions || // access host isolation exceptions is a paid feature, always show the link.
    // read host isolation exceptions is not a paid feature, to allow deleting exceptions after a downgrade scenario.
    // however, in this situation we allow to access only when there is data, otherwise the link won't be accessible.
    (canReadHostIsolationExceptions &&
      (await checkArtifactHasData(HostIsolationExceptionsApiClient.getInstance(core.http))));

  const linksToExclude: SecurityPageName[] = [];

  if (!canReadEndpointList) {
    linksToExclude.push(SecurityPageName.endpoints);
  }

  if (!canReadPolicyManagement) {
    linksToExclude.push(SecurityPageName.policies);
    linksToExclude.push(SecurityPageName.cloudDefendPolicies);
  }

  const canReadAnyArtifact =
    (endpointExceptionsMovedUnderManagement && canReadEndpointExceptions) ||
    canReadTrustedApplications ||
    (trustedDevicesEnabled && canReadTrustedDevices) ||
    canReadEventFilters ||
    showHostIsolationExceptions ||
    canReadBlocklist;
  if (!canReadAnyArtifact) {
    linksToExclude.push(SecurityPageName.artifacts);
  }

  if (!canReadActionsLogManagement) {
    linksToExclude.push(SecurityPageName.responseActionsHistory);
  }

  if (!canReadScriptsLibrary) {
    linksToExclude.push(SecurityPageName.scriptLibrary);
  }

  const filtered = excludeLinks(linksToExclude);

  const artifactsPath = canReadAnyArtifact
    ? getFirstAllowedArtifactPath(
        {
          canReadEndpointExceptions,
          canReadTrustedApplications,
          canReadTrustedDevices,
          canReadEventFilters,
          showHostIsolationExceptions,
          canReadBlocklist,
        },
        experimentalFeatures
      )
    : undefined;

  const linksWithArtifactsPath =
    filtered.links?.map((link) =>
      link.id === SecurityPageName.artifacts && artifactsPath != null
        ? { ...link, path: artifactsPath }
        : link
    ) ?? [];

  return {
    ...filtered,
    links: linksWithArtifactsPath,
  };
};
