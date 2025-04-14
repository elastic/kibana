/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Services } from '../common/services';
import { createSecurityNavigationTree$ } from './security_side_navigation';

export const initSideNavigation = async (services: Services) => {
  services.securitySolution.setIsSolutionNavigationEnabled(true);

  const navigationTree$ = createSecurityNavigationTree$(services);

  services.serverless.initNavigation('security', navigationTree$, {
    dataTestSubj: 'securitySolutionSideNav',
  });
};
