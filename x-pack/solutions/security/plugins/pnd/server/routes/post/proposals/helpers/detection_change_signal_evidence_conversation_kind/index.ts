/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_STEP_IDS } from '@kbn/pnd-common';

export type DetectionChangeSignalEvidenceConversationKind = 'incident' | 'investigation';

/**
 * Which derived conversation a coverage-gap claim should cite.
 *
 * Containment is the only Floor gate that runs after the incident conversation exists.
 * A dismissal at open-investigation or promote-incident ends the run with only the
 * investigation container, so citing the incident id would name a conversation that
 * was never minted.
 */
export const detectionChangeSignalEvidenceConversationKind = (
  stepId: string
): DetectionChangeSignalEvidenceConversationKind =>
  stepId === PND_GATE_STEP_IDS.awaitIncidentContained ? 'incident' : 'investigation';
