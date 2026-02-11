/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName } from '../constants';
import { securityLink } from '../links';

export const createCasesNavigationTree = (): NodeDefinition => ({
  id: SecurityPageName.case,
  link: securityLink(SecurityPageName.case),
  icon: 'briefcase',
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
