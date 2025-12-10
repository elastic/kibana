/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { switchMap, take, firstValueFrom } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
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

  const chatExperience$ = services.settings.client.get$<AIChatExperience>(
    AI_CHAT_EXPERIENCE_TYPE,
    AIChatExperience.Classic
  );

  // Get initial chat experience for setting initial navigation tree
  const initialChatExperience = await firstValueFrom(chatExperience$.pipe(take(1)));

  const initialNavigationTree = shouldUseAINavigation
    ? createAiNavigationTree(initialChatExperience)
    : await createNavigationTree(services, initialChatExperience);

  services.securitySolution.setSolutionNavigationTree(initialNavigationTree);

  // Create reactive navigation tree observable
  const navigationTree$ = chatExperience$.pipe(
    switchMap(async (chatExperience) => {
      return shouldUseAINavigation
        ? createAiNavigationTree(chatExperience)
        : await createNavigationTree(services, chatExperience);
    })
  );

  services.serverless.initNavigation('security', navigationTree$, {
    dataTestSubj: 'securitySolutionSideNav',
  });
};
