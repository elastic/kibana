/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Test IDs and UI-text constants for the "Take action" menu in the document flyout.
 *
 * NOTE: The "Mark as closed" menu item test ID is ALERT_CLOSE_MENU_ITEM_TEST_SUBJ
 * in alert_workflows.ts. Closing reason labels live in ClosingReasonOption there too.
 */

/* Status-change items */

/** data-test-subj for the "Open alert" Take Action menu item. */
export const OPEN_ALERT_STATUS_TEST_SUBJ = 'open-alert-status' as const;

/** data-test-subj for the "Mark as acknowledged" Take Action menu item. */
export const ACKNOWLEDGED_ALERT_STATUS_TEST_SUBJ = 'acknowledged-alert-status' as const;

/* Case items */

/** data-test-subj for the "Add to new case" Take Action menu item. */
export const ADD_TO_NEW_CASE_TEST_SUBJ = 'add-to-new-case-action' as const;

/** data-test-subj for the "Add to existing case" Take Action menu item. */
export const ADD_TO_EXISTING_CASE_TEST_SUBJ = 'add-to-existing-case-action' as const;

/** Title text shown in the case creation dialog. */
export const CREATE_CASE_DIALOG_TITLE = 'Create case' as const;

/** data-test-subj for the "Add to existing case" case-selector modal. */
export const ALL_CASES_MODAL_TEST_SUBJ = 'all-cases-modal' as const;

/* Alert tags */

/** data-test-subj for the "Apply alert tags" Take Action menu item. */
export const ALERT_TAGS_MENU_ITEM_TEST_SUBJ = 'alert-tags-context-menu-item' as const;

/** data-test-subj for the tag-selection list inside the alert tags sub-panel. */
export const ALERT_TAGS_SELECTABLE_TEST_SUBJ = 'alert-tags-selectable-menu' as const;

/* Alert assignees */

/** data-test-subj for the "Assign alert" Take Action menu item. */
export const ALERT_ASSIGNEES_MENU_ITEM_TEST_SUBJ = 'alert-assignees-context-menu-item' as const;

/** data-test-subj for the user-selection list inside the assignees sub-panel. */
export const ALERT_ASSIGNEES_SELECTABLE_TEST_SUBJ = 'alert-assignees-selectable-menu' as const;

/* Run workflow */

/** data-test-subj for the "Run workflow" Take Action menu item (alert variant). */
export const RUN_ALERT_WORKFLOW_MENU_ITEM_TEST_SUBJ = 'run-workflow-action' as const;

/** data-test-subj for the workflow picker sub-panel opened by the Run workflow item. */
export const ALERT_WORKFLOW_PANEL_TEST_SUBJ = 'alert-workflow-context-menu-panel' as const;

/* Host isolation */

/** data-test-subj for the "Isolate host" / "Release host" Take Action menu item. */
export const ISOLATE_HOST_MENU_ITEM_TEST_SUBJ = 'isolate-host-action-item' as const;

/* Investigate in Timeline */

/** data-test-subj for the "Investigate in Timeline" Take Action menu item. */
export const INVESTIGATE_IN_TIMELINE_MENU_ITEM_TEST_SUBJ =
  'investigate-in-timeline-action-item' as const;

/** data-test-subj for the Timeline modal header panel (confirms the modal is fully open). */
export const TIMELINE_MODAL_HEADER_PANEL_TEST_SUBJ = 'timeline-modal-header-panel' as const;

/** data-test-subj for a data-provider badge rendered inside the open Timeline modal. */
export const TIMELINE_PROVIDER_BADGE_TEST_SUBJ = 'providerBadge' as const;

/* Notes tool */

/** data-test-subj for the notes tool overlay content opened via the notes header button. */
export const NOTES_TOOL_CONTENT_TEST_SUBJ = 'securitySolutionFlyoutNotesTabContent' as const;
