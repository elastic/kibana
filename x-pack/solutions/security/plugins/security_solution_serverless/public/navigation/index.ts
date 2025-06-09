/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_PATH } from '@kbn/security-solution-plugin/common';
import { APP_PATH as AI_FOR_SOC_APP_PATH } from '@kbn/security-solution-ai-for-soc/common';
import type { SecurityProductTypes } from '../../common/config';
import type { Services } from '../common/services';
import { ProductTier } from '../../common/product';
import { subscribeBreadcrumbs } from './breadcrumbs';
import { registerSolutionNavigation } from './navigation';
import { enableManagementCardsLanding } from './management_cards';

export const startNavigation = (services: Services, productTypes: SecurityProductTypes) => {
  const shouldUseAINavigation = productTypes.some(
    (productType) => productType.product_tier === ProductTier.searchAiLake
  );

  if (shouldUseAINavigation) {
    services.serverless.setProjectHome(AI_FOR_SOC_APP_PATH);
  } else {
    services.serverless.setProjectHome(APP_PATH);
  }

  registerSolutionNavigation(services, productTypes);
  enableManagementCardsLanding(services);
  subscribeBreadcrumbs(services);
};
