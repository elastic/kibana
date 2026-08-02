/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The query param `buildRunDeepLink` appends when it can name a single step execution. */
const STEP_EXECUTION_ID_PARAM = 'stepExecutionId';

/**
 * Whether a run's `deepLinkPath` selects a **step** rather than a whole execution.
 *
 * The server builds `/{workflowId}?tab=executions&executionId={runId}` and appends
 * `&stepExecutionId=…` only when the run is parked at exactly one pending HITL
 * gate — with none or several, picking one would be arbitrary. So the two links
 * are genuinely different affordances ("open the waiting step" versus "open the
 * run") and the row has to say which one it is offering.
 *
 * Read off the path itself rather than inferred from `pendingGateCount`: the two
 * cannot disagree today (the count is the length of the step-id list the link is
 * built from), and reading the link is direct evidence rather than a second
 * derivation of the same fact.
 */
export const isStepLevelDeepLink = (deepLinkPath: string | null | undefined): boolean => {
  if (!deepLinkPath) {
    return false;
  }

  const [, query] = deepLinkPath.split('?');

  if (query == null) {
    return false;
  }

  const value = new URLSearchParams(query).get(STEP_EXECUTION_ID_PARAM);

  return value != null && value !== '';
};
