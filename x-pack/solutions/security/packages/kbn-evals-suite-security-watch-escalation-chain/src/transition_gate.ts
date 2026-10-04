/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLOOR_ESCALATION_POLICY } from './constants';

/**
 * The Floor worker's verdict, as declared by its structured-output contract
 * (`with.schema` in the managed definition
 * `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/
 * floor_alert_triage.yaml`).
 */
export interface FloorVerdict {
  classification: string;
  confidence: number;
}

export interface FloorEscalationPolicy {
  escalateThreshold: number;
  escalateTo: string;
  triggeringClassification: string;
}

/**
 * The Floor -> Dark hop predicate: fires iff the Floor verdict classifies
 * `true_positive` AND its confidence clears `escalateThreshold`.
 *
 * Lives here (not inside the spec) so the L0 test exercises the predicate the
 * chain actually depends on, and so the policy it reads is a production
 * constant rather than a value restated next to the assertions.
 */
export const shouldEscalateToDark = (
  workerRun: FloorVerdict,
  policy: FloorEscalationPolicy = FLOOR_ESCALATION_POLICY
): boolean =>
  workerRun.classification === policy.triggeringClassification &&
  workerRun.confidence >= policy.escalateThreshold;
