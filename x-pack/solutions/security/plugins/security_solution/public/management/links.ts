/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { SECURITY_UI_SHOW_PRIVILEGE } from '@kbn/security-solution-features/constants';
import {
  calculateEndpointAuthz,
  getEndpointAuthzInitialState,
} from '../../common/endpoint/service/authz';
import {
  ENDPOINTS_PATH,
  ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
  MANAGE_PATH,
  POLICIES_PATH,
  RESPONSE_ACTIONS_HISTORY_PATH,
  SCRIPT_LIBRARY_PATH,
  SECURITY_FEATURE_ID,
  SecurityPageName,
  TRUSTED_APPS_PATH,
} from '../../common/constants';
import {
  ARTIFACTS,
  ENDPOINTS,
  ENTITY_ANALYTICS_RISK_SCORE,
  ENTITY_STORE,
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
import { IconAssetCriticality } from '../common/icons/asset_criticality';
import { IconScriptLibrary } from '../common/icons/script_library';

const categories = [
  {
    label: i18n.translate('xpack.securitySolution.appLinks.category.entityAnalytics', {
      defaultMessage: 'Entity analytics',
    }),
    linkIds: [
      SecurityPageName.entityAnalyticsManagement,
      SecurityPageName.entityAnalyticsEntityStoreManagement,
    ],
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
  globalNavPosition: 12,
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
          'Manage the rules, exceptions, and trust settings that control how endpoints are protected and respond to activity.',
      }),
      landingIcon: IconArtifacts,
      path: TRUSTED_APPS_PATH,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.entityAnalyticsManagement,
      title: ENTITY_ANALYTICS_RISK_SCORE,
      description: i18n.translate('xpack.securitySolution.appLinks.entityRiskScoringDescription', {
        defaultMessage: "Monitor entities' risk scores, and track anomalies.",
      }),
      landingIcon: IconEntityAnalytics,
      path: ENTITY_ANALYTICS_MANAGEMENT_PATH,
      skipUrlState: true,
      hideTimeline: true,
      capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
      licenseType: 'platinum',
    },
    {
      id: SecurityPageName.entityAnalyticsEntityStoreManagement,
      title: ENTITY_STORE,
      description: i18n.translate('xpack.securitySolution.appLinks.entityStoreDescription', {
        defaultMessage: 'Store data for entities observed in events.',
      }),
      landingIcon: IconAssetCriticality,
      path: ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH,
      skipUrlState: true,
      hideTimeline: true,
      capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
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

/** Artifact read flags used to compute first allowed artifact path (Option A RBAC fix). */
export interface ArtifactAuthz {
  canReadEndpointExceptions: boolean;
  canReadTrustedApplications: boolean;
  canReadTrustedDevices: boolean;
  canReadEventFilters: boolean;
  canReadHostIsolationExceptions: boolean;
  canReadBlocklist: boolean;
}

/**
 * Returns the path for the first artifact tab the user is allowed to access.
 * Order matches the Artifacts page tab order so the link always points at an allowed route.
 */
export const getFirstAllowedArtifactPath = (
  artifactAuthz: ArtifactAuthz,
  experimentalFeatures: Pick<
    ExperimentalFeatures,
    'endpointExceptionsMovedUnderManagement' | 'trustedDevices'
  >
): string => {
  const { endpointExceptionsMovedUnderManagement, trustedDevices: trustedDevicesEnabled } =
    experimentalFeatures;
  const {
    canReadEndpointExceptions,
    canReadTrustedApplications,
    canReadTrustedDevices,
    canReadEventFilters,
    canReadHostIsolationExceptions,
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
  if (canReadHostIsolationExceptions) {
    return getHostIsolationExceptionsListPath();
  }
  if (canReadBlocklist) {
    return getBlocklistsListPath();
  }
  return getTrustedAppsListPath();
};

export interface GetManagementFilteredLinksParams {
  experimentalFeatures?: Pick<
    ExperimentalFeatures,
    'endpointExceptionsMovedUnderManagement' | 'trustedDevices'
  >;
}

export const getManagementFilteredLinks = async (
  core: CoreStart,
  plugins: StartPlugins,
  params?: GetManagementFilteredLinksParams
): Promise<LinkItem> => {
  const fleetAuthz = plugins.fleet?.authz;
  const currentUser = await plugins.security.authc.getCurrentUser();

  const {
    canReadActionsLogManagement,
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
      ? calculateEndpointAuthz(licenseService, fleetAuthz, currentUser.roles)
      : getEndpointAuthzInitialState();

  const linksToExclude: SecurityPageName[] = [];

  if (!canReadEndpointList) {
    linksToExclude.push(SecurityPageName.endpoints);
  }

  if (!canReadPolicyManagement) {
    linksToExclude.push(SecurityPageName.policies);
    linksToExclude.push(SecurityPageName.cloudDefendPolicies);
  }

  const canReadAnyArtifact =
    canReadEndpointExceptions ||
    canReadTrustedApplications ||
    canReadTrustedDevices ||
    canReadEventFilters ||
    canReadHostIsolationExceptions ||
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
  const experimentalFeatures = params?.experimentalFeatures ?? {
    endpointExceptionsMovedUnderManagement: false,
    trustedDevices: true,
  };

  const artifactsPath = canReadAnyArtifact
    ? getFirstAllowedArtifactPath(
        {
          canReadEndpointExceptions,
          canReadTrustedApplications,
          canReadTrustedDevices,
          canReadEventFilters,
          canReadHostIsolationExceptions,
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
