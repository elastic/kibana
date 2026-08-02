/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_IDS, PND_GATE_REGISTRY } from '../../proposals/gate_registry';
import type { PndConversation } from '../../schemas';
import { deriveConversationIds } from '../derive_conversation_ids';
import { parentOf } from '.';

const AD_ALERT_ID = 'ad-alert-8f2c1e4a';

const derived = deriveConversationIds(AD_ALERT_ID);

const CONTAINER_ID_BY_PARENT_KIND = {
  incident: derived.incidentConversationId,
  investigation: derived.investigationConversationId,
} as const;

const conversation = (overrides: Partial<PndConversation> = {}): PndConversation => ({
  correlationId: AD_ALERT_ID,
  createdAt: '2026-08-02T00:00:00.000Z',
  id: 'id-1',
  kind: 'thread',
  title: 't',
  updatedAt: '2026-08-02T00:00:00.000Z',
  ...overrides,
});

describe('parentOf (container kinds have no parent)', () => {
  it('returns no value for an investigation', () => {
    expect(parentOf(conversation({ kind: 'investigation' }))).toBeUndefined();
  });

  it('returns no value for an incident', () => {
    expect(parentOf(conversation({ kind: 'incident' }))).toBeUndefined();
  });
});

describe('parentOf (thread → registry parentKind)', () => {
  it.each(PND_GATE_REGISTRY.map(({ gateId, parentKind }) => ({ gateId, parentKind })))(
    'hangs the $gateId thread under the $parentKind container',
    ({ gateId, parentKind }) => {
      expect(parentOf(conversation({ gateId, kind: 'thread' }))).toEqual({
        parentConversationId: CONTAINER_ID_BY_PARENT_KIND[parentKind],
        parentConversationRelation: 'thread',
      });
    }
  );

  it('hangs the apply_tuning thread under the incident, not the investigation', () => {
    expect(
      parentOf(conversation({ gateId: PND_GATE_IDS.applyTuning, kind: 'thread' }))
        ?.parentConversationId
    ).toBe(derived.incidentConversationId);
  });

  it('returns no value for a thread with no gate', () => {
    expect(parentOf(conversation({ kind: 'thread' }))).toBeUndefined();
  });

  it('returns no value for a thread whose gate is not registered', () => {
    expect(
      parentOf({ ...conversation({ kind: 'thread' }), gateId: 'not_a_pnd_gate' })
    ).toBeUndefined();
  });
});

describe('parentOf (worker → investigation)', () => {
  it('hangs the tuning conversation under the investigation as a worker', () => {
    expect(parentOf(conversation({ kind: 'tuning' }))).toEqual({
      parentConversationId: derived.investigationConversationId,
      parentConversationRelation: 'worker',
    });
  });

  it('does not treat the tuning conversation as a child of the incident', () => {
    expect(parentOf(conversation({ kind: 'tuning' }))?.parentConversationId).not.toBe(
      derived.incidentConversationId
    );
  });
});

describe('parentOf (fail-closed, stored nowhere)', () => {
  it('returns no value for a blank attack discovery alert id', () => {
    expect(
      parentOf(conversation({ correlationId: '', gateId: PND_GATE_IDS.openInvestigation }))
    ).toBeUndefined();
  });

  it('returns no value for a whitespace-only attack discovery alert id', () => {
    expect(
      parentOf(conversation({ correlationId: '   ', gateId: PND_GATE_IDS.openInvestigation }))
    ).toBeUndefined();
  });

  it('ignores a parentConversationId already on the row, so parentage cannot be stored', () => {
    const row = {
      ...conversation({ gateId: PND_GATE_IDS.openInvestigation, kind: 'thread' }),
      parentConversationId: 'stored-nowhere-sentinel',
    };

    expect(parentOf(row)?.parentConversationId).toBe(derived.investigationConversationId);
  });
});
