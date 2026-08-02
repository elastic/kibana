/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '../../schemas';
import { deriveConversationIds } from '../derive_conversation_ids';
import { originatingInvestigation, promotedFrom } from '.';

const AD_ALERT_ID = 'ad-alert-8f2c1e4a';

const derived = deriveConversationIds(AD_ALERT_ID);

const conversation = (overrides: Partial<PndConversation> = {}): PndConversation => ({
  correlationId: AD_ALERT_ID,
  createdAt: '2026-08-02T00:00:00.000Z',
  id: 'id-1',
  kind: 'incident',
  title: 't',
  updatedAt: '2026-08-02T00:00:00.000Z',
  ...overrides,
});

describe('promotedFrom (incident points up; investigation does not know its incidents)', () => {
  it('points an incident at the investigation derived from the same alert', () => {
    expect(promotedFrom(conversation({ kind: 'incident' }))).toEqual({
      promotedFrom: derived.investigationConversationId,
    });
  });

  it('returns no value for an investigation', () => {
    expect(promotedFrom(conversation({ kind: 'investigation' }))).toBeUndefined();
  });

  it('returns no value for a thread', () => {
    expect(promotedFrom(conversation({ kind: 'thread' }))).toBeUndefined();
  });

  it('returns no value for a tuning conversation', () => {
    expect(promotedFrom(conversation({ kind: 'tuning' }))).toBeUndefined();
  });

  it('does not treat the incident as a child of the investigation', () => {
    expect(promotedFrom(conversation({ kind: 'incident' }))).not.toEqual(
      expect.objectContaining({ parentConversationId: derived.investigationConversationId })
    );
  });
});

describe('promotedFrom (fail-closed, stored nowhere)', () => {
  it('returns no value for a blank attack discovery alert id', () => {
    expect(promotedFrom(conversation({ correlationId: '' }))).toBeUndefined();
  });

  it('returns no value for a whitespace-only attack discovery alert id', () => {
    expect(promotedFrom(conversation({ correlationId: '   ' }))).toBeUndefined();
  });

  it('ignores a promotedFrom already on the row, so the link cannot be stored', () => {
    const row = {
      ...conversation({ kind: 'incident' }),
      promotedFrom: 'stored-nowhere-sentinel',
    };

    expect(promotedFrom(row)?.promotedFrom).toBe(derived.investigationConversationId);
  });
});

/**
 * Carry-over renders by traversing `promotedFrom` at read time — never by copying the
 * investigation's proposals or sub-conversations onto the incident (project-daybreak #137
 * decision 3). `originatingInvestigation` is that traversal: it returns the investigation
 * already in the list, same reference.
 */
describe('originatingInvestigation (traverse, never copy)', () => {
  it('returns the investigation already in the list, not a copy', () => {
    const investigation = conversation({
      id: derived.investigationConversationId,
      kind: 'investigation',
    });
    const incident = conversation({ id: derived.incidentConversationId, kind: 'incident' });

    expect(originatingInvestigation({ conversations: [investigation, incident], incident })).toBe(
      investigation
    );
  });

  it('returns no value when the investigation is not in the list', () => {
    const incident = conversation({ id: derived.incidentConversationId, kind: 'incident' });

    expect(originatingInvestigation({ conversations: [incident], incident })).toBeUndefined();
  });

  it('returns no value for an investigation row', () => {
    const investigation = conversation({
      id: derived.investigationConversationId,
      kind: 'investigation',
    });

    expect(
      originatingInvestigation({
        conversations: [investigation],
        incident: investigation,
      })
    ).toBeUndefined();
  });
});

/**
 * Decision 7 is many-to-many; PND keys both ids on one alert id, so the thin slice is 1:1.
 * Two alerts never share an originating investigation through `promotedFrom`.
 */
describe('promotedFrom (1:1 per correlation id)', () => {
  it('points each incident at a different investigation when the alert ids differ', () => {
    const otherAlertId = 'ad-alert-other';
    const otherDerived = deriveConversationIds(otherAlertId);

    expect(promotedFrom(conversation({ kind: 'incident' }))?.promotedFrom).toBe(
      derived.investigationConversationId
    );
    expect(
      promotedFrom(conversation({ correlationId: otherAlertId, kind: 'incident' }))?.promotedFrom
    ).toBe(otherDerived.investigationConversationId);
    expect(derived.investigationConversationId).not.toBe(otherDerived.investigationConversationId);
  });
});
