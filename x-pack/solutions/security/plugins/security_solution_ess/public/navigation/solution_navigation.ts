/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, combineLatest } from 'rxjs';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import type { AIChatExperience } from '@kbn/ai-assistant-common';

import { type Services } from '../common/services';
import { SOLUTION_NAME } from './translations';
import { createNavigationTree } from './navigation_tree';

export const registerSolutionNavigation = async (services: Services) => {
  const { securitySolution, navigation } = services;

  const chatExperience$ = services.settings.client.get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);

  const navigationTree$ = chatExperience$.pipe(
    map((chatExperience) => createNavigationTree(services, chatExperience))
  );

  combineLatest([navigation.isSolutionNavEnabled$, chatExperience$]).subscribe(
    ([isSolutionNavigationEnabled, chatExperience]) => {
      if (isSolutionNavigationEnabled) {
        securitySolution.setSolutionNavigationTree(createNavigationTree(services, chatExperience));
      } else {
        securitySolution.setSolutionNavigationTree(null);
      }
    }
  );

  navigation.addSolutionNavigation({
    id: 'security',
    title: SOLUTION_NAME,
    icon: 'logoSecurity',
    navigationTree$,
  });
};
