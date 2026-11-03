/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpOutcome } from '../constants';
import type { WorkerModeSeedPlan } from './plan';

export interface WorkerModeManifest {
  readonly space: string;
  readonly exampleId: string;
  readonly scenarioKey: string;
  readonly expectedOutcome: FpTpOutcome;
  readonly runMarker: string;
  readonly seededAt: string;
  readonly lastAlertAt: string;
  readonly firstEventAt?: string;
  readonly windowDeadline: string;
  readonly alertIds: readonly string[];
  readonly events: ReadonlyArray<{ index: string; id: string }>;
  readonly entityIds: readonly string[];
  readonly hostIds: readonly string[];
}

/** What the script writes to its manifest file. */
export const toWorkerModeManifest = (plan: WorkerModeSeedPlan): WorkerModeManifest => ({
  space: plan.space,
  exampleId: plan.exampleId,
  scenarioKey: plan.scenarioKey,
  expectedOutcome: plan.expectedOutcome,
  runMarker: plan.runMarker,
  seededAt: plan.seededAt,
  lastAlertAt: plan.lastAlertAt,
  ...(plan.firstEventAt === undefined ? {} : { firstEventAt: plan.firstEventAt }),
  windowDeadline: plan.windowDeadline,
  alertIds: plan.alertIds,
  events: plan.events,
  entityIds: plan.entities.map(({ entityId }) => entityId),
  hostIds: plan.hostIds,
});
