/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReportWorkerOutcomeEvent } from '../../../common/step_types';
import { REPORTABLE_WORKER_EVENTS } from '../../../common/step_types';
import { ANY_CATALOG_WORKER } from '../../../common/telemetry/report_step_input_fields';

/**
 * Whether a run rooted at `rootWorkerId` (already verified to be a catalogued Worker) may report
 * `event`. A Worker's own events come only from its own run, so one Worker's YAML cannot report
 * another Worker's outcome.
 */
export const isEventFromItsWorker = (
  event: ReportWorkerOutcomeEvent,
  rootWorkerId: string | null | undefined
): boolean => {
  const { workerId } = REPORTABLE_WORKER_EVENTS[event];
  return workerId === ANY_CATALOG_WORKER || workerId === rootWorkerId;
};
