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

export const createAlertDetectionsNavigationTree = (): NodeDefinition => ({
  id: SecurityGroupName.alertDetections,
  title: SecurityLinkGroup[SecurityGroupName.alertDetections].title,
  icon: 'warning',
  renderAs: 'panelOpener',
  children: [
    {
      id: SecurityPageName.alerts,
      link: securityLink(SecurityPageName.alerts),
    },
    {
      id: SecurityPageName.attacks,
      link: securityLink(SecurityPageName.attacks),
    },
  ],
});
