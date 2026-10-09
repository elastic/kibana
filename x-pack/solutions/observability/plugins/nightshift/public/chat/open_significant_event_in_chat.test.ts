/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import {
  buildInvestigationConversationChatOptions,
  buildNewSignificantEventChatOptions,
} from './open_significant_event_in_chat';

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_id: 'evt-1',
  event_uuid: 'evt-uuid-1',
  status: 'open',
  stream_names: ['logs.app'],
  title: 'Latency spike',
  summary: 'Summary',
  severity: '80-critical',
  confidence: 0.9,
  ...overrides,
});

describe('open_significant_event_in_chat', () => {
  it('buildNewSignificantEventChatOptions attaches the event and prefills the prompt', () => {
    const event = mockEvent();
    const options = buildNewSignificantEventChatOptions(event);

    expect(options).toEqual(
      expect.objectContaining({
        newConversation: true,
        autoSendInitialMessage: false,
        initialMessage: 'Explain this significant event: Latency spike',
        attachments: [
          expect.objectContaining({
            id: 'evt-uuid-1',
            origin: 'evt-1',
          }),
        ],
      })
    );
  });

  it('buildInvestigationConversationChatOptions passes conversationId only', () => {
    expect(buildInvestigationConversationChatOptions('conv-abc')).toEqual({
      conversationId: 'conv-abc',
    });
  });
});
