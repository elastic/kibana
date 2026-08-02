/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveConversationIds } from '@kbn/pnd-common';
import type { PndConversation } from '@kbn/pnd-common';

import { CONVERSATION_KIND_BY_PHASE_STEP_ID, resolveRowConversation } from '.';

const { incidentConversationId, investigationConversationId, tuningConversationId } =
  deriveConversationIds('ad-1');

const conversation = (id: string, kind: PndConversation['kind']): PndConversation => ({
  correlationId: 'ad-1',
  createdAt: '2026-08-03T10:00:00.000Z',
  id,
  kind,
  title: `[${kind}] Suspicious activity`,
  updatedAt: '2026-08-03T10:05:00.000Z',
});

const ALL_THREE: readonly PndConversation[] = [
  conversation(investigationConversationId, 'investigation'),
  conversation(incidentConversationId, 'incident'),
  conversation(tuningConversationId, 'tuning'),
];

describe('CONVERSATION_KIND_BY_PHASE_STEP_ID', () => {
  it('maps the three catalog rows whose lifecycle step opens an Agent Builder conversation', () => {
    expect(CONVERSATION_KIND_BY_PHASE_STEP_ID).toEqual({
      'step-2-1': 'investigation',
      'step-3-5': 'incident',
      'step-4-2': 'tuning',
    });
  });
});

describe('resolveRowConversation', () => {
  it('resolves the investigation conversation for the open-investigation row', () => {
    expect(
      resolveRowConversation({
        correlationId: 'ad-1',
        conversations: ALL_THREE,
        phaseStepId: 'step-2-1',
      })?.id
    ).toBe(investigationConversationId);
  });

  it('resolves the incident conversation for the confirm-containment row', () => {
    expect(
      resolveRowConversation({
        correlationId: 'ad-1',
        conversations: ALL_THREE,
        phaseStepId: 'step-3-5',
      })?.id
    ).toBe(incidentConversationId);
  });

  it('resolves the tuning conversation for the draft-tuning row', () => {
    expect(
      resolveRowConversation({
        correlationId: 'ad-1',
        conversations: ALL_THREE,
        phaseStepId: 'step-4-2',
      })?.id
    ).toBe(tuningConversationId);
  });

  it('resolves nothing when the derived conversation does not exist yet, because derivation is unconditional', () => {
    expect(
      resolveRowConversation({
        correlationId: 'ad-1',
        conversations: [conversation(investigationConversationId, 'investigation')],
        phaseStepId: 'step-3-5',
      })
    ).toBeUndefined();
  });

  it('resolves nothing for a row that opens no conversation', () => {
    expect(
      resolveRowConversation({
        correlationId: 'ad-1',
        conversations: ALL_THREE,
        phaseStepId: 'step-1-1',
      })
    ).toBeUndefined();
  });

  it('resolves nothing without a discovery id', () => {
    expect(
      resolveRowConversation({
        correlationId: '',
        conversations: ALL_THREE,
        phaseStepId: 'step-2-1',
      })
    ).toBeUndefined();
  });

  it('resolves nothing for a conversation derived from a different discovery', () => {
    const other = deriveConversationIds('ad-2');

    expect(
      resolveRowConversation({
        correlationId: 'ad-1',
        conversations: [conversation(other.investigationConversationId, 'investigation')],
        phaseStepId: 'step-2-1',
      })
    ).toBeUndefined();
  });
});
