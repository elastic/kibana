/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerInvestigationsAiIndex } from './register_investigations_ai_index';

describe('registerInvestigationsAiIndex', () => {
  it('registers the indicator AI index on the backing index Hunt writes to', () => {
    const registerAiIndex = jest.fn();

    registerInvestigationsAiIndex({ contextEngine: { registerAiIndex } });

    expect(registerAiIndex).toHaveBeenCalledTimes(2);
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
  });
});
