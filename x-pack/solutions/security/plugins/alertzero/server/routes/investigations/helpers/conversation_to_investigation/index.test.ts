/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID, TEMPLATE_ID_INVESTIGATION } from '@kbn/alertzero-common';
import { conversationToInvestigation } from '.';

const systemActor = {
  id: 'system-alertzero-journal-note',
  type: EventActorType.system,
};

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  agent_id: 'elastic-ai-agent',
  created_at: '2026-09-18T00:00:00.000Z',
  id: '8f85ba5f-08c1-8718-83bb-31c07f16d69e',
  rounds: [],
  title: 'macOS Keychain Theft',
  updated_at: '2026-09-18T00:10:00.000Z',
  user: { id: 'u1', username: 'elastic' },
  ...overrides,
});

describe('conversationToInvestigation', () => {
  it('copies identity fields and fabricates the floor watch id', () => {
    const investigation = conversationToInvestigation(makeConversation());

    expect(investigation).toEqual(
      expect.objectContaining({
        createdAt: '2026-09-18T00:00:00.000Z',
        id: '8f85ba5f-08c1-8718-83bb-31c07f16d69e',
        pendingProposalCount: 0,
        template_id: TEMPLATE_ID_INVESTIGATION,
        title: 'macOS Keychain Theft',
        updatedAt: '2026-09-18T00:10:00.000Z',
        watch_execution_id: '',
        watch_id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
        watch_tier: 'floor',
      })
    );
  });

  it('reads summary, status, and workflow_execution_id from metadata', () => {
    const investigation = conversationToInvestigation(
      makeConversation({
        metadata: {
          status: 'open',
          summary: 'Credential theft on a macOS host',
          workflow_execution_id: '33ed0fb2-1d5e-434e-8833-f5198ee1cb0f',
        },
      })
    );

    expect(investigation.status).toBe('open');
    expect(investigation.summary).toBe('Credential theft on a macOS host');
    expect(investigation.watch_execution_id).toBe('33ed0fb2-1d5e-434e-8833-f5198ee1cb0f');
  });

  it('maps journal user_message events without an execution_id', () => {
    const investigation = conversationToInvestigation(
      makeConversation({
        events: [
          {
            actor: systemActor,
            created_at: '2026-09-18T00:01:00.000Z',
            data: { message: 'Review started' },
            id: 'evt-journal-1',
            type: TimelineEventType.userMessage,
          },
          {
            actor: systemActor,
            created_at: '2026-09-18T00:02:00.000Z',
            data: { message: 'Should not appear' },
            execution_id: 'round-1',
            id: 'evt-round-user',
            type: TimelineEventType.userMessage,
          },
        ],
      })
    );

    expect(investigation.events).toEqual([
      {
        actor: 'system-alertzero-journal-note',
        id: 'evt-journal-1',
        summary: 'Review started',
        timestamp: '2026-09-18T00:01:00.000Z',
        type: TimelineEventType.userMessage,
      },
    ]);
  });

  it('maps attachment_added events to a short summary', () => {
    const investigation = conversationToInvestigation(
      makeConversation({
        events: [
          {
            actor: systemActor,
            created_at: '2026-09-18T00:03:00.000Z',
            data: {
              attachment_id: 'attack-discovery',
              attachment_type: 'security.attack_discovery',
              current_version: 1,
              render_inline: true,
              source: 'execution',
            },
            id: 'evt-attach-1',
            type: TimelineEventType.attachmentAdded,
          },
        ],
      })
    );

    expect(investigation.events).toEqual([
      {
        actor: 'system-alertzero-journal-note',
        id: 'evt-attach-1',
        summary: 'Attached security.attack_discovery',
        timestamp: '2026-09-18T00:03:00.000Z',
        type: TimelineEventType.attachmentAdded,
      },
    ]);
  });
});
