/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  knowledgeBaseAuditEvent,
  KnowledgeBaseAuditAction,
  AUDIT_OUTCOME,
  AUDIT_CATEGORY,
  AUDIT_TYPE,
} from './audit_events';

describe('knowledgeBaseAuditEvent', () => {
  it('should generate a success event with id', () => {
    const event = knowledgeBaseAuditEvent({
      action: KnowledgeBaseAuditAction.CREATE,
      id: '123',
      outcome: AUDIT_OUTCOME.SUCCESS,
    });

    expect(event).toEqual({
      message: 'User has created knowledge base entry [id=123]',
      event: {
        action: KnowledgeBaseAuditAction.CREATE,
        category: [AUDIT_CATEGORY.DATABASE],
        type: [AUDIT_TYPE.CREATION],
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });
  });
  it('should generate a success event with name', () => {
    const event = knowledgeBaseAuditEvent({
      action: KnowledgeBaseAuditAction.CREATE,
      name: 'My document',
      outcome: AUDIT_OUTCOME.SUCCESS,
    });

    expect(event).toEqual({
      message: 'User has created knowledge base entry [name="My document"]',
      event: {
        action: KnowledgeBaseAuditAction.CREATE,
        category: [AUDIT_CATEGORY.DATABASE],
        type: [AUDIT_TYPE.CREATION],
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });
  });
  it('should generate a success event with name and id', () => {
    const event = knowledgeBaseAuditEvent({
      action: KnowledgeBaseAuditAction.CREATE,
      name: 'My document',
      id: '123',
      outcome: AUDIT_OUTCOME.SUCCESS,
    });

    expect(event).toEqual({
      message: 'User has created knowledge base entry [id=123, name="My document"]',
      event: {
        action: KnowledgeBaseAuditAction.CREATE,
        category: [AUDIT_CATEGORY.DATABASE],
        type: [AUDIT_TYPE.CREATION],
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });
  });

  it('should generate a success event without id or name', () => {
    const event = knowledgeBaseAuditEvent({
      action: KnowledgeBaseAuditAction.CREATE,
      outcome: AUDIT_OUTCOME.SUCCESS,
    });

    expect(event).toEqual({
      message: 'User has created a knowledge base entry',
      event: {
        action: KnowledgeBaseAuditAction.CREATE,
        category: [AUDIT_CATEGORY.DATABASE],
        type: [AUDIT_TYPE.CREATION],
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });
  });

  it('should generate a failure event with an error', () => {
    const error = new Error('Test error');
    const event = knowledgeBaseAuditEvent({
      action: KnowledgeBaseAuditAction.CREATE,
      id: '456',
      error,
    });

    expect(event).toEqual({
      message: 'Failed attempt to create knowledge base entry [id=456]',
      event: {
        action: KnowledgeBaseAuditAction.CREATE,
        category: [AUDIT_CATEGORY.DATABASE],
        type: [AUDIT_TYPE.CREATION],
        outcome: AUDIT_OUTCOME.FAILURE,
      },
      error: {
        code: error.name,
        message: error.message,
      },
    });
  });

  it('should handle unknown outcome', () => {
    const event = knowledgeBaseAuditEvent({
      action: KnowledgeBaseAuditAction.CREATE,
      id: '789',
      outcome: AUDIT_OUTCOME.UNKNOWN,
    });

    expect(event).toEqual({
      message: 'User is creating knowledge base entry [id=789]',
      event: {
        action: KnowledgeBaseAuditAction.CREATE,
        category: [AUDIT_CATEGORY.DATABASE],
        type: [AUDIT_TYPE.CREATION],
        outcome: AUDIT_OUTCOME.UNKNOWN,
      },
    });
  });

  it('should handle update action', () => {
    const event = knowledgeBaseAuditEvent({
      action: KnowledgeBaseAuditAction.UPDATE,
      id: '123',
      outcome: AUDIT_OUTCOME.SUCCESS,
    });

    expect(event).toEqual({
      message: 'User has updated knowledge base entry [id=123]',
      event: {
        action: KnowledgeBaseAuditAction.UPDATE,
        category: [AUDIT_CATEGORY.DATABASE],
        type: [AUDIT_TYPE.CHANGE],
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });
  });

  it('should handle delete action', () => {
    const event = knowledgeBaseAuditEvent({
      action: KnowledgeBaseAuditAction.DELETE,
      id: '123',
    });

    expect(event).toEqual({
      message: 'User has deleted knowledge base entry [id=123]',
      event: {
        action: KnowledgeBaseAuditAction.DELETE,
        category: [AUDIT_CATEGORY.DATABASE],
        type: [AUDIT_TYPE.DELETION],
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });
  });

  it('should default to success if outcome is not provided and no error exists', () => {
    const event = knowledgeBaseAuditEvent({
      action: KnowledgeBaseAuditAction.CREATE,
    });

    expect(event.event?.outcome).toBe(AUDIT_OUTCOME.SUCCESS);
  });

  it('should prioritize error outcome over provided outcome', () => {
    const error = new Error('Error with priority');
    const event = knowledgeBaseAuditEvent({
      action: KnowledgeBaseAuditAction.CREATE,
      outcome: AUDIT_OUTCOME.SUCCESS,
      error,
    });

    expect(event.event?.outcome).toBe(AUDIT_OUTCOME.FAILURE);
  });
});
