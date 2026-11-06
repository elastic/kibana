/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  CHRYSALIS_PARITY_AGENT_ID,
  resolveAgentId,
  resolveAgentProfile,
  resolveExpectedToolId,
  withProfileExpectedTools,
} from './agent_profile';

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

  describe('expected tool ids per profile', () => {
    const examples = [
      { id: 'a', metadata: { expectedTools: ['virustotal_lookup', 'security.alerts'] } },
      { id: 'b', metadata: {} },
    ];

    it('maps the seeded lookups to the parity tool ids only for the parity profile', () => {
      expect(resolveExpectedToolId('virustotal_lookup', 'chrysalis-parity')).toBe('vt.hash.lookup');
      expect(resolveExpectedToolId('on_call_lookup', 'chrysalis-parity')).toBe(
        'check.on.call.schedule'
      );
      expect(resolveExpectedToolId('security.alerts', 'chrysalis-parity')).toBe('security.alerts');
      expect(resolveExpectedToolId('virustotal_lookup', 'default')).toBe('virustotal_lookup');
    });

    it('leaves the examples untouched for the default profile', () => {
      expect(withProfileExpectedTools(examples, 'default')).toEqual(examples);
    });

    it('rewrites expectedTools for the parity profile without mutating the input', () => {
      const mapped = withProfileExpectedTools(examples, 'chrysalis-parity');
      expect(mapped[0].metadata.expectedTools).toEqual(['vt.hash.lookup', 'security.alerts']);
      expect(mapped[1]).toBe(examples[1]);
      expect(examples[0].metadata.expectedTools).toEqual(['virustotal_lookup', 'security.alerts']);
    });
  });
});
