/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  deriveAllThreadConversationIds,
  deriveConversationIds,
  PND_GATE_IDS,
} from '@kbn/pnd-common';

import { derivePndOwnedConversationIds, guardDerivedConversationId } from '.';

const ATTACK_DISCOVERY_ALERT_ID = 'ad-1';
const OTHER_ATTACK_DISCOVERY_ALERT_ID = 'ad-2';

const derived = deriveConversationIds(ATTACK_DISCOVERY_ALERT_ID);
const threads = deriveAllThreadConversationIds(ATTACK_DISCOVERY_ALERT_ID);

const threadIdFor = (gateId: string): string => {
  const match = threads.find((thread) => thread.gateId === gateId);
  if (match == null) {
    throw new Error(`no thread id derived for gate "${gateId}"`);
  }
  return match.threadConversationId;
};

describe('derivePndOwnedConversationIds', () => {
  it('registers all seven ids for one Attack Discovery alert', () => {
    expect(derivePndOwnedConversationIds(ATTACK_DISCOVERY_ALERT_ID).size).toEqual(7);
  });

  it('classifies the three alert-keyed ids without a gate id', () => {
    const owned = derivePndOwnedConversationIds(ATTACK_DISCOVERY_ALERT_ID);

    expect([
      owned.get(derived.investigationConversationId),
      owned.get(derived.incidentConversationId),
      owned.get(derived.tuningConversationId),
    ]).toEqual([{ kind: 'investigation' }, { kind: 'incident' }, { kind: 'tuning' }]);
  });

  it('classifies every thread id with the gate that produced it', () => {
    const owned = derivePndOwnedConversationIds(ATTACK_DISCOVERY_ALERT_ID);

    expect(threads.map(({ threadConversationId }) => owned.get(threadConversationId))).toEqual(
      threads.map(({ gateId }) => ({ gateId, kind: 'thread' }))
    );
  });

  it('fails closed on a blank Attack Discovery alert id', () => {
    expect(derivePndOwnedConversationIds('   ')).toEqual(new Map());
  });
});

describe('guardDerivedConversationId', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authorizes the investigation container id', () => {
    expect(
      guardDerivedConversationId({
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        conversationId: derived.investigationConversationId,
        logger,
      })
    ).toEqual({ authorized: true, kind: 'investigation' });
  });

  it('authorizes the incident container id', () => {
    expect(
      guardDerivedConversationId({
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        conversationId: derived.incidentConversationId,
        logger,
      })
    ).toEqual({ authorized: true, kind: 'incident' });
  });

  it('authorizes the tuning worker id', () => {
    expect(
      guardDerivedConversationId({
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        conversationId: derived.tuningConversationId,
        logger,
      })
    ).toEqual({ authorized: true, kind: 'tuning' });
  });

  it('authorizes a thread id, reporting the gate it is paired with', () => {
    expect(
      guardDerivedConversationId({
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        conversationId: threadIdFor(PND_GATE_IDS.applyTuning),
        logger,
      })
    ).toEqual({ authorized: true, gateId: PND_GATE_IDS.applyTuning, kind: 'thread' });
  });

  it('does not log on the authorized path', () => {
    guardDerivedConversationId({
      correlationId: ATTACK_DISCOVERY_ALERT_ID,
      conversationId: derived.incidentConversationId,
      logger,
    });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('rejects an arbitrary conversation id', () => {
    expect(
      guardDerivedConversationId({
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        conversationId: '2b0d2b3c-8f4e-4b0a-9d3e-1f2a3b4c5d6e',
        logger,
      })
    ).toEqual({ authorized: false });
  });

  it("rejects a conversation id derived from a different caller's Attack Discovery alert", () => {
    const { incidentConversationId } = deriveConversationIds(OTHER_ATTACK_DISCOVERY_ALERT_ID);

    expect(
      guardDerivedConversationId({
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        conversationId: incidentConversationId,
        logger,
      })
    ).toEqual({ authorized: false });
  });

  it('rejects a thread id derived from a different Attack Discovery alert', () => {
    const [{ threadConversationId }] = deriveAllThreadConversationIds(
      OTHER_ATTACK_DISCOVERY_ALERT_ID
    );

    expect(
      guardDerivedConversationId({
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        conversationId: threadConversationId,
        logger,
      })
    ).toEqual({ authorized: false });
  });

  it('fails closed on a blank Attack Discovery alert id, even for a self-consistent pair', () => {
    const blankDerived = deriveConversationIds('');

    expect(
      guardDerivedConversationId({
        correlationId: '',
        conversationId: blankDerived.incidentConversationId,
        logger,
      })
    ).toEqual({ authorized: false });
  });

  it('logs the rejection, naming both ids', () => {
    guardDerivedConversationId({
      correlationId: ATTACK_DISCOVERY_ALERT_ID,
      conversationId: '2b0d2b3c-8f4e-4b0a-9d3e-1f2a3b4c5d6e',
      logger,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('2b0d2b3c-8f4e-4b0a-9d3e-1f2a3b4c5d6e')
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(ATTACK_DISCOVERY_ALERT_ID));
  });
});
