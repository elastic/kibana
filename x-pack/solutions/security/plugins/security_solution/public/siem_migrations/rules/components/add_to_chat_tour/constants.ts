/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../../../common/constants';

export const ADD_TO_CHAT_TOUR_STORAGE_KEY =
  NEW_FEATURES_TOUR_STORAGE_KEYS.SIEM_MIGRATIONS_RULES_ADD_TO_CHAT_TOUR;
export const ADD_TO_CHAT_TOUR_TEST_ID = 'siemMigrationsAddToChatTour';
export const ADD_TO_CHAT_TOUR_POPOVER_WIDTH = 360;
export const ADD_TO_CHAT_TOUR_STEPS_TOTAL = 3;
/**
 * The flyout step mounts after the rule details flyout finishes sliding in; EuiPopover measures
 * its target once on mount. Same delay as the trace waterfall tour step inside the doc viewer flyout.
 */
export const ADD_TO_CHAT_TOUR_FLYOUT_STEP_DELAY_MS = 500;

export type AddToChatTourStepNumber = 1 | 2 | 3;

export interface AddToChatTourState {
  isTourActive: boolean;
  currentTourStep: AddToChatTourStepNumber;
}

export const DEFAULT_ADD_TO_CHAT_TOUR_STATE: AddToChatTourState = {
  isTourActive: true,
  currentTourStep: 1,
};

const ENABLED_ADD_TO_CHAT_BUTTON = '[data-test-subj="newAgentBuilderAttachment"]:not(:disabled)';

/** CSS selectors of the elements each tour step points at. */
export const ADD_TO_CHAT_TOUR_ANCHORS = {
  bulkButton: `[data-test-subj="migrationsBulkActions"] ${ENABLED_ADD_TO_CHAT_BUTTON}`,
  ruleName: (ruleId: string) => `[data-rule-id="${ruleId}"] [data-test-subj="ruleName"]`,
  flyoutButton: `[data-test-subj="ruleMigrationDetailsFlyout"] ${ENABLED_ADD_TO_CHAT_BUTTON}`,
} as const;
