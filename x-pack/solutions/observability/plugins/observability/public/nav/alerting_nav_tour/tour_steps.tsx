/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { EuiTourStepProps } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { hasAlertingV2Capability } from '@kbn/alerting-v2-utils';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '@kbn/deeplinks-observability';
import {
  canReadMaintenanceWindows,
  canReadV1Alerts,
  canReadV1Rules,
} from '../get_alerts_nav_panel';

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

/**
 * Tour steps the current user can reach. Each gate mirrors what renders the step's anchor
 * (Alerting side-nav panel, Rules page tabs, Create rule button) so no step targets a hidden page.
 */
export const getAlertingNavTourSteps = (core: CoreStart): AlertingNavTourStep[] => {
  const canReadV2Rules = hasAlertingV2Capability(core, 'rules');
  const canReadClassicRules = canReadV1Rules(core);
  const rulesPath = canReadV2Rules
    ? OBSERVABILITY_ALERTING_RULES_V2_PATH
    : OBSERVABILITY_ALERTING_RULES_V1_PATH;
  const rulesDeepLinkId = canReadV2Rules ? 'rules-v2' : 'rules-v1';

  const steps: Array<AlertingNavTourStep & { isAvailable: boolean }> = [
    {
      isAvailable: hasAlertingV2Capability(core, 'alerts') || canReadV1Alerts(core),
      stepId: 'alerts',
      title: i18n.translate('xpack.observability.alertingNavTour.steps.alertsTitle', {
        defaultMessage: 'New alerts experience',
      }),
      content: wrap(
        i18n.translate('xpack.observability.alertingNavTour.steps.alertsDescription', {
          defaultMessage: 'Triage Universal, Classic, and external alerts in one list.',
        })
      ),
      anchor: navAnchor('observabilityAlerting:alerts'),
      anchorPosition: 'rightCenter',
      appId: OBSERVABILITY_ALERTING_APP_ID,
      path: OBSERVABILITY_ALERTING_ALERTS_PATH,
    },
    {
      isAvailable: canReadV2Rules || canReadClassicRules,
      stepId: 'rules',
      title: i18n.translate('xpack.observability.alertingNavTour.steps.rulesTitle', {
        defaultMessage: 'Rules',
      }),
      content: wrap(
        i18n.translate('xpack.observability.alertingNavTour.steps.rulesDescription', {
          defaultMessage: 'Create and manage all your alerting rules from this page.',
        })
      ),
      anchor: navAnchor(`${OBSERVABILITY_ALERTING_APP_ID}:${rulesDeepLinkId}`),
      anchorPosition: 'rightCenter',
      appId: OBSERVABILITY_ALERTING_APP_ID,
      path: rulesPath,
    },
    {
      // Universal/Classic tabs render only when both rule surfaces are visible.
      isAvailable: canReadV2Rules && canReadClassicRules,
      stepId: 'rulesTabs',
      title: i18n.translate('xpack.observability.alertingNavTour.steps.rulesTabsTitle', {
        defaultMessage: 'Universal and Classic rules',
      }),
      content: wrap(
        i18n.translate('xpack.observability.alertingNavTour.steps.rulesTabsDescription', {
          defaultMessage:
            'Switch between Universal and Classic rule management from one Rules page.',
        })
      ),
      anchor: '[data-test-subj="v2RulesTab"]',
      anchorPosition: 'downLeft',
      appId: OBSERVABILITY_ALERTING_APP_ID,
      path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
    },
    {
      isAvailable: hasAlertingV2Capability(core, 'actionPolicies'),
      stepId: 'actionPolicies',
      title: i18n.translate('xpack.observability.alertingNavTour.steps.actionPoliciesTitle', {
        defaultMessage: 'Action policies',
      }),
      content: wrap(
        i18n.translate('xpack.observability.alertingNavTour.steps.actionPoliciesDescription', {
          defaultMessage:
            'Decide when alerts from Universal rules are sent, and reuse a policy across those rules. Classic rules keep actions on the rule.',
        })
      ),
      anchor: navAnchor('observabilityAlerting:action-policies'),
      anchorPosition: 'rightCenter',
      appId: OBSERVABILITY_ALERTING_APP_ID,
      path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
    },
    {
      isAvailable: canReadMaintenanceWindows(core),
      stepId: 'maintenanceWindows',
      title: i18n.translate('xpack.observability.alertingNavTour.steps.maintenanceWindowsTitle', {
        defaultMessage: 'Maintenance windows',
      }),
      content: wrap(
        i18n.translate('xpack.observability.alertingNavTour.steps.maintenanceWindowsDescription', {
          defaultMessage:
            'Schedule a quiet period that applies to both Universal and Classic alerts.',
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
      isAvailable: hasAlertingV2Capability(core, 'executionHistory'),
      stepId: 'executionHistory',
      title: i18n.translate('xpack.observability.alertingNavTour.steps.executionHistoryTitle', {
        defaultMessage: 'Execution history',
      }),
      content: wrap(
        i18n.translate('xpack.observability.alertingNavTour.steps.executionHistoryDescription', {
          defaultMessage:
            'Review recent Universal rule runs and outcomes. Classic rules keep their existing logs.',
        })
      ),
      anchor: navAnchor('observabilityAlerting:execution-history'),
      anchorPosition: 'rightCenter',
      appId: OBSERVABILITY_ALERTING_APP_ID,
      path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
    },
    {
      // Both create anchors render only for users who can write Universal rules.
      isAvailable: hasAlertingV2Capability(core, 'rules', 'all'),
      stepId: 'createFirstRule',
      title: i18n.translate('xpack.observability.alertingNavTour.steps.createFirstRuleTitle', {
        defaultMessage: 'Try it out',
      }),
      content: wrap(
        i18n.translate('xpack.observability.alertingNavTour.steps.createFirstRuleDescription', {
          defaultMessage:
            'You’re ready to go. Create a Universal rule to get started with Universal Alerting.',
        })
      ),
      // Header Create rule is hidden when empty; fall back to the empty-state heading (not a card —
      // EuiTourStep wrapping shrinks full-width cards).
      anchor:
        '[data-test-subj="createRuleButton"], [data-test-subj="ruleCreateOptionsEmptyStateTitle"]',
      anchorPosition: 'downCenter',
      appId: OBSERVABILITY_ALERTING_APP_ID,
      path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
    },
  ];

  return steps.filter(({ isAvailable }) => isAvailable).map(({ isAvailable, ...step }) => step);
};
