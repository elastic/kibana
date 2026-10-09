/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { EuiTourStepProps } from '@elastic/eui';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '@kbn/deeplinks-observability';
import * as i18n from './translations';

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
  /** App id to navigate to before showing this step. Omit to stay on the current page. */
  appId?: string;
  /** Path within `appId` (leading slash). */
  path?: string;
  /** Optional management (or other) deep link id for `navigateToApp`. */
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
    title: i18n.STEP_ALERTS_TITLE,
    content: wrap(i18n.STEP_ALERTS_DESCRIPTION),
    anchor: navAnchor('observabilityAlerting:alerts'),
    anchorPosition: 'rightCenter',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_ALERTS_PATH,
  },
  {
    stepId: 'rules',
    title: i18n.STEP_RULES_TITLE,
    content: wrap(i18n.STEP_RULES_DESCRIPTION),
    anchor:
      '[data-test-subj~="nav-item-deepLinkId-observabilityAlerting:rules"], [data-test-subj~="nav-item-deepLinkId-observabilityAlerting:rules-v2"]',
    anchorPosition: 'rightCenter',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
  },
  {
    stepId: 'rulesTabs',
    title: i18n.STEP_RULES_TABS_TITLE,
    content: wrap(i18n.STEP_RULES_TABS_DESCRIPTION),
    // Anchor to the Universal tab so the popover sits under the tab row instead of covering it.
    anchor: '[data-test-subj="v2RulesTab"]',
    anchorPosition: 'downLeft',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
  },
  {
    stepId: 'actionPolicies',
    title: i18n.STEP_ACTION_POLICIES_TITLE,
    content: wrap(i18n.STEP_ACTION_POLICIES_DESCRIPTION),
    anchor: navAnchor('observabilityAlerting:action-policies'),
    anchorPosition: 'rightCenter',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  },
  {
    stepId: 'maintenanceWindows',
    title: i18n.STEP_MAINTENANCE_WINDOWS_TITLE,
    content: wrap(i18n.STEP_MAINTENANCE_WINDOWS_DESCRIPTION),
    // Prefer the Alerting side-nav item (same pattern as Action policies / Execution history).
    // Fall back to page content when the panel is closed. Do not use mw-create-button —
    // EuiWrappingPopover relocates that AppMenu node and crashes the header.
    anchor:
      '[data-test-subj~="nav-item-id-management:maintenanceWindows"], [data-test-subj="maintenance-windows-table"], [data-test-subj="mw-empty-prompt"], [data-test-subj="mw-license-prompt"], [data-test-subj="license-prompt-title"]',
    anchorPosition: 'rightCenter',
    appId: 'management',
    path: '/insightsAndAlerting/maintenanceWindows',
  },
  {
    stepId: 'executionHistory',
    title: i18n.STEP_EXECUTION_HISTORY_TITLE,
    content: wrap(i18n.STEP_EXECUTION_HISTORY_DESCRIPTION),
    anchor: navAnchor('observabilityAlerting:execution-history'),
    anchorPosition: 'rightCenter',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  },
  {
    stepId: 'createFirstRule',
    title: i18n.STEP_CREATE_FIRST_RULE_TITLE,
    content: wrap(i18n.STEP_CREATE_FIRST_RULE_DESCRIPTION),
    // Header Create rule is hidden in the true empty state. Fall back to the empty-state
    // heading — not a create-option card — because EuiTourStep's wrapping popover moves the
    // anchor node and shrinks full-width cards.
    anchor: '[data-test-subj="createRuleButton"], [data-test-subj="ruleCreateOptionsPanel"] h2',
    anchorPosition: 'downCenter',
    appId: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
  },
];
