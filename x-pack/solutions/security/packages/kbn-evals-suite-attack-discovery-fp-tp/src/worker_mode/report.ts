/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpOutcome } from '../constants';
import type { WorkerModeSeedPlan } from './plan';
import type { GeneratedAttack, ReviewProgress } from './trigger';

export type WorkerModeResultStatus = 'PASS' | 'FAIL' | 'PENDING';

export interface WorkerModeAttackResult {
  readonly attackId: string;
  readonly title: string;
  readonly investigationId: string;
  readonly reviewExecutionId?: string;
  /** Unset while the review has not resolved its analysis. */
  readonly verdict?: string;
  readonly expectedOutcome: FpTpOutcome;
  readonly status: WorkerModeResultStatus;
}

export interface WorkerModeTriggerResult {
  readonly floorWorkflowId: string;
  readonly floorExecutionId: string;
  readonly floorStatus: string;
  readonly generatedAt: string;
  /** Empty when the Worker generated no attack from the seeded alerts. */
  readonly attacks: readonly WorkerModeAttackResult[];
  /** Batch errors of the generation run, read when it produced no attack. */
  readonly generationErrors?: readonly string[];
}

/** Grades each generated attack's review against the seeded example's gold. */
export const toWorkerModeAttackResults = (
  attacks: readonly GeneratedAttack[],
  reviews: readonly ReviewProgress[],
  expectedOutcome: FpTpOutcome
): WorkerModeAttackResult[] =>
  attacks.map(({ attackId, title }) => {
    const review = reviews.find((candidate) => candidate.attackId === attackId);
    const verdict = review?.verdict;
    return {
      attackId,
      title,
      investigationId: review?.investigationId ?? '',
      reviewExecutionId: review?.reviewExecutionId,
      verdict,
      expectedOutcome,
      status: verdict === undefined ? 'PENDING' : verdict === expectedOutcome ? 'PASS' : 'FAIL',
    };
  });

/** The lines the script prints for a triggered run. */
export const formatWorkerModeReport = (
  plan: Pick<WorkerModeSeedPlan, 'exampleId' | 'expectedOutcome'>,
  result: WorkerModeTriggerResult
): string[] => {
  const header = `Floor run ${result.floorExecutionId} ended ${result.floorStatus} (example ${plan.exampleId}, expected ${plan.expectedOutcome})`;
  if (result.attacks.length === 0) {
    const errors = result.generationErrors ?? [];
    return [
      header,
      `NO ATTACK GENERATED: the Worker produced no attack citing the seeded alerts. ${
        errors.length > 0
          ? `Generation batch errors: ${[...new Set(errors)].join('; ')}`
          : 'Generation reported no batch error; check the floor run and its children in the Workflows UI.'
      }`,
    ];
  }
  return [
    header,
    ...result.attacks.map(
      ({ attackId, investigationId, verdict, expectedOutcome, status, reviewExecutionId }) =>
        `${status}  attack ${attackId}  investigation ${investigationId}  verdict ${
          verdict ?? '(not resolved)'
        }  expected ${expectedOutcome}  review ${reviewExecutionId ?? '(not found)'}`
    ),
  ];
};

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
  readonly trigger?: WorkerModeTriggerResult;
}

/** What the script writes to its manifest file. */
export const toWorkerModeManifest = (
  plan: WorkerModeSeedPlan,
  trigger?: WorkerModeTriggerResult
): WorkerModeManifest => ({
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
  ...(trigger === undefined ? {} : { trigger }),
});
