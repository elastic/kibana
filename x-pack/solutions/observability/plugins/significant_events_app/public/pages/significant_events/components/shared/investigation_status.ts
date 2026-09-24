/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignificantEvent,
  SignificantEventInvestigation,
} from '@kbn/significant-events-schema';

/**
 * Returns true while an investigation run is in flight according to the significant-event doc.
 * The doc only records that a run happened and when — an entry is running until the workflow's
 * terminal step (or the orphan reconciliation) stamps `completed_at`.
 */
export const isInvestigationRunning = (investigation: SignificantEventInvestigation): boolean =>
  investigation.completed_at == null;

/** Returns true when the event has at least one investigation currently in flight. */
export const hasRunningInvestigation = (event: SignificantEvent): boolean =>
  event.investigations?.some(isInvestigationRunning) ?? false;
