/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  RULES_UI_READ_PRIVILEGE,
  SECURITY_UI_SHOW_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import { ONBOARDING_PATH, SecurityPageName } from '../../common/constants';
import { GETTING_STARTED } from '../app/translations';
import type { LinkItem } from '../common/links/types';

export const onboardingLinks: LinkItem = {
  id: SecurityPageName.landing,
  title: GETTING_STARTED,
  path: ONBOARDING_PATH,
  capabilities: [SECURITY_UI_SHOW_PRIVILEGE, RULES_UI_READ_PRIVILEGE],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.getStarted', {
      defaultMessage: 'Getting started',
    }),
  ],
  sideNavIcon: 'launch',
  sideNavFooter: true,
  skipUrlState: true,
  hideTimeline: true,
};
