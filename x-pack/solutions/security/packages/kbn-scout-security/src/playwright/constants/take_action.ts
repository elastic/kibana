/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Test IDs for the "Take action" menu items in the document flyout.
 *
 * NOTE: The "Mark as closed" menu item test ID is ALERT_CLOSE_MENU_ITEM_TEST_SUBJ
 * in alert_workflows.ts. Closing reason labels live in ClosingReasonOption there too.
 */

/** data-test-subj for the "Investigate in Timeline" Take Action menu item. */
export const INVESTIGATE_IN_TIMELINE_MENU_ITEM_TEST_SUBJ =
  'investigate-in-timeline-action-item' as const;
