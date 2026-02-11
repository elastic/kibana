/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows/common/constants';
import { ProductLine } from '../../common/product';
import type { SecurityProductTypes } from '../../common/config';
import { type Services } from '../common/services';
import { createAiNavigationTree } from './ai_navigation/ai_navigation_tree';
import { createNavigationTree } from './navigation_tree';

export const registerSolutionNavigation = async (
  services: Services,
  productTypes: SecurityProductTypes
) => {
  const shouldUseAINavigation = productTypes.some(
    (productType) => productType.product_line === ProductLine.aiSoc
  );

  const chatExperience$ = services.settings.client.get$<AIChatExperience>(
    AI_CHAT_EXPERIENCE_TYPE,
    AIChatExperience.Classic
  );

  // Get initial chat experience for setting initial navigation tree
  const initialChatExperience = await firstValueFrom(chatExperience$);

  const workflowsUiEnabled$ = services.settings.client.get$<boolean>(
    WORKFLOWS_UI_SETTING_ID,
    false
  );
  const workflowsUiEnabled = await firstValueFrom(workflowsUiEnabled$);

  const navigationTree = shouldUseAINavigation
    ? createAiNavigationTree(initialChatExperience, workflowsUiEnabled)
    : await createNavigationTree(services, initialChatExperience);

  services.securitySolution.setSolutionNavigationTree(navigationTree);

  services.serverless.initNavigation('security', Rx.of(navigationTree), {
    dataTestSubj: 'securitySolutionSideNav',
  });
};
