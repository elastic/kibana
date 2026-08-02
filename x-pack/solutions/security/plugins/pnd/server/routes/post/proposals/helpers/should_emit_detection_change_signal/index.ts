/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_STEP_IDS } from '@kbn/pnd-common';

export interface ShouldEmitDetectionChangeSignalParams {
  decision: string;
  stepId: string;
}

/**
 * Whether a resumed HITL gate should raise `security.detectionChangeSignal`.
 *
 * A coverage gap does not require an incident, so the claim fires at every Floor terminal
 * that carries a human rationale: a dismissal at open-investigation or promote-incident, and
 * either decision at containment. Approving the first two gates is not terminal — the run
 * continues — and the Post-Incident tuning gate is the consumer, never a producer.
 */
export const shouldEmitDetectionChangeSignal = ({
  decision,
  stepId,
}: ShouldEmitDetectionChangeSignalParams): boolean => {
  if (stepId === PND_GATE_STEP_IDS.awaitIncidentContained) {
    return decision === 'approve' || decision === 'dismiss';
  }

  if (decision !== 'dismiss') {
    return false;
  }

  return (
    stepId === PND_GATE_STEP_IDS.awaitOpenInvestigation ||
    stepId === PND_GATE_STEP_IDS.awaitPromoteIncident
  );
};
