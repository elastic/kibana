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
  SIEM_MIGRATIONS_FEATURE_ID,
} from '@kbn/security-solution-features/constants';
import {
  SIEM_MIGRATIONS_DASHBOARDS_PATH,
  SIEM_MIGRATIONS_LANDING_PATH,
  SIEM_MIGRATIONS_RULES_PATH,
  SecurityPageName,
} from '../../common/constants';
import type { LinkItem } from '../common/links/types';
import { IconDashboards } from '../common/icons/dashboards';
import { IconRules } from '../common/icons/rules';

const subLinks: LinkItem[] = [
  {
    id: SecurityPageName.siemMigrationsRules,
    title: i18n.translate('xpack.securitySolution.appLinks.automaticMigrationRules.title', {
      defaultMessage: 'Translated rules',
    }),
    description: i18n.translate('xpack.securitySolution.appLinks.siemMigrationsRules.description', {
      defaultMessage: 'Migrate your SIEM rules to Elastic using AI powered Automatic migration.',
    }),
    landingIcon: IconRules,
    path: SIEM_MIGRATIONS_RULES_PATH,
    capabilities: [[RULES_UI_READ_PRIVILEGE, `${SIEM_MIGRATIONS_FEATURE_ID}.all`]],
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
        defaultMessage: 'Migrate your dashboards to Elastic using AI powered Automatic migration.',
      }
    ),
    landingIcon: IconDashboards,
    path: SIEM_MIGRATIONS_DASHBOARDS_PATH,
    capabilities: [[`dashboard_v2.show`, `${SIEM_MIGRATIONS_FEATURE_ID}.all`]],
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
  capabilities: [
    [SECURITY_UI_SHOW_PRIVILEGE, `${SIEM_MIGRATIONS_FEATURE_ID}.all`],
    [RULES_UI_READ_PRIVILEGE, `${SIEM_MIGRATIONS_FEATURE_ID}.all`],
  ],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.migrations', {
      defaultMessage: 'Migrations',
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
