/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName, SecurityGroupName } from '../constants';
import { SecurityLinkGroup } from '../link_groups';
import { securityLink } from '../links';
import { i18nStrings } from '../i18n_strings';

export const createAlertDetectionsNavigationTree = (
  { sideNavVersion }: { sideNavVersion?: NodeDefinition['sideNavVersion'] } = {
    sideNavVersion: 'v1',
  }
): NodeDefinition => ({
  id: SecurityGroupName.alertDetections,
  title: SecurityLinkGroup[SecurityGroupName.alertDetections].title,
  iconV2: 'warning',
  renderAs: 'panelOpener',
  sideNavVersion,
  children: [
    {
      title: i18nStrings.alertDetections.views.title,
      breadcrumbStatus: 'hidden',
      children: [
        {
          id: SecurityPageName.attacks,
          link: securityLink(SecurityPageName.attacks),
        },
        {
          id: SecurityPageName.alerts,
          link: securityLink(SecurityPageName.alerts),
        },
      ],
    },
  ],
});
