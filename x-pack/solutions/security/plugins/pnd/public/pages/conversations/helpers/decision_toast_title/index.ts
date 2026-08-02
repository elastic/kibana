/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_IDS } from '@kbn/pnd-common';
import type { PndProposalRow } from '@kbn/pnd-common';

import {
  APPROVED_TOAST,
  DISMISSED_TOAST,
  INCIDENT_CONTAINED_APPROVED_TOAST,
  INCIDENT_OPENED_TOAST,
  OPEN_INVESTIGATION_APPROVED_TOAST,
} from '../../translations';
import { readProposalDecision } from '../read_proposal_decision';

/**
 * The success-toast title for a recorded gate answer.
 *
 * Copy is keyed on `(gateId, decision)` so the page does not branch on which container a resume
 * creates. A dismissal always stops the Floor run, so those share one string. An approval names
 * the consequence of that gate; anything else falls back to the generic approval toast.
 */
export const decisionToastTitle = ({
  answer,
  proposal: { gateId },
}: {
  answer: Record<string, unknown>;
  proposal: Pick<PndProposalRow, 'gateId'>;
}): string => {
  const decision = readProposalDecision(answer);

  if (decision === 'dismiss') {
    return DISMISSED_TOAST;
  }

  if (decision !== 'approve') {
    return APPROVED_TOAST;
  }

  if (gateId === PND_GATE_IDS.openInvestigation) {
    return OPEN_INVESTIGATION_APPROVED_TOAST;
  }

  if (gateId === PND_GATE_IDS.promoteIncident) {
    return INCIDENT_OPENED_TOAST;
  }

  if (gateId === PND_GATE_IDS.incidentContained) {
    return INCIDENT_CONTAINED_APPROVED_TOAST;
  }

  return APPROVED_TOAST;
};
