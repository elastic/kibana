/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONVERSATION_TITLE_MAX_LENGTH } from '@kbn/agent-builder-common';
import { getGateDefinitionByGateId, PND_GATE_IDS, type PndGateDefinition } from '@kbn/pnd-common';

import { buildThreadTitle } from '.';

const gateFor = (gateId: string): PndGateDefinition => {
  const gate = getGateDefinitionByGateId(gateId);
  if (gate == null) {
    throw new Error(`no gate registered for "${gateId}"`);
  }
  return gate;
};

describe('buildThreadTitle', () => {
  describe.each([
    [PND_GATE_IDS.applyTuning, 'Decision on applying a detection rule change'],
    [PND_GATE_IDS.incidentContained, 'Decision on confirming this incident is contained'],
    [PND_GATE_IDS.openInvestigation, 'Decision on opening an investigation'],
    [PND_GATE_IDS.promoteIncident, 'Decision on escalating this to an incident'],
  ])('%s', (gateId, expectedDecision) => {
    it('leads with the decision the gate is asking for', () => {
      expect(
        buildThreadTitle({
          attackDiscoveryTitle: 'OneNote mshta Payload Execution',
          gate: gateFor(gateId),
        })
      ).toBe(`${expectedDecision}: OneNote mshta Payload Execution`);
    });

    it('names no programme', () => {
      expect(
        buildThreadTitle({
          attackDiscoveryTitle: 'OneNote mshta Payload Execution',
          gate: gateFor(gateId),
        })
      ).not.toMatch(/Daybreak|AlertZero|PND/i);
    });

    it('stamps no kind tag into the title', () => {
      expect(
        buildThreadTitle({
          attackDiscoveryTitle: 'OneNote mshta Payload Execution',
          gate: gateFor(gateId),
        })
      ).not.toMatch(/\[[A-Za-z]+\]/);
    });
  });

  it('omits the Attack Discovery title when it is blank, rather than leaving an empty label', () => {
    expect(
      buildThreadTitle({
        attackDiscoveryTitle: '',
        gate: gateFor(PND_GATE_IDS.promoteIncident),
      })
    ).toBe('Decision on escalating this to an incident');
  });

  it("clips an over-long title to Agent Builder's conversation title bound", () => {
    const title = buildThreadTitle({
      attackDiscoveryTitle: 'x'.repeat(CONVERSATION_TITLE_MAX_LENGTH),
      gate: gateFor(PND_GATE_IDS.openInvestigation),
    });

    expect(title.length).toBeLessThanOrEqual(CONVERSATION_TITLE_MAX_LENGTH);
    expect(title).toContain('…');
  });
});
