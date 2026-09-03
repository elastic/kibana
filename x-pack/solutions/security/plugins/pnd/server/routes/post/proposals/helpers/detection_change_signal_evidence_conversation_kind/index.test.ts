/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_STEP_IDS } from '@kbn/pnd-common';

import { detectionChangeSignalEvidenceConversationKind } from '.';

describe('detectionChangeSignalEvidenceConversationKind', () => {
  it('cites the incident conversation at the containment gate', () => {
    expect(
      detectionChangeSignalEvidenceConversationKind(PND_GATE_STEP_IDS.awaitIncidentContained)
    ).toBe('incident');
  });

  it('cites the investigation conversation when opening an investigation is declined', () => {
    expect(
      detectionChangeSignalEvidenceConversationKind(PND_GATE_STEP_IDS.awaitOpenInvestigation)
    ).toBe('investigation');
  });

  it('cites the investigation conversation when promoting an incident is declined', () => {
    expect(
      detectionChangeSignalEvidenceConversationKind(PND_GATE_STEP_IDS.awaitPromoteIncident)
    ).toBe('investigation');
  });
});
