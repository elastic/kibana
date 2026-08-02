/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import {
  PND_GATE_REGISTRY,
  deriveAllThreadConversationIds,
  deriveConversationIds,
  deriveThreadConversationId,
} from '@kbn/pnd-common';

import { buildPndConversations } from '.';

const AD_ALERT_ID = 'ad-alert-1';
const { incidentConversationId, investigationConversationId, tuningConversationId } =
  deriveConversationIds(AD_ALERT_ID);

/** The four gate-keyed thread ids for {@link AD_ALERT_ID}, in registry order. */
const threadIds = deriveAllThreadConversationIds(AD_ALERT_ID);

const threadIdFor = (gateId: string): string => {
  const threadConversationId = deriveThreadConversationId({
    correlationId: AD_ALERT_ID,
    gateId,
  });

  if (threadConversationId == null) {
    throw new Error(`no thread id for gate "${gateId}"`); // an unregistered gate: a test bug
  }

  return threadConversationId;
};

const conversation = (
  id: string,
  overrides: Partial<ConversationWithoutRounds> = {}
): ConversationWithoutRounds =>
  ({
    created_at: '2026-08-02T00:00:00.000Z',
    id,
    title: `Conversation ${id}`,
    updated_at: '2026-08-02T01:00:00.000Z',
    ...overrides,
  } as ConversationWithoutRounds);

describe('buildPndConversations', () => {
  it('returns the investigation conversation typed by its namespace', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [conversation(investigationConversationId)],
    });

    expect(result).toEqual([
      {
        correlationId: AD_ALERT_ID,
        createdAt: '2026-08-02T00:00:00.000Z',
        id: investigationConversationId,
        kind: 'investigation',
        title: `Conversation ${investigationConversationId}`,
        updatedAt: '2026-08-02T01:00:00.000Z',
      },
    ]);
  });

  it('types the incident conversation from its namespace', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [conversation(incidentConversationId)],
    });

    expect(result[0].kind).toBe('incident');
  });

  // Phase 4 is the reason this projection exists at all for the chats view: `draft_tuning` opens a
  // third thread from the third UUIDv5 namespace, and the flyout's Phase-4 "Open conversation"
  // action is gated on the id appearing in THIS response rather than on the derivation. Omitting the
  // namespace here makes a real tuning conversation invisible in both surfaces.
  it('types the tuning conversation from its namespace', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [conversation(tuningConversationId)],
    });

    expect(result[0].kind).toBe('tuning');
  });

  it('returns all three kinds for one Attack Discovery alert', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [
        conversation(investigationConversationId),
        conversation(incidentConversationId),
        conversation(tuningConversationId),
      ],
    });

    expect(result.map(({ kind }) => kind)).toEqual(['investigation', 'incident', 'tuning']);
  });

  // The `[Thread]` namespace (D1) is keyed on `(correlationId, gateId)` rather than on the
  // alert id alone, so it contributes four ids per alert instead of one. A thread id this helper does
  // not register is dropped by the intersection below, which is exactly how a thread that really
  // exists becomes invisible in the chats view with no error anywhere.
  it('returns a thread conversation typed by the gate its Proposal is paired with', () => {
    const threadConversationId = threadIdFor('open_investigation');

    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [conversation(threadConversationId)],
    });

    expect(result).toEqual([
      {
        correlationId: AD_ALERT_ID,
        createdAt: '2026-08-02T00:00:00.000Z',
        gateId: 'open_investigation',
        id: threadConversationId,
        kind: 'thread',
        parentConversationId: investigationConversationId,
        parentConversationRelation: 'thread',
        title: `Conversation ${threadConversationId}`,
        updatedAt: '2026-08-02T01:00:00.000Z',
      },
    ]);
  });

  it.each(PND_GATE_REGISTRY.map(({ gateId }) => gateId))(
    'carries the %s gate id on its thread',
    (gateId) => {
      const result = buildPndConversations({
        correlationIds: [AD_ALERT_ID],
        conversations: [conversation(threadIdFor(gateId))],
      });

      expect(result[0]).toEqual(expect.objectContaining({ gateId, kind: 'thread' }));
    }
  );

  it('leaves gateId off the three alert-keyed kinds, which have no gate', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [
        conversation(investigationConversationId),
        conversation(incidentConversationId),
        conversation(tuningConversationId),
      ],
    });

    expect(result.map(({ gateId }) => gateId)).toEqual([undefined, undefined, undefined]);
  });

  it('returns all seven derived conversations for one Attack Discovery alert', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [
        conversation(investigationConversationId),
        conversation(incidentConversationId),
        conversation(tuningConversationId),
        ...threadIds.map(({ threadConversationId }) => conversation(threadConversationId)),
      ],
    });

    expect(result.map(({ kind }) => kind)).toEqual([
      'investigation',
      'incident',
      'tuning',
      'thread',
      'thread',
      'thread',
      'thread',
    ]);
  });

  // Deriving always answers, so only the intersection tells you which threads exist: a proposal whose
  // thread `_ensure` never created must not show up as a conversation the analyst can open.
  it('omits the derived threads the caller does not have', () => {
    const [{ threadConversationId }] = threadIds;

    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [conversation(threadConversationId)],
    });

    expect(result.map(({ id }) => id)).toEqual([threadConversationId]);
  });

  it('registers no thread for a blank Attack Discovery alert id, inheriting the fail-closed derivation', () => {
    const result = buildPndConversations({
      correlationIds: [' '],
      conversations: [conversation(threadIdFor('apply_tuning'))],
    });

    expect(result).toEqual([]);
  });

  it('maps the source Attack Discovery alert id onto a thread from another alert', () => {
    const otherAlertId = 'ad-alert-2';
    const [{ gateId, threadConversationId }] = deriveAllThreadConversationIds(otherAlertId);
    const { investigationConversationId: otherInvestigationId } =
      deriveConversationIds(otherAlertId);

    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID, otherAlertId],
      conversations: [conversation(threadConversationId)],
    });

    expect(result).toEqual([
      {
        correlationId: otherAlertId,
        createdAt: '2026-08-02T00:00:00.000Z',
        gateId,
        id: threadConversationId,
        kind: 'thread',
        parentConversationId: otherInvestigationId,
        parentConversationRelation: 'thread',
        title: `Conversation ${threadConversationId}`,
        updatedAt: '2026-08-02T01:00:00.000Z',
      },
    ]);
  });

  it('excludes conversations that are not PND-derived', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [conversation('some-other-conversation')],
    });

    expect(result).toEqual([]);
  });

  it('returns nothing when there are no Attack Discovery alerts', () => {
    const result = buildPndConversations({
      correlationIds: [],
      conversations: [conversation(investigationConversationId)],
    });

    expect(result).toEqual([]);
  });

  it('keeps only the derived conversations from a mixed list', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [
        conversation('unrelated-1'),
        conversation(investigationConversationId),
        conversation('unrelated-2'),
      ],
    });

    expect(result.map(({ id }) => id)).toEqual([investigationConversationId]);
  });

  it('maps the source Attack Discovery alert id across multiple alerts', () => {
    const otherAlertId = 'ad-alert-2';
    const other = deriveConversationIds(otherAlertId);

    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID, otherAlertId],
      conversations: [conversation(other.incidentConversationId)],
    });

    expect(result[0].correlationId).toBe(otherAlertId);
  });

  it('leaves parentage off the investigation container', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [conversation(investigationConversationId)],
    });

    expect(result[0].parentConversationId).toBeUndefined();
  });

  it('leaves parentage off the incident container', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [conversation(incidentConversationId)],
    });

    expect(result[0].parentConversationId).toBeUndefined();
  });

  it('folds the tuning conversation under the investigation as a worker', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [conversation(tuningConversationId)],
    });

    expect(result[0]).toEqual(
      expect.objectContaining({
        parentConversationId: investigationConversationId,
        parentConversationRelation: 'worker',
      })
    );
  });

  it.each(PND_GATE_REGISTRY.map(({ gateId, parentKind }) => ({ gateId, parentKind })))(
    'folds the $gateId thread under the $parentKind container',
    ({ gateId, parentKind }) => {
      const result = buildPndConversations({
        correlationIds: [AD_ALERT_ID],
        conversations: [conversation(threadIdFor(gateId))],
      });

      expect(result[0]).toEqual(
        expect.objectContaining({
          parentConversationId:
            parentKind === 'incident' ? incidentConversationId : investigationConversationId,
          parentConversationRelation: 'thread',
        })
      );
    }
  );

  it('strips the [Investigation] Agent Builder prefix so PND surfaces never show it', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [
        conversation(investigationConversationId, {
          title: '[Investigation] Suspicious PowerShell on host-1',
        }),
      ],
    });

    expect(result[0].title).toEqual('Suspicious PowerShell on host-1');
  });

  it('strips the [Incident] Agent Builder prefix', () => {
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [
        conversation(incidentConversationId, {
          title: '[Incident] Credential dumping on host-1',
        }),
      ],
    });

    expect(result[0].title).toEqual('Credential dumping on host-1');
  });

  it('leaves a thread title exactly as Agent Builder wrote it', () => {
    const threadConversationId = threadIdFor('open_investigation');
    const result = buildPndConversations({
      correlationIds: [AD_ALERT_ID],
      conversations: [
        conversation(threadConversationId, {
          title: 'Decision on opening an investigation: Lateral movement',
        }),
      ],
    });

    expect(result[0].title).toEqual('Decision on opening an investigation: Lateral movement');
  });
});
