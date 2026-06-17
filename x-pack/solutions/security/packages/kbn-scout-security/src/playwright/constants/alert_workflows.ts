/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** API path for the alerts workflow status endpoint. */
export const SIGNALS_STATUS_API_PATH = '/api/detection_engine/signals/status';

/** API path for the alert assignees endpoint. */
export const ALERT_ASSIGNEES_API_PATH = '/api/detection_engine/signals/assignees';

/** Kibana internal endpoint that returns the currently authenticated user's profile. */
export const CURRENT_USER_PROFILE_API_PATH = '/internal/security/me';

/**
 * data-test-subj for the "Filter for" cell-action button that appears when hovering
 * the status badge (or any cell-actions-enabled field) in the document flyout.
 * Composed of: SECURITY_CELL_ACTIONS_DEFAULT trigger id + 'filterIn' action name.
 */
export const STATUS_FILTER_IN_BUTTON_TEST_SUBJ = 'actionItem-security-default-cellActions-filterIn';

/**
 * The word token present in the filter chip's data-test-subj when a workflow-status
 * filter has been applied.  Use with the `~` prefix in testSubj.locator to perform
 * a CSS whitespace-separated word match:
 *   page.testSubj.locator(`~${WORKFLOW_STATUS_FILTER_KEY_TEST_SUBJ}`)
 */
export const WORKFLOW_STATUS_FILTER_KEY_TEST_SUBJ = 'filter-key-kibana.alert.workflow_status';

/** Workflow status values for security alerts. */
export const AlertWorkflowStatus = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  CLOSED: 'closed',
} as const;

/** data-test-subj for the "Mark as closed" context-menu item inside the status popover. */
export const ALERT_CLOSE_MENU_ITEM_TEST_SUBJ = 'alert-close-context-menu-item';

/** Built-in closing reason options (label shown in the UI + key sent to the API). */
export const ClosingReasonOption = {
  CLOSE_WITHOUT_REASON: { label: 'Close without reason', key: undefined },
  DUPLICATE: { label: 'Duplicate', key: 'duplicate' },
  FALSE_POSITIVE: { label: 'False Positive', key: 'false_positive' },
  TRUE_POSITIVE: { label: 'True positive', key: 'true_positive' },
  BENIGN_POSITIVE: { label: 'Benign positive', key: 'benign_positive' },
  OTHER: { label: 'Other', key: 'other' },
} as const;

/** Returns the success toast message produced when n alerts are closed. */
export const closedAlertsToastText = (count: number): string =>
  `Successfully closed ${count} ${count === 1 ? 'alert' : 'alerts'}.`;

/**
 * data-test-subj for the "Add to Timeline" cell-action button that appears when hovering
 * a cell-actions-enabled field in the document flyout.
 */
export const STATUS_ADD_TO_TIMELINE_BUTTON_TEST_SUBJ =
  'actionItem-security-default-cellActions-addToTimeline';

/** Returns the success toast title produced when a value is added to Timeline. */
export const addedToTimelineToastText = (value: string): string => `Added ${value} to Timeline`;
