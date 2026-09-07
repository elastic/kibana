/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowConfiguration } from '../../types';

/**
 * Returns true when the alert retrieval workflows toggle is the *sole* enabled
 * retrieval source but no workflow has been selected, i.e. the configuration
 * has no possible source of alerts.
 *
 * This is the form-side mirror of the run-time, fail-closed
 * `validateRetrievalResults` guard: when the skill and default retrieval are
 * both disabled and the alert retrieval workflows selection is empty, the run
 * would start and then fail with "No alert retrieval results". Detecting it here
 * lets the form cancel a `Save` / `Save and run` attempt and surface a
 * troubleshootable error state instead.
 *
 * It intentionally returns false when the skill or default retrieval toggle is
 * also enabled, because those toggles still provide a valid source of alerts.
 */
export const hasEmptyRequiredRetrievalWorkflows = ({
  alertRetrievalWorkflowIds,
  alertRetrievalWorkflowsEnabled,
  defaultRetrievalEnabled,
  skillEnabled,
}: WorkflowConfiguration): boolean =>
  alertRetrievalWorkflowsEnabled &&
  !skillEnabled &&
  !defaultRetrievalEnabled &&
  alertRetrievalWorkflowIds.length === 0;
