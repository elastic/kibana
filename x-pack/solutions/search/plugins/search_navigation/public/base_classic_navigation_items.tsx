/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import {
  SEARCH_HOMEPAGE,
  SEARCH_GETTING_STARTED,
  SEARCH_INDEX_MANAGEMENT,
} from '@kbn/deeplinks-search';
import { i18n } from '@kbn/i18n';

import type { ClassicNavItem } from './types';

export const BaseClassicNavItems: ClassicNavItem[] = [
  {
    id: 'root',
    items: [
      {
        'data-test-subj': 'searchSideNav-Home',
        deepLink: {
          link: SEARCH_HOMEPAGE,
          shouldShowActiveForSubroutes: true,
        },
        id: 'home',
        name: (
          <EuiText size="s">
            {i18n.translate('xpack.searchNavigation.classicNav.homeTitle', {
              defaultMessage: 'Home',
            })}
          </EuiText>
        ),
      },
      {
        'data-test-subj': 'searchSideNav-GettingStarted',
        deepLink: {
          link: SEARCH_GETTING_STARTED,
          shouldShowActiveForSubroutes: true,
        },
        id: 'gettingStarted',
        name: (
          <EuiText size="s">
            {i18n.translate('xpack.searchNavigation.classicNav.gettingStartedTitle', {
              defaultMessage: 'Getting started',
            })}
          </EuiText>
        ),
      },
    ],
  },
  {
    'data-test-subj': 'searchSideNav-Alerts',
    id: 'alerts',
    items: [
      {
        'data-test-subj': 'searchSideNav-Inbox',
        deepLink: {
          link: 'alertingV2:episodes',
          shouldShowActiveForSubroutes: true,
        },
        id: 'alerts-inbox',
        name: i18n.translate('xpack.searchNavigation.classicNav.alerts.inbox', {
          defaultMessage: 'Inbox',
        }),
      },
      {
        'data-test-subj': 'searchSideNav-RulesV1',
        deepLink: {
          link: 'management:triggersActions',
          shouldShowActiveForSubroutes: true,
        },
        id: 'alerts-rules-v1',
        name: i18n.translate('xpack.searchNavigation.classicNav.alerts.rulesV1', {
          defaultMessage: 'Rules V1',
        }),
      },
      {
        'data-test-subj': 'searchSideNav-RulesV2',
        deepLink: {
          link: 'alertingV2:rules',
          shouldShowActiveForSubroutes: true,
        },
        id: 'alerts-rules-v2',
        name: i18n.translate('xpack.searchNavigation.classicNav.alerts.rulesV2', {
          defaultMessage: 'Rules V2',
        }),
      },
      {
        'data-test-subj': 'searchSideNav-RuleLibrary',
        deepLink: {
          link: 'alertingV2:rule_library',
          shouldShowActiveForSubroutes: true,
        },
        id: 'alerts-rule-library',
        name: i18n.translate('xpack.searchNavigation.classicNav.alerts.ruleLibrary', {
          defaultMessage: 'Rule library',
        }),
      },
      {
        'data-test-subj': 'searchSideNav-ActionPolicies',
        deepLink: {
          link: 'alertingV2:action_policies',
          shouldShowActiveForSubroutes: true,
        },
        id: 'alerts-action-policies',
        name: i18n.translate('xpack.searchNavigation.classicNav.alerts.actionPolicies', {
          defaultMessage: 'Action policies',
        }),
      },
      {
        'data-test-subj': 'searchSideNav-ExecutionHistory',
        deepLink: {
          link: 'alertingV2:execution_history',
          shouldShowActiveForSubroutes: true,
        },
        id: 'alerts-execution-history',
        name: i18n.translate('xpack.searchNavigation.classicNav.alerts.executionHistory', {
          defaultMessage: 'Execution history',
        }),
      },
      {
        'data-test-subj': 'searchSideNav-MaintenanceWindows',
        deepLink: {
          link: 'management:maintenanceWindows',
          shouldShowActiveForSubroutes: true,
        },
        id: 'alerts-maintenance-windows',
        name: i18n.translate('xpack.searchNavigation.classicNav.alerts.maintenanceWindows', {
          defaultMessage: 'Maintenance windows',
        }),
      },
    ],
    name: i18n.translate('xpack.searchNavigation.classicNav.alertsTitle', {
      defaultMessage: 'Alerts',
    }),
  },
  {
    'data-test-subj': 'searchSideNav-Build',
    id: 'build',
    items: [
      {
        'data-test-subj': 'searchSideNav-Indices',
        deepLink: {
          link: SEARCH_INDEX_MANAGEMENT,
          shouldShowActiveForSubroutes: true,
        },
        id: 'index_management',
      },
      {
        'data-test-subj': 'searchSideNav-Playground',
        deepLink: {
          link: 'searchPlayground',
          shouldShowActiveForSubroutes: true,
        },
        id: 'playground',
      },
      {
        'data-test-subj': 'searchSideNav-SearchApplications',
        deepLink: {
          link: 'enterpriseSearchApplications:searchApplications',
        },
        id: 'searchApplications',
      },
      {
        'data-test-subj': 'searchSideNav-Agents',
        deepLink: {
          link: 'agent_builder',
        },
        id: 'agent_builder',
      },
      {
        'data-test-subj': 'searchSideNav-Context',
        deepLink: {
          link: 'context_engine',
          shouldShowActiveForSubroutes: true,
        },
        id: 'context_engine',
      },
    ],
    name: i18n.translate('xpack.searchNavigation.classicNav.applicationsTitle', {
      defaultMessage: 'Build',
    }),
  },
  {
    'data-test-subj': 'searchSideNav-Relevance',
    id: 'relevance',
    items: [
      {
        'data-test-subj': 'searchSideNav-Synonyms',
        deepLink: {
          link: 'searchSynonyms:synonyms',
          shouldShowActiveForSubroutes: true,
        },
        id: 'synonyms',
      },
      {
        'data-test-subj': 'searchSideNav-QueryRules',
        deepLink: {
          link: 'searchQueryRules',
          shouldShowActiveForSubroutes: true,
        },
        id: 'searchQueryRules',
      },
    ],
    name: i18n.translate('xpack.searchNavigation.classicNav.relevanceTitle', {
      defaultMessage: 'Relevance',
    }),
  },
];
