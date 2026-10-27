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
  status: 'active',
  source_ids: ['logs.app'],
  title: 'Latency spike',
  summary: 'Summary',
  severity: 'critical',
  confidence: 0.9,
  ...overrides,
});

describe('open_significant_event_in_chat', () => {
  it('prefills the prompt without an explicit attachment', () => {
    const event = mockEvent();
    const options = buildNewSignificantEventChatOptions(event);

    expect(options).toEqual({
      newConversation: true,
      autoSendInitialMessage: false,
      initialMessage: 'Explain this significant event: Latency spike',
    });
  });

  it('buildInvestigationConversationChatOptions passes conversationId only', () => {
    expect(buildInvestigationConversationChatOptions('conv-abc')).toEqual({
      conversationId: 'conv-abc',
    });
  });
});
