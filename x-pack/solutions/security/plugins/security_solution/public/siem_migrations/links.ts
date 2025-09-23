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
  SIEM_MIGRATIONS_DASHBOARDS_PATH,
  SIEM_MIGRATIONS_LANDING_PATH,
} from '../../common/constants';
import type { LinkItem } from '../common/links/types';
import { SiemMigrationsIcon } from '../common/icons/siem_migrations';

const subLinks: LinkItem[] = [
  {
    id: SecurityPageName.siemMigrationsRules,
    title: i18n.translate('xpack.securitySolution.appLinks.automaticMigrationRules.title', {
      defaultMessage: 'Translated rules',
    }),
    description: i18n.translate('xpack.securitySolution.appLinks.siemMigrationsRules.description', {
      defaultMessage:
        'Our generative AI powered Automatic migration tool automates some of the most time consuming migrations tasks and processes.',
    }),
    landingIcon: SiemMigrationsIcon,
    path: SIEM_MIGRATIONS_RULES_PATH,
    capabilities: [[`${SECURITY_FEATURE_ID}.show`, `${SIEM_MIGRATIONS_FEATURE_ID}.all`]],
    skipUrlState: true,
    hideTimeline: true,
    hideWhenExperimentalKey: 'siemMigrationsDisabled',
  },
  {
    id: SecurityPageName.siemMigrationsDashboards,
    title: i18n.translate('xpack.securitySolution.appLinks.automaticMigrationDashboards.title', {
      defaultMessage: 'Translated dashboards',
    }),
    description: i18n.translate(
      'xpack.securitySolution.appLinks.siemMigrationsDashboards.description',
      {
        defaultMessage:
          'Our generative AI powered Automatic migration tool automates some of the most time consuming migrations tasks and processes.',
      }
    ),
    landingIcon: SiemMigrationsIcon,
    path: SIEM_MIGRATIONS_DASHBOARDS_PATH,
    capabilities: [[`${SECURITY_FEATURE_ID}.show`, `${SIEM_MIGRATIONS_FEATURE_ID}.all`]],
    skipUrlState: true,
    hideTimeline: true,
    hideWhenExperimentalKey: 'siemMigrationsDisabled',
    experimentalKey: 'automaticDashboardsMigration',
    isBeta: true,
    betaOptions: {
      text: i18n.translate('xpack.securitySolution.appLinks.siemMigrationsDashboards.badge', {
        defaultMessage: 'Technical Preview',
      }),
    },
  },
];

export const links: LinkItem = {
  id: SecurityPageName.siemMigrationsLanding,
  title: i18n.translate('xpack.securitySolution.appLinks.automaticMigrations.title', {
    defaultMessage: 'Migrations',
  }),
  path: SIEM_MIGRATIONS_LANDING_PATH,
  capabilities: [[`${SECURITY_FEATURE_ID}.show`, `${SIEM_MIGRATIONS_FEATURE_ID}.all`]],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.migrations', {
      defaultMessage: 'DashboardMigrations',
    }),
  ],
  links: subLinks,
  skipUrlState: true,
  categories: [
    {
      label: i18n.translate('xpack.securitySolution.appLinks.category.automaticMigrations', {
        defaultMessage: 'Automatic migrations',
      }),
      linkIds: [SecurityPageName.siemMigrationsRules, SecurityPageName.siemMigrationsDashboards],
    },
  ],
};
