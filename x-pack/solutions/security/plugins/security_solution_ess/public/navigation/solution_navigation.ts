/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, combineLatest } from 'rxjs';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import type { AIChatExperience } from '@kbn/ai-assistant-common';
import type { SolutionId } from '@kbn/core-chrome-browser';
import { getDaybreakIconDataUrl } from '@kbn/spaces-plugin/common';
import { i18n } from '@kbn/i18n';

import { type Services } from '../common/services';
import { SOLUTION_NAME } from './translations';
import { createDaybreakNavigationTree, createNavigationTree } from './navigation_tree';

const DAYBREAK_SOLUTION_TITLE = i18n.translate(
  'xpack.securitySolutionEss.daybreak.solutionNavTitle',
  { defaultMessage: 'Daybreak' }
);

export const registerSolutionNavigation = async (services: Services) => {
  const { securitySolution, navigation } = services;

  const chatExperience$ = services.settings.client.get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);

  const navigationTree$ = chatExperience$.pipe(
    map((chatExperience) => createNavigationTree(services, chatExperience))
  );

  const daybreakNavigationTree$ = chatExperience$.pipe(
    map((chatExperience) => createDaybreakNavigationTree(services, chatExperience))
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

  /*
   * Daybreak — experimental "autonomous Security" mode. Reuses the
   * Security navigation tree but rewrites the home node so its
   * `data-test-subj` carries the `daybreak` token. That lets
   * `DaybreakSidenavGlobalStyles` (registered in the spaces plugin)
   * paint the AI gradient + sun icon on the side-nav home button.
   *
   * Cast to `SolutionId` because Daybreak isn't formally part of the
   * `SolutionId` union — it's recognised by the navigation plugin's
   * `isKnownSolutionView` allowlist, same way Nightshift is.
   */
  navigation.addSolutionNavigation({
    id: 'daybreak' as SolutionId,
    title: DAYBREAK_SOLUTION_TITLE,
    icon: getDaybreakIconDataUrl({ size: 24 }),
    navigationTree$: daybreakNavigationTree$,
  });
};
