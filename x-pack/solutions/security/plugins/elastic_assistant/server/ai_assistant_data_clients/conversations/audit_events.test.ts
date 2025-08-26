/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  conversationAuditEvent,
  ConversationAuditAction,
  AUDIT_OUTCOME,
  AUDIT_CATEGORY,
  AUDIT_TYPE,
} from './audit_events';
import type { User } from '@kbn/elastic-assistant-common';
const owner = { name: 'Owner', id: '789' } as User;
describe('conversationAuditEvent', () => {
  const user1: User = { name: 'Alice', id: '123' } as User;
  const user2: User = { name: 'Bob', id: '456' } as User;

  it('should format message for shared conversation with users', () => {
    const event = conversationAuditEvent({
      action: ConversationAuditAction.SHARED,
      id: '123',
      title: 'Test',
      users: [user1, user2],
      user: owner,
      outcome: 'success',
    });
    expect(event.message).toEqual(
      `User [id=789, name=Owner] has shared conversation [id=123, title="Test"] to users ([id=123, name=Alice], [id=456, name=Bob])`
    );
    expect(event?.event?.action).toBe(ConversationAuditAction.SHARED);
    expect(event?.event?.category).toEqual([AUDIT_CATEGORY.DATABASE]);
    expect(event?.event?.type).toEqual([AUDIT_TYPE.CHANGE]);
    expect(event?.event?.outcome).toBe('success');
    expect(event.error).toBeUndefined();
  });

  it('should format message for shared conversation to all users', () => {
    const event = conversationAuditEvent({
      action: ConversationAuditAction.SHARED,
      id: '123',
      title: 'Test',
      users: [],
      user: owner,
      outcome: 'success',
    });
    expect(event.message).toEqual(
      'User [id=789, name=Owner] has shared conversation [id=123, title="Test"] to all users in the space'
    );
  });

  it('should format message for private conversation', () => {
    const event = conversationAuditEvent({
      action: ConversationAuditAction.PRIVATE,
      id: '456',
      title: 'Private',
      outcome: 'success',
      user: owner,
    });
    expect(event.message).toEqual(
      'User [id=789, name=Owner] has made private conversation [id=456, title="Private"]'
    );
    expect(event?.event?.action).toBe(ConversationAuditAction.PRIVATE);
    expect(event?.event?.type).toEqual([AUDIT_TYPE.CHANGE]);
    expect(event?.event?.outcome).toBe('success');
  });

  it('should handle unknown outcome', () => {
    const event = conversationAuditEvent({
      action: ConversationAuditAction.PRIVATE,
      outcome: 'unknown',
      user: owner,
    });
    expect(event.message).toEqual('User [id=789, name=Owner] is making private a conversation');
    expect(event?.event?.outcome).toBe('unknown');
  });

  it('should handle error', () => {
    const error = new Error('Something went wrong');
    error.name = 'TestError';
    const event = conversationAuditEvent({
      action: ConversationAuditAction.SHARED,
      error,
      id: '789',
      title: 'ErrorTest',
      users: [user1],
      user: owner,
    });
    expect(event.message).toEqual(
      'Failed attempt to share conversation [id=789, title="ErrorTest"] to user ([id=123, name=Alice])'
    );
    expect(event?.event?.outcome).toBe(AUDIT_OUTCOME.FAILURE);
    expect(event.error).toEqual({ code: 'TestError', message: 'Something went wrong' });
  });

  it('should format message with only id', () => {
    const event = conversationAuditEvent({
      action: ConversationAuditAction.PRIVATE,
      id: '999',
      user: owner,
    });
    expect(event.message).toEqual(
      'User [id=789, name=Owner] has made private conversation [id=999]'
    );
  });

  it('should format message with only title', () => {
    const event = conversationAuditEvent({
      action: ConversationAuditAction.PRIVATE,
      title: 'OnlyTitle',
      user: owner,
    });
    expect(event.message).toEqual(
      'User [id=789, name=Owner] has made private conversation [title="OnlyTitle"]'
    );
  });

  it('should format message with neither id nor title', () => {
    const event = conversationAuditEvent({
      action: ConversationAuditAction.PRIVATE,
      user: owner,
    });
    expect(event.message).toEqual('User [id=789, name=Owner] has made private a conversation');
  });
});
