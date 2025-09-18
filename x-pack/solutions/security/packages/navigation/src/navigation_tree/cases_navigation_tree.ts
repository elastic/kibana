/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import type { SideNavVersion } from '@kbn/core-chrome-browser/src/project_navigation';
import { SecurityPageName } from '../constants';
import { securityLink } from '../links';
import { iconBriefcase } from './v2_icons/briefcase';

export const createCasesNavigationTree = (
  { sideNavVersion }: { sideNavVersion?: SideNavVersion } = { sideNavVersion: 'v1' }
): NodeDefinition => ({
  id: SecurityPageName.case,
  link: securityLink(SecurityPageName.case),
  renderAs: 'item',
  iconV2: iconBriefcase,
  sideNavVersion,
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
});
