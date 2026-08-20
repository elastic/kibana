/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootNodePanelOpenerDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName, SecurityGroupName } from '../constants';
import { SecurityLinkGroup } from '../link_groups';
import { securityLink } from '../links';

export const createCasesNavigationTree = (): RootNodePanelOpenerDefinition => ({
  id: SecurityGroupName.cases,
  title: SecurityLinkGroup[SecurityGroupName.cases].title,
  icon: 'briefcase',
  renderAs: 'panelOpener',
  children: [
    {
      id: SecurityPageName.case,
      link: securityLink(SecurityPageName.case),
    },
    {
      id: SecurityPageName.caseCreate,
      link: securityLink(SecurityPageName.caseCreate),
      sideNavStatus: 'hidden',
    },
    {
      id: SecurityPageName.caseConfigure,
      link: securityLink(SecurityPageName.caseConfigure),
      sideNavStatus: 'hidden',
    },
    {
      id: SecurityPageName.caseTemplates,
      link: securityLink(SecurityPageName.caseTemplates),
    },
  ],
});
