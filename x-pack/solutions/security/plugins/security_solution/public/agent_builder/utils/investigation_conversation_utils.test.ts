/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCollaborativeInvestigation } from './investigation_conversation_utils';

describe('isCollaborativeInvestigation', () => {
  it('returns true when chat_mode is collaborative', () => {
    expect(isCollaborativeInvestigation({ chat_mode: 'collaborative' })).toBe(true);
  });

  it('returns true when template snapshot is collaborative', () => {
    expect(
      isCollaborativeInvestigation({
        template_snapshot: {
          template_id: 'incident-triage-v2',
          captured_at: '2026-01-01T00:00:00.000Z',
          chat_mode: 'collaborative',
        },
      })
    ).toBe(true);
  });

  it('returns true for legacy group conversation mode', () => {
    expect(isCollaborativeInvestigation({ conversation_mode: 'group' })).toBe(true);
  });

  it('returns false for personal chats', () => {
    expect(
      isCollaborativeInvestigation({
        chat_mode: 'single',
        template_snapshot: {
          template_id: 'research-notes-v1',
          captured_at: '2026-01-01T00:00:00.000Z',
          chat_mode: 'single',
        },
      })
    ).toBe(false);
  });
});
