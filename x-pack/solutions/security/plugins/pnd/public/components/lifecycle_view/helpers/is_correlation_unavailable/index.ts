/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndPhaseStepProjection } from '@kbn/pnd-common';

/**
 * Whether the execution projection failed to find **any** orchestrator run for the discovery.
 *
 * Correlation is retrieve-then-filter over the most recent executions of the correlated workflows —
 * a merged, newest-first cap with no time bounds — so an older discovery drops off it entirely and
 * the route answers `200` with a skeleton in which not one row names a run. Rendering that skeleton
 * would say "nothing has happened yet" when the truth is "we could not find out", so the view shows
 * the distinct "could not correlate" state instead.
 *
 * Derived from the rows rather than from a response flag, deliberately: the response has no such
 * flag, and this also covers a response that carries no rows at all, whichever way the projection
 * chooses to report the miss.
 *
 * Known imprecision, accepted: a run that has genuinely just started, before its first step
 * execution is indexed, looks the same. The window is roughly one step, the state offers a retry,
 * and its copy says the lifecycle is unknown rather than unstarted.
 */
export const isCorrelationUnavailable = (steps: readonly PndPhaseStepProjection[]): boolean =>
  steps.length === 0 || steps.every(({ workflowRunId }) => !workflowRunId);
