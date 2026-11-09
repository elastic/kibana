/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerAiIndices } from './register_ai_indices';

describe('registerAiIndices', () => {
  it('registers every AlertZero AI index on the backing index Context Engine maps it to', () => {
    const registerAiIndex = jest.fn();

    registerAiIndices({ contextEngine: { registerAiIndex } });

    expect(registerAiIndex).toHaveBeenCalledTimes(3);
    expect(registerAiIndex).toHaveBeenCalledWith(
      'security-investigations',
      expect.objectContaining({
        dest: { type: 'index', value: 'ai-index-idx-security-investigations' },
        memory_enabled: false,
      })
    );
    expect(registerAiIndex).toHaveBeenCalledWith(
      'security-attack-fingerprints',
      expect.objectContaining({
        dest: { type: 'index', value: 'ai-index-idx-security-attack-fingerprints' },
        memory_enabled: false,
      })
    );
    expect(registerAiIndex).toHaveBeenCalledWith(
      'security-triage-decisions',
      expect.objectContaining({
        dest: { type: 'index', value: 'ai-index-idx-security-triage-decisions' },
        memory_enabled: false,
      })
    );
  });

  it('registers each declared index with its own description', () => {
    const registerAiIndex = jest.fn();

    registerAiIndices({
      contextEngine: { registerAiIndex },
      aiIndices: [{ id: 'security-example', description: 'Example index.' }],
    });

    expect(registerAiIndex).toHaveBeenCalledWith('security-example', {
      description: 'Example index.',
      memory_enabled: false,
      dest: { type: 'index', value: 'ai-index-idx-security-example' },
      automations: [],
      sources: [],
      traces: [],
    });
  });
});
