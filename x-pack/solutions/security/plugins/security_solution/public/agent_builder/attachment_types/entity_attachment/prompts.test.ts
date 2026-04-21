/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getChangeAssetCriticalityPrompt,
  getCheckGraphPrompt,
  getContinueConversationBulkPrompt,
  getContinueConversationPrompt,
  getResolutionGroupPrompt,
  getRiskContributionsPrompt,
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

describe('getRiskContributionsPrompt', () => {
  it.each([
    ['host', 'web-01'] as const,
    ['user', 'bob'] as const,
    ['service', 'payments'] as const,
  ])('includes the %s identifier and asks to break down by category', (type, id) => {
    const prompt = getRiskContributionsPrompt({ identifierType: type, identifier: id });
    expect(prompt).toContain(type);
    expect(prompt).toContain(id);
    expect(prompt.toLowerCase()).toContain('risk contributions');
    expect(prompt.toLowerCase()).toContain('category');
  });

  it('uses the generic "entity" label for unknown types', () => {
    const prompt = getRiskContributionsPrompt({
      identifierType: 'generic',
      identifier: 'abc123',
    });
    expect(prompt).toContain('entity');
    expect(prompt).toContain('abc123');
  });
});

describe('getChangeAssetCriticalityPrompt', () => {
  it('asks the agent to explain levels and recommend one', () => {
    const prompt = getChangeAssetCriticalityPrompt({
      identifierType: 'host',
      identifier: 'web-01',
    });
    expect(prompt).toContain('host');
    expect(prompt).toContain('web-01');
    expect(prompt.toLowerCase()).toContain('asset criticality');
    expect(prompt.toLowerCase()).toContain('recommend');
  });
});

describe('getResolutionGroupPrompt', () => {
  it('requests the resolution group details and highlights drift', () => {
    const prompt = getResolutionGroupPrompt({ identifierType: 'user', identifier: 'bob' });
    expect(prompt).toContain('user');
    expect(prompt).toContain('bob');
    expect(prompt.toLowerCase()).toContain('resolution group');
    expect(prompt.toLowerCase()).toContain('aliases');
  });
});

describe('getCheckGraphPrompt', () => {
  it('asks for the entity graph neighborhood over the last 24 hours', () => {
    const prompt = getCheckGraphPrompt({ identifierType: 'service', identifier: 'payments' });
    expect(prompt).toContain('service');
    expect(prompt).toContain('payments');
    expect(prompt.toLowerCase()).toContain('graph');
    expect(prompt.toLowerCase()).toContain('24 hours');
  });
});
