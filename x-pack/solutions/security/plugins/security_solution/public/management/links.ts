/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { checkArtifactHasData } from './services/exceptions_list/check_artifact_has_data';
import {
  calculateEndpointAuthz,
  getEndpointAuthzInitialState,
} from '../../common/endpoint/service/authz';
import {
  BLOCKLIST_PATH,
  ENDPOINTS_PATH,
  ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
  EVENT_FILTERS_PATH,
  HOST_ISOLATION_EXCEPTIONS_PATH,
  MANAGE_PATH,
  POLICIES_PATH,
  RESPONSE_ACTIONS_HISTORY_PATH,
  SecurityPageName,
  SECURITY_FEATURE_ID,
  TRUSTED_APPS_PATH,
} from '../../common/constants';
import {
  BLOCKLIST,
  ENDPOINTS,
  EVENT_FILTERS,
  HOST_ISOLATION_EXCEPTIONS,
  MANAGE,
  POLICIES,
  RESPONSE_ACTIONS_HISTORY,
  TRUSTED_APPLICATIONS,
  ENTITY_ANALYTICS_RISK_SCORE,
  ENTITY_STORE,
} from '../app/translations';
import { licenseService } from '../common/hooks/use_license';
import type { LinkItem } from '../common/links/types';
import type { StartPlugins } from '../types';
import { cloudDefendLink } from '../cloud_defend/links';
import { links as notesLink } from '../notes/links';
import { IconConsole } from '../common/icons/console';
import { IconShield } from '../common/icons/shield';
import { IconEndpoints } from '../common/icons/endpoints';
import { IconTool } from '../common/icons/tool';
import { IconPipeline } from '../common/icons/pipeline';
import { IconSavedObject } from '../common/icons/saved_object';
import { IconDashboards } from '../common/icons/dashboards';
import { IconEntityAnalytics } from '../common/icons/entity_analytics';
import { HostIsolationExceptionsApiClient } from './pages/host_isolation_exceptions/host_isolation_exceptions_api_client';
import { IconAssetCriticality } from '../common/icons/asset_criticality';

const categories = [
  {
    label: i18n.translate('xpack.securitySolution.appLinks.category.entityAnalytics', {
      defaultMessage: 'Entity Analytics',
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
      SecurityPageName.trustedApps,
      SecurityPageName.eventFilters,
      SecurityPageName.hostIsolationExceptions,
      SecurityPageName.blocklist,
      SecurityPageName.responseActionsHistory,
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
  globalNavPosition: 11,
  capabilities: [`${SECURITY_FEATURE_ID}.show`],
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
      landingIcon: IconTool,
      path: POLICIES_PATH,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.trustedApps,
      title: TRUSTED_APPLICATIONS,
      description: i18n.translate(
        'xpack.securitySolution.appLinks.trustedApplicationsDescription',
        {
          defaultMessage:
            'Improve performance or alleviate conflicts with other applications running on your hosts.',
        }
      ),
      landingIcon: IconDashboards,
      path: TRUSTED_APPS_PATH,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.eventFilters,
      title: EVENT_FILTERS,
      description: i18n.translate('xpack.securitySolution.appLinks.eventFiltersDescription', {
        defaultMessage: 'Exclude high volume or unwanted events being written into Elasticsearch.',
      }),
      landingIcon: IconPipeline,
      path: EVENT_FILTERS_PATH,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.hostIsolationExceptions,
      title: HOST_ISOLATION_EXCEPTIONS,
      description: i18n.translate('xpack.securitySolution.appLinks.hostIsolationDescription', {
        defaultMessage: 'Allow isolated hosts to communicate with specific IPs.',
      }),
      landingIcon: IconSavedObject,
      path: HOST_ISOLATION_EXCEPTIONS_PATH,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.blocklist,
      title: BLOCKLIST,
      description: i18n.translate('xpack.securitySolution.appLinks.blocklistDescription', {
        defaultMessage: 'Exclude unwanted applications from running on your hosts.',
      }),
      landingIcon: IconShield,
      path: BLOCKLIST_PATH,
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
      experimentalKey: 'riskScoringRoutesEnabled',
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
      landingIcon: IconConsole,
      path: RESPONSE_ACTIONS_HISTORY_PATH,
      skipUrlState: true,
      hideTimeline: true,
    },
    cloudDefendLink,
    notesLink,
  ],
};

const excludeLinks = (linkIds: SecurityPageName[]) => ({
  ...links,
  links: links.links?.filter((link) => !linkIds.includes(link.id)),
});

export const getManagementFilteredLinks = async (
  core: CoreStart,
  plugins: StartPlugins
): Promise<LinkItem> => {
  const fleetAuthz = plugins.fleet?.authz;
  const currentUser = await plugins.security.authc.getCurrentUser();
  const {
    canReadActionsLogManagement,
    canAccessHostIsolationExceptions,
    canReadHostIsolationExceptions,
    canReadEndpointList,
    canReadTrustedApplications,
    canReadEventFilters,
    canReadBlocklist,
    canReadPolicyManagement,
  } =
    fleetAuthz && currentUser
      ? calculateEndpointAuthz(licenseService, fleetAuthz, currentUser.roles)
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

  if (!canReadActionsLogManagement) {
    linksToExclude.push(SecurityPageName.responseActionsHistory);
  }

  if (!showHostIsolationExceptions) {
    linksToExclude.push(SecurityPageName.hostIsolationExceptions);
  }

  if (!canReadTrustedApplications) {
    linksToExclude.push(SecurityPageName.trustedApps);
  }

  if (!canReadEventFilters) {
    linksToExclude.push(SecurityPageName.eventFilters);
  }

  if (!canReadBlocklist) {
    linksToExclude.push(SecurityPageName.blocklist);
  }

  return excludeLinks(linksToExclude);
};
