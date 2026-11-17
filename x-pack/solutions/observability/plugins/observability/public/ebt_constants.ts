/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** EBT click actions specific to this plugin; shared ones live in `@kbn/ebt-click`. */
export const OBSERVABILITY_EBT_CLICK_ACTIONS = {
  /** User intends to change the daily investigation limits after reaching one. */
  CHANGE_INVESTIGATION_LIMITS: 'changeInvestigationLimits',
} as const;

export const OBSERVABILITY_EBT_ELEMENTS = {
  INVESTIGATION_START_FAILURE_TOAST: 'investigationStartFailureToast',
} as const;
