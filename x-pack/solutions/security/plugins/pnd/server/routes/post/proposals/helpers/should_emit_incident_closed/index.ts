/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_STEP_IDS } from '@kbn/pnd-common';

export interface ShouldEmitIncidentClosedParams {
  decision: string;
  stepId: string;
}

/**
 * Whether a resumed HITL gate should raise `pnd.incidentClosed`.
 *
 * This is the lifecycle **fact** — *an incident closed* — and it stays gated on containment
 * approval. A dismissed containment, a declined investigation, and every other gate are not
 * an incident closing.
 */
export const shouldEmitIncidentClosed = ({
  decision,
  stepId,
}: ShouldEmitIncidentClosedParams): boolean =>
  stepId === PND_GATE_STEP_IDS.awaitIncidentContained && decision === 'approve';
