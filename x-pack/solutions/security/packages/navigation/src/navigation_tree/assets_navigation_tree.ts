/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName, SecurityGroupName } from '../constants';
import { SecurityLinkGroup } from '../link_groups';
import { securityLink } from '../links';
import { i18nStrings } from '../i18n_strings';
import { renderIntegrationsLinkCallout } from './integrations_link_callout';

export const createAssetsNavigationTree = (core: CoreStart): NodeDefinition => ({
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
      children: [
        {
          renderItem: () => renderIntegrationsLinkCallout(core),
        },
      ],
    },
  ],
});
