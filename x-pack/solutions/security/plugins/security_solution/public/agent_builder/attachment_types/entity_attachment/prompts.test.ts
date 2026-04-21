/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getContinueConversationBulkPrompt,
  getContinueConversationPrompt,
} from './prompts';

describe('getContinueConversationPrompt', () => {
  it('returns a type-aware prompt for a host', () => {
    const prompt = getContinueConversationPrompt({
      identifierType: 'host',
      identifier: 'web-01',
    });
    expect(prompt).toContain('host');
    expect(prompt).toContain('web-01');
  });

  it('returns a type-aware prompt for a user', () => {
    const prompt = getContinueConversationPrompt({
      identifierType: 'user',
      identifier: 'bob',
    });
    expect(prompt).toContain('user');
    expect(prompt).toContain('bob');
  });

  it('returns a type-aware prompt for a service', () => {
    const prompt = getContinueConversationPrompt({
      identifierType: 'service',
      identifier: 'payments',
    });
    expect(prompt).toContain('service');
    expect(prompt).toContain('payments');
  });

  it('falls back to generic prompt for unknown / generic types', () => {
    const prompt = getContinueConversationPrompt({
      identifierType: 'generic',
      identifier: 'abc123',
    });
    expect(prompt).toContain('entity');
    expect(prompt).toContain('abc123');
  });
});

describe('getContinueConversationBulkPrompt', () => {
  it('includes every identifier label', () => {
    const prompt = getContinueConversationBulkPrompt([
      { identifierType: 'host', identifier: 'alpha' },
      { identifierType: 'user', identifier: 'bob' },
    ]);
    expect(prompt).toContain('alpha');
    expect(prompt).toContain('bob');
  });
});
