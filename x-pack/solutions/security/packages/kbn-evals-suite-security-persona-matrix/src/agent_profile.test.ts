/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { CHRYSALIS_PARITY_AGENT_ID, resolveAgentId, resolveAgentProfile } from './agent_profile';

describe('agent_profile', () => {
  it.each([undefined, '', 'default'])(
    'AGENT_PROFILE=%p resolves to the built-in Elastic AI Agent',
    (raw) => {
      const profile = resolveAgentProfile(raw);
      expect(profile).toBe('default');
      expect(resolveAgentId(profile)).toBe(agentBuilderDefaultAgentId);
    }
  );

  it('chrysalis-parity resolves to the dedicated parity agent', () => {
    expect(resolveAgentId(resolveAgentProfile('chrysalis-parity'))).toBe(CHRYSALIS_PARITY_AGENT_ID);
  });

  it('rejects unknown profiles instead of silently falling back', () => {
    expect(() => resolveAgentProfile('parity')).toThrow(/Unknown AGENT_PROFILE 'parity'/);
  });
});
