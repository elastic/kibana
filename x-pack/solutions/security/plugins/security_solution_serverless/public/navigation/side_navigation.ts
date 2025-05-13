/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityProductTypes } from '../../common/config';
import { type Services } from '../common/services';
import { createAiSocNavigationTree$, shouldUseAINavigation } from './ai_soc/ai_soc_navigation';
import { createSecurityNavigationTree$ } from './security_side_navigation';

export const initSideNavigation = async (
  services: Services,
  productTypes: SecurityProductTypes
) => {
  services.securitySolution.setIsSolutionNavigationEnabled(true);

  const navigationTree$ = shouldUseAINavigation(productTypes)
    ? createAiSocNavigationTree$()
    : createSecurityNavigationTree$(services);

  services.serverless.initNavigation('security', navigationTree$, {
    dataTestSubj: 'securitySolutionSideNav',
  });
};
