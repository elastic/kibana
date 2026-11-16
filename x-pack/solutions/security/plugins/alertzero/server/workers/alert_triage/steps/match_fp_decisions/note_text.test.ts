/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noteText } from './note_text';

const decision = {
  id: 'fp-decision-0123456789abcdef',
  kind: 'false_positive' as const,
  approver: 'ana',
  decidedAt: '2026-10-20T08:00:00.000Z',
  proposalId: 'prop-1',
};

describe('noteText', () => {
  it('tells an analyst which decision closed the alert, who approved it and when, and how to take it back', () => {
    const note = noteText(decision, 'closed');

    expect(note).toContain('**Closed by AlertZero** as a false positive');
    expect(note).toContain('decision `fp-decision-0123456789abcdef`');
    expect(note).toContain('approved by ana on 2026-10-20 (proposal prop-1)');
    expect(note).toContain('system-security-floor-alert-triage-revoke-decision');
    expect(note).toContain('decision_id: fp-decision-0123456789abcdef');
  });

  it('says a dismissed pattern kept the alert out of analysis, and that no closure is proposed', () => {
    const note = noteText({ ...decision, id: 'fp-dismissal-0123456789abcdef' }, 'skipped');

    expect(note).toContain('**Kept out of analysis by AlertZero.**');
    expect(note).toContain('dismissed by ana on 2026-10-20');
    expect(note).toContain('no closure is proposed');
    expect(note).toContain('decision_id: fp-dismissal-0123456789abcdef');
  });

  it('leaves out who, when and which proposal when the decision does not record them', () => {
    const note = noteText({ id: decision.id, kind: 'false_positive' }, 'closed');

    expect(note).toContain('approved.');
    expect(note).not.toContain('approved by');
    expect(note).not.toContain(' on 20');
    expect(note).not.toContain('proposal');
  });
});
