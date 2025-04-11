/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { SecurityGroupName, SecurityPageName } from '@kbn/security-solution-navigation';
import {
  i18nStrings,
  securityLink,
  renderIntegrationsLinkCallout,
  SecurityLinkGroup,
} from '@kbn/security-solution-navigation/links';

import { type Services } from '../common/services';
import { createMachineLearningNavigationTree } from './ml_navigation';
import { createStackManagementNavigationTree } from './stack_management_navigation';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.navLinks.projectType.title',
  { defaultMessage: 'Security' }
);

export const createNavigationTree = (services: Services): NavigationTreeDefinition => ({
  body: [
    {
      type: 'navGroup',
      id: 'security_solution_nav',
      title: SOLUTION_NAME,
      icon: 'logoSecurity',
      breadcrumbStatus: 'hidden',
      isCollapsible: false,
      defaultIsCollapsed: false,
      children: [
        {
          link: 'discover',
        },
        {
          id: SecurityPageName.dashboards,
          link: securityLink(SecurityPageName.dashboards),
          renderAs: 'item',
          children: [
            {
              id: SecurityPageName.overview,
              link: securityLink(SecurityPageName.overview),
              sideNavStatus: 'hidden',
            },
            {
              id: SecurityPageName.detectionAndResponse,
              link: securityLink(SecurityPageName.detectionAndResponse),
              sideNavStatus: 'hidden',
            },
            {
              id: SecurityPageName.cloudSecurityPostureDashboard,
              link: securityLink(SecurityPageName.cloudSecurityPostureDashboard),
              sideNavStatus: 'hidden',
            },
            {
              id: SecurityPageName.cloudSecurityPostureVulnerabilityDashboard,
              link: securityLink(SecurityPageName.cloudSecurityPostureVulnerabilityDashboard),
              sideNavStatus: 'hidden',
            },
            {
              id: SecurityPageName.entityAnalytics,
              link: securityLink(SecurityPageName.entityAnalytics),
              sideNavStatus: 'hidden',
            },
            {
              id: SecurityPageName.dataQuality,
              link: securityLink(SecurityPageName.dataQuality),
              sideNavStatus: 'hidden',
            },
          ],
        },
        {
          id: SecurityGroupName.rules,
          title: SecurityLinkGroup[SecurityGroupName.rules].title,
          renderAs: 'panelOpener',
          children: [
            {
              title: i18nStrings.rules.management.title,
              breadcrumbStatus: 'hidden',
              children: [
                {
                  id: SecurityPageName.rules,
                  link: securityLink(SecurityPageName.rules),
                  renderAs: 'item',
                  children: [
                    {
                      id: SecurityPageName.rulesAdd,
                      link: securityLink(SecurityPageName.rulesAdd),
                    },
                    {
                      id: SecurityPageName.rulesCreate,
                      link: securityLink(SecurityPageName.rulesCreate),
                    },
                  ],
                },
                {
                  id: SecurityPageName.cloudSecurityPostureBenchmarks,
                  link: securityLink(SecurityPageName.cloudSecurityPostureBenchmarks),
                },
                {
                  id: SecurityPageName.exceptions,
                  link: securityLink(SecurityPageName.exceptions),
                },
                {
                  id: SecurityPageName.siemMigrationsRules,
                  link: securityLink(SecurityPageName.siemMigrationsRules),
                },
              ],
            },
            {
              title: i18nStrings.rules.management.discover,
              breadcrumbStatus: 'hidden',
              children: [
                {
                  id: SecurityPageName.coverageOverview,
                  link: securityLink(SecurityPageName.coverageOverview),
                },
              ],
            },
          ],
        },
        {
          id: SecurityPageName.alerts,
          link: securityLink(SecurityPageName.alerts),
        },
        {
          id: SecurityPageName.attackDiscovery,
          link: securityLink(SecurityPageName.attackDiscovery),
        },
        {
          id: SecurityPageName.cloudSecurityPostureFindings,
          link: securityLink(SecurityPageName.cloudSecurityPostureFindings),
        },
        {
          id: SecurityPageName.case,
          link: securityLink(SecurityPageName.case),
          renderAs: 'item',
          children: [
            {
              id: SecurityPageName.caseCreate,
              link: securityLink(SecurityPageName.caseCreate),
            },
            {
              id: SecurityPageName.caseConfigure,
              link: securityLink(SecurityPageName.caseConfigure),
            },
          ],
        },
        {
          id: SecurityGroupName.investigations,
          title: SecurityLinkGroup[SecurityGroupName.investigations].title,
          renderAs: 'panelOpener',
          children: [
            {
              id: SecurityPageName.timelines,
              link: securityLink(SecurityPageName.timelines),
              renderAs: 'item',
              children: [
                {
                  id: SecurityPageName.timelinesTemplates,
                  link: securityLink(SecurityPageName.timelinesTemplates),
                  sideNavStatus: 'hidden',
                },
              ],
            },
            {
              id: SecurityPageName.notes,
              link: securityLink(SecurityPageName.notes),
            },
            {
              link: 'osquery',
            },
          ],
        },
        {
          id: SecurityPageName.threatIntelligence,
          link: securityLink(SecurityPageName.threatIntelligence),
        },
        {
          id: SecurityGroupName.explore,
          title: SecurityLinkGroup[SecurityGroupName.explore].title,
          spaceBefore: null,
          renderAs: 'panelOpener',
          children: [
            {
              id: SecurityPageName.hosts,
              link: securityLink(SecurityPageName.hosts),
              renderAs: 'item',
              children: [
                {
                  id: SecurityPageName.hostsAll,
                  link: securityLink(SecurityPageName.hostsAll),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.hostsUncommonProcesses,
                  link: securityLink(SecurityPageName.hostsUncommonProcesses),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.hostsAnomalies,
                  link: securityLink(SecurityPageName.hostsAnomalies),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.hostsEvents,
                  link: securityLink(SecurityPageName.hostsEvents),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.hostsRisk,
                  link: securityLink(SecurityPageName.hostsRisk),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.hostsSessions,
                  link: securityLink(SecurityPageName.hostsSessions),
                  breadcrumbStatus: 'hidden',
                },
              ],
            },
            {
              id: SecurityPageName.network,
              link: securityLink(SecurityPageName.network),
              renderAs: 'item',
              children: [
                {
                  id: SecurityPageName.networkFlows,
                  link: securityLink(SecurityPageName.networkFlows),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.networkDns,
                  link: securityLink(SecurityPageName.networkDns),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.networkHttp,
                  link: securityLink(SecurityPageName.networkHttp),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.networkTls,
                  link: securityLink(SecurityPageName.networkTls),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.networkAnomalies,
                  link: securityLink(SecurityPageName.networkAnomalies),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.networkEvents,
                  link: securityLink(SecurityPageName.networkEvents),
                  breadcrumbStatus: 'hidden',
                },
              ],
            },
            {
              id: SecurityPageName.users,
              link: securityLink(SecurityPageName.users),
              renderAs: 'item',
              children: [
                {
                  id: SecurityPageName.usersAll,
                  link: securityLink(SecurityPageName.usersAll),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.usersAuthentications,
                  link: securityLink(SecurityPageName.usersAuthentications),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.usersAnomalies,
                  link: securityLink(SecurityPageName.usersAnomalies),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.usersRisk,
                  link: securityLink(SecurityPageName.usersRisk),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.usersEvents,
                  link: securityLink(SecurityPageName.usersEvents),
                  breadcrumbStatus: 'hidden',
                },
              ],
            },
          ],
        },
        {
          id: SecurityGroupName.assets,
          title: SecurityLinkGroup[SecurityGroupName.assets].title,
          renderAs: 'panelOpener',
          children: [
            {
              link: 'fleet',
              title: i18nStrings.assets.fleet.title,
              children: [
                {
                  link: 'fleet:agents',
                },
                {
                  link: 'fleet:policies',
                  title: i18nStrings.assets.fleet.policies,
                },
                {
                  link: 'fleet:enrollment_tokens',
                },
                {
                  link: 'fleet:uninstall_tokens',
                },
                {
                  link: 'fleet:data_streams',
                },
                {
                  link: 'fleet:settings',
                },
              ],
            },
            {
              id: SecurityPageName.endpoints,
              link: securityLink(SecurityPageName.endpoints),
              title: i18nStrings.assets.endpoints.title,
              children: [
                {
                  id: SecurityPageName.endpoints,
                  link: securityLink(SecurityPageName.endpoints),
                  breadcrumbStatus: 'hidden',
                },
                {
                  id: SecurityPageName.policies,
                  link: securityLink(SecurityPageName.policies),
                },
                {
                  id: SecurityPageName.trustedApps,
                  link: securityLink(SecurityPageName.trustedApps),
                },
                {
                  id: SecurityPageName.eventFilters,
                  link: securityLink(SecurityPageName.eventFilters),
                },
                {
                  id: SecurityPageName.hostIsolationExceptions,
                  link: securityLink(SecurityPageName.hostIsolationExceptions),
                },
                {
                  id: SecurityPageName.blocklist,
                  link: securityLink(SecurityPageName.blocklist),
                },
                {
                  id: SecurityPageName.responseActionsHistory,
                  link: securityLink(SecurityPageName.responseActionsHistory),
                },
              ],
            },
            {
              title: '',
              renderItem: () => renderIntegrationsLinkCallout(services),
            },
          ],
        },
        createMachineLearningNavigationTree(),
      ],
    },
  ],
  footer: [
    {
      type: 'navItem',
      id: SecurityPageName.landing,
      link: securityLink(SecurityPageName.landing),
      icon: 'launch',
    },
    {
      type: 'navItem',
      link: 'dev_tools',
      title: i18nStrings.devTools,
      icon: 'editorCodeBlock',
    },
    createStackManagementNavigationTree(),
  ],
});
