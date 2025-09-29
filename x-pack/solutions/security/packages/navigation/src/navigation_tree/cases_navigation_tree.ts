/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName } from '../constants';
import { securityLink } from '../links';

const LazyIconBriefcase = lazy(() =>
  import('./v2_icons/briefcase').then(({ iconBriefcase }) => ({ default: iconBriefcase }))
);

export const createCasesNavigationTree = (
  { sideNavVersion }: { sideNavVersion?: NodeDefinition['sideNavVersion'] } = {
    sideNavVersion: 'v1',
  }
): NodeDefinition => ({
  id: SecurityPageName.case,
  link: securityLink(SecurityPageName.case),
  renderAs: 'item',
  // TODO: update icon from EUI
  iconV2: LazyIconBriefcase,
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
