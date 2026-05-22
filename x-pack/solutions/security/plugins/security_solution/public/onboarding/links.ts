/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALERTS_UI_READ_PRIVILEGE,
  RULES_UI_READ_PRIVILEGE,
  SECURITY_UI_SHOW_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import { LinkCategoryType } from '@kbn/security-solution-navigation';
import { ONBOARDING_PATH, SecurityPageName } from '../../common/constants';
import { GETTING_STARTED, LAUNCHPAD } from '../app/translations';
import type { LinkItem } from '../common/links/types';
import { siemReadinessLinks } from '../siem_readiness/links';
import { links as siemMigrationsLinks } from '../siem_migrations/links';
import { aiValueLinks } from '../reports/links';

export const onboardingLinks: LinkItem = {
  id: SecurityPageName.landing,
  title: GETTING_STARTED,
  path: ONBOARDING_PATH,
  capabilities: [SECURITY_UI_SHOW_PRIVILEGE, RULES_UI_READ_PRIVILEGE, ALERTS_UI_READ_PRIVILEGE],
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

export const launchPadLinks: LinkItem = {
  id: SecurityPageName.launchpad,
  title: LAUNCHPAD,
  path: ONBOARDING_PATH,
  globalNavPosition: 12,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.launchpad', {
      defaultMessage: 'Launchpad',
    }),
  ],
  categories: [
    {
      type: LinkCategoryType.separator,
      linkIds: [SecurityPageName.landing, SecurityPageName.siemReadiness, SecurityPageName.aiValue],
    },
    {
      label: i18n.translate('xpack.securitySolution.appLinks.category.migrations', {
        defaultMessage: 'Migrations',
      }),
      linkIds: [
        SecurityPageName.siemMigrationsManage,
        SecurityPageName.siemMigrationsRules,
        SecurityPageName.siemMigrationsDashboards,
      ],
    },
  ],
  links: [onboardingLinks, aiValueLinks, siemMigrationsLinks, siemReadinessLinks],
  sideNavIcon: 'launch',
  sideNavFooter: true,
  skipUrlState: true,
  hideTimeline: true,
  visibleIn: ['globalSearch', 'sideNav'],
};

/**
 * Ordered entries: Get started, Value reports, Translated rules, Translated dashboards (titles come from link config).
 */
export const CLASSIC_LAUNCHPAD_PANEL_LINK_ENTRIES = Object.freeze([
  { id: SecurityPageName.landing },
  { id: SecurityPageName.siemReadiness },
  { id: SecurityPageName.aiValue },
  { id: SecurityPageName.siemMigrationsManage },
  { id: SecurityPageName.siemMigrationsRules },
  { id: SecurityPageName.siemMigrationsDashboards },
]);
