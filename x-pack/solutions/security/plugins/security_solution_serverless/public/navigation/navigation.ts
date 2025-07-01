/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { ProductTier } from '../../common/product';
import type { SecurityProductTypes } from '../../common/config';
import { type Services } from '../common/services';
import { createAiNavigationTree } from './ai_navigation/ai_navigation_tree';
import { createNavigationTree } from './navigation_tree';

export const registerSolutionNavigation = async (
  services: Services,
  productTypes: SecurityProductTypes
) => {
  const shouldUseAINavigation = productTypes.some(
    (productType) => productType.product_tier === ProductTier.searchAiLake
  );

  const navigationTree = shouldUseAINavigation
    ? createAiNavigationTree()
    : createNavigationTree(services);

  services.securitySolution.setSolutionNavigationTree(navigationTree);

  services.serverless.initNavigation('security', Rx.of(navigationTree), {
    dataTestSubj: 'securitySolutionSideNav',
  });
};
