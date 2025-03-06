/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SIEM_MIGRATIONS_FEATURE_ID } from '@kbn/security-solution-features/constants';
import {
  SecurityPageName,
  SECURITY_FEATURE_ID,
  SIEM_MIGRATIONS_RULES_PATH,
} from '../../common/constants';
import { SIEM_MIGRATIONS_RULES } from '../app/translations';
import type { LinkItem } from '../common/links/types';
import { SiemMigrationsIcon } from '../common/icons/siem_migrations';

export const siemMigrationsLinks: LinkItem = {
  id: SecurityPageName.siemMigrationsRules,
  title: SIEM_MIGRATIONS_RULES,
  description: i18n.translate('xpack.securitySolution.appLinks.siemMigrationsRulesDescription', {
    defaultMessage:
      'Our generative AI powered SIEM migration tool automates some of the most time consuming migrations tasks and processed.',
  }),
  landingIcon: SiemMigrationsIcon,
  path: SIEM_MIGRATIONS_RULES_PATH,
  capabilities: [[`${SECURITY_FEATURE_ID}.show`, `${SIEM_MIGRATIONS_FEATURE_ID}.all`]],
  skipUrlState: true,
  hideTimeline: true,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.siemMigrationsRules', {
      defaultMessage: 'SIEM Rule Migrations',
    }),
  ],
  hideWhenExperimentalKey: 'siemMigrationsDisabled',
  isBeta: true,
  betaOptions: {
    text: i18n.translate('xpack.securitySolution.appLinks.siemMigrationsRulesTechnicalPreview', {
      defaultMessage: 'Technical Preview',
    }),
  },
};
