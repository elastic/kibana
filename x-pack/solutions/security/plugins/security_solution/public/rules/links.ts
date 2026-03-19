/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  EXCEPTIONS_UI_READ_PRIVILEGES,
  RULES_UI_DETECTIONS_PRIVILEGE,
  RULES_UI_READ_PRIVILEGE,
  SECURITY_UI_SHOW_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import {
  COVERAGE_OVERVIEW_PATH,
  DE_SPACE_RULES_HEALTH_PATH,
  EXCEPTIONS_PATH,
  RULES_ADD_PATH,
  RULES_CREATE_PATH,
  RULES_LANDING_PATH,
  AI_RULE_CREATION_PATH,
  RULES_PATH,
  SECURITY_FEATURE_ID,
} from '../../common/constants';
import {
  ADD_RULES,
  COVERAGE_OVERVIEW,
  CREATE_NEW_RULE,
  AI_RULE_CREATE,
  DE_SPACE_RULES_HEALTH,
  EXCEPTIONS,
  RULES,
  SIEM_RULES,
} from '../app/translations';
import { SecurityPageName } from '../app/types';
import { benchmarksLink } from '../cloud_security_posture/links';
import type { LinkItem } from '../common/links';
import { IconConsoleCloud } from '../common/icons/console_cloud';
import { IconRollup } from '../common/icons/rollup';
import { IconDashboards } from '../common/icons/dashboards';

export const links: LinkItem = {
  id: SecurityPageName.rulesLanding,
  title: RULES,
  path: RULES_LANDING_PATH,
  hideTimeline: true,
  skipUrlState: true,
  globalNavPosition: 2,
  capabilities: [RULES_UI_READ_PRIVILEGE, SECURITY_UI_SHOW_PRIVILEGE],
  links: [
    {
      id: SecurityPageName.rules,
      title: SIEM_RULES,
      description: i18n.translate('xpack.securitySolution.appLinks.rulesDescription', {
        defaultMessage: 'Create and manage detection rules for threat detection and monitoring.',
      }),
      landingIcon: IconRollup,
      path: RULES_PATH,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.appLinks.rules', {
          defaultMessage: 'SIEM Rules',
        }),
      ],
      capabilities: [[RULES_UI_READ_PRIVILEGE, RULES_UI_DETECTIONS_PRIVILEGE]],
      links: [
        {
          id: SecurityPageName.rulesAdd,
          title: ADD_RULES,
          path: RULES_ADD_PATH,
          skipUrlState: true,
          hideTimeline: true,
        },
        {
          id: SecurityPageName.rulesCreate,
          title: CREATE_NEW_RULE,
          path: RULES_CREATE_PATH,
          skipUrlState: true,
          hideTimeline: false,
        },
        {
          id: SecurityPageName.aiRuleCreation,
          title: AI_RULE_CREATE,
          path: AI_RULE_CREATION_PATH,
          skipUrlState: true,
          hideTimeline: false,
        },
        {
          id: SecurityPageName.spaceRulesHealth,
          title: DE_SPACE_RULES_HEALTH,
          path: DE_SPACE_RULES_HEALTH_PATH,
          skipUrlState: true,
          hideTimeline: true,
          globalSearchDisabled: true,
        },
      ],
    },
    {
      id: SecurityPageName.exceptions,
      title: EXCEPTIONS,
      description: i18n.translate('xpack.securitySolution.appLinks.exceptionsDescription', {
        defaultMessage:
          'Create and manage shared exception lists to prevent the creation of unwanted alerts.',
      }),
      landingIcon: IconConsoleCloud,
      path: EXCEPTIONS_PATH,
      capabilities: [
        EXCEPTIONS_UI_READ_PRIVILEGES,
        `${SECURITY_FEATURE_ID}.showEndpointExceptions`,
      ],
      skipUrlState: true,
      hideTimeline: true,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.appLinks.exceptions', {
          defaultMessage: 'Exception lists',
        }),
      ],
    },
    benchmarksLink,
    {
      id: SecurityPageName.coverageOverview,
      title: COVERAGE_OVERVIEW,
      landingIcon: IconDashboards,
      description: i18n.translate(
        'xpack.securitySolution.appLinks.coverageOverviewDashboardDescription',
        {
          defaultMessage: 'Review and maintain your protections MITRE ATT&CK® coverage.',
        }
      ),
      path: COVERAGE_OVERVIEW_PATH,
      capabilities: RULES_UI_READ_PRIVILEGE,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.appLinks.coverageOverviewDashboard', {
          defaultMessage: 'MITRE ATT&CK Coverage',
        }),
      ],
    },
  ],
  categories: [
    {
      label: i18n.translate('xpack.securitySolution.appLinks.category.management', {
        defaultMessage: 'Management',
      }),
      linkIds: [
        SecurityPageName.rules,
        SecurityPageName.cloudSecurityPostureBenchmarks,
        SecurityPageName.exceptions,
      ],
    },
    {
      label: i18n.translate('xpack.securitySolution.appLinks.category.discover', {
        defaultMessage: 'Discover',
      }),
      linkIds: [SecurityPageName.coverageOverview],
    },
  ],
};
