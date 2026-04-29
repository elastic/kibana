/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityGroupName, SecurityPageName } from '../constants';
import { SecurityLinkGroup } from '../link_groups';
import { securityLink } from '../links';

export const createExploreNavigationTree = (): NodeDefinition => ({
  id: SecurityGroupName.explore,
  title: SecurityLinkGroup[SecurityGroupName.explore].title,
  renderAs: 'panelOpener',
  icon: 'globe',
  children: [
    {
      id: SecurityPageName.hosts,
      link: securityLink(SecurityPageName.hosts),
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
});
