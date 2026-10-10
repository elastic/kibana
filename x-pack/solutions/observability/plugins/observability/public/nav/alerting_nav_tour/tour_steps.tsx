/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { EuiTourStepProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '@kbn/deeplinks-observability';

export type AlertingNavTourStepId =
  | 'alerts'
  | 'rules'
  | 'rulesTabs'
  | 'actionPolicies'
  | 'executionHistory'
  | 'maintenanceWindows'
  | 'createFirstRule';

export interface AlertingNavTourStep {
  stepId: AlertingNavTourStepId;
  title: string;
  content: React.ReactNode;
  anchor: string;
  anchorPosition: EuiTourStepProps['anchorPosition'];
  appId?: string;
  path?: string;
  deepLinkId?: string;
}

const wrap = (text: string) => (
  <EuiText size="s">
    <p>{text}</p>
  </EuiText>
);

const navAnchor = (deepLinkId: string) => `[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`;

export const getAlertingNavTourSteps = (): AlertingNavTourStep[] => [
  {
    stepId: 'alerts',
    title: i18n.translate('xpack.observability.alertingNavTour.steps.alerts.title', {
      defaultMessage: 'New alerts experience',
    }),
    content: wrap(
      i18n.translate('xpack.observability.alertingNavTour.steps.alerts.description', {
        defaultMessage:
          'Triage Universal, Classic, and external alerts together in one inbox so you can investigate from a single place.',
      })
    ),
    anchor: navAnchor('observabilityAlerting:alerts'),
    anchorPosition: 'rightCenter',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_ALERTS_PATH,
  },
  {
    stepId: 'rules',
    title: i18n.translate('xpack.observability.alertingNavTour.steps.rules.title', {
      defaultMessage: 'Rules',
    }),
    content: wrap(
      i18n.translate('xpack.observability.alertingNavTour.steps.rules.description', {
        defaultMessage: 'Create, edit, and manage your alerting rules from one place.',
      })
    ),
    anchor:
      '[data-test-subj~="nav-item-deepLinkId-observabilityAlerting:rules"], [data-test-subj~="nav-item-deepLinkId-observabilityAlerting:rules-v2"]',
    anchorPosition: 'rightCenter',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
  },
  {
    stepId: 'rulesTabs',
    title: i18n.translate('xpack.observability.alertingNavTour.steps.rulesTabs.title', {
      defaultMessage: 'Universal and Classic rules',
    }),
    content: wrap(
      i18n.translate('xpack.observability.alertingNavTour.steps.rulesTabs.description', {
        defaultMessage:
          'Use these tabs to switch between Universal and Classic rule management from one Rules page.',
      })
    ),
    anchor: '[data-test-subj="v2RulesTab"]',
    anchorPosition: 'downLeft',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
  },
  {
    stepId: 'actionPolicies',
    title: i18n.translate('xpack.observability.alertingNavTour.steps.actionPolicies.title', {
      defaultMessage: 'Action policies',
    }),
    content: wrap(
      i18n.translate('xpack.observability.alertingNavTour.steps.actionPolicies.description', {
        defaultMessage:
          'Define notifications and suppressions once, then reuse them across Universal rules. Not available for Classic alerting.',
      })
    ),
    anchor: navAnchor('observabilityAlerting:action-policies'),
    anchorPosition: 'rightCenter',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  },
  {
    stepId: 'maintenanceWindows',
    title: i18n.translate('xpack.observability.alertingNavTour.steps.maintenanceWindows.title', {
      defaultMessage: 'Maintenance windows',
    }),
    content: wrap(
      i18n.translate('xpack.observability.alertingNavTour.steps.maintenanceWindows.description', {
        defaultMessage:
          'Schedule quiet periods that work across both Universal and Classic alerting, so suppressions stay consistent for both systems.',
      })
    ),
    // Prefer the Alerting side-nav item; fall back to page content when the panel is closed.
    // Do not use mw-create-button — EuiWrappingPopover relocates AppMenu nodes and crashes the header.
    anchor:
      '[data-test-subj~="nav-item-id-management:maintenanceWindows"], [data-test-subj="maintenance-windows-table"], [data-test-subj="mw-empty-prompt"], [data-test-subj="mw-license-prompt"], [data-test-subj="license-prompt-title"]',
    anchorPosition: 'rightCenter',
    appId: 'management',
    path: '/insightsAndAlerting/maintenanceWindows',
  },
  {
    stepId: 'executionHistory',
    title: i18n.translate('xpack.observability.alertingNavTour.steps.executionHistory.title', {
      defaultMessage: 'Execution history',
    }),
    content: wrap(
      i18n.translate('xpack.observability.alertingNavTour.steps.executionHistory.description', {
        defaultMessage:
          'Review recent Universal rule runs and outcomes. This feature is not available for Kibana Classic alerting.',
      })
    ),
    anchor: navAnchor('observabilityAlerting:execution-history'),
    anchorPosition: 'rightCenter',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  },
  {
    stepId: 'createFirstRule',
    title: i18n.translate('xpack.observability.alertingNavTour.steps.createFirstRule.title', {
      defaultMessage: 'Try it out',
    }),
    content: wrap(
      i18n.translate('xpack.observability.alertingNavTour.steps.createFirstRule.description', {
        defaultMessage:
          'You’re ready to go. Create a new rule to get started with Universal Alerting.',
      })
    ),
    // Header Create rule is hidden when empty; fall back to the empty-state heading (not a card —
    // EuiTourStep wrapping shrinks full-width cards).
    anchor: '[data-test-subj="createRuleButton"], [data-test-subj="ruleCreateOptionsPanel"] h2',
    anchorPosition: 'downCenter',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
  },
];
