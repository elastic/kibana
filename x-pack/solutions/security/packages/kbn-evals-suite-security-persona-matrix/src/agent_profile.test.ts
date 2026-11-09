/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  attachmentTools,
  defaultAgentToolIds,
} from '@kbn/agent-builder-common';
import { PERSONA_MATRIX_EXAMPLES } from './datasets/persona_matrix_prompts';
import { CHRYSALIS_PARITY_AGENT } from './fixtures/chrysalis_parity_agent';
import {
  CHRYSALIS_PARITY_AGENT_ID,
  PERSONA_MATRIX_SUITE_IDS,
  resolveAgentId,
  resolveAgentProfile,
  resolveExpectedToolId,
  resolveSuiteProfileEnv,
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

  describe('resolveSuiteProfileEnv', () => {
    const parityId = PERSONA_MATRIX_SUITE_IDS['chrysalis-parity'];

    it('derives the parity seed and agent from the parity suite id', () => {
      expect(resolveSuiteProfileEnv(parityId, {})).toEqual({
        seed: 'parity',
        agent: 'chrysalis-parity',
      });
    });

    it('accepts explicit values that agree with the suite id', () => {
      expect(
        resolveSuiteProfileEnv(parityId, { seed: 'parity', agent: 'chrysalis-parity' })
      ).toEqual({ seed: 'parity', agent: 'chrysalis-parity' });
    });

    it.each([
      [{ seed: 'minimal' }, /SEED_PROFILE='minimal'/],
      [{ agent: 'default' }, /AGENT_PROFILE='default'/],
    ])('throws when %p conflicts with the parity suite id', (raw, message) => {
      expect(() => resolveSuiteProfileEnv(parityId, raw)).toThrow(message);
    });

    it('throws when the default suite id is given a parity profile', () => {
      expect(() =>
        resolveSuiteProfileEnv(PERSONA_MATRIX_SUITE_IDS.default, { agent: 'chrysalis-parity' })
      ).toThrow(/AGENT_PROFILE='chrysalis-parity'/);
    });

    it.each([{ seed: 'parity' }, { agent: 'chrysalis-parity' }])(
      'tells the user to run the parity suite when the default suite id gets %p',
      (raw) => {
        expect(() => resolveSuiteProfileEnv(PERSONA_MATRIX_SUITE_IDS.default, raw)).toThrow(
          /use `--suite security-persona-matrix-parity` instead/
        );
      }
    );

    it('does not suggest the parity suite when the parity suite id conflicts', () => {
      expect(() => resolveSuiteProfileEnv(parityId, { seed: 'minimal' })).toThrow(
        /Unset it, or run the suite id that matches the profile/
      );
    });

    it.each([undefined, 'security-persona-matrix-attack-discovery', 'some-other-suite'])(
      'leaves env untouched for suite id %p',
      (suiteId) => {
        const raw = { seed: 'parity', agent: 'chrysalis-parity' };
        expect(resolveSuiteProfileEnv(suiteId, raw)).toBe(raw);
        expect(resolveSuiteProfileEnv(suiteId, {})).toEqual({});
      }
    );

    it('keeps the default suite id with no env on the default profiles', () => {
      expect(resolveSuiteProfileEnv(PERSONA_MATRIX_SUITE_IDS.default, {})).toEqual({
        seed: 'minimal',
        agent: 'default',
      });
    });
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
      expect(resolveExpectedToolId('platform.core.cases.manage', 'chrysalis-parity')).toBe(
        'create.case'
      );
      expect(resolveExpectedToolId('platform.core.cases.manage', 'default')).toBe(
        'platform.core.cases.manage'
      );
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

  describe('dataset expectations under the parity profile', () => {
    const parityToolIds: readonly string[] = CHRYSALIS_PARITY_AGENT.toolIds;
    const expectedIds = (profile: 'default' | 'chrysalis-parity') =>
      new Set(
        withProfileExpectedTools(PERSONA_MATRIX_EXAMPLES, profile).flatMap(
          (example) => example.metadata?.expectedTools ?? []
        )
      );

    it('expects the parity case-creation tool instead of the cases-management tool', () => {
      expect(expectedIds('default').has('platform.core.cases.manage')).toBe(true);
      const parity = expectedIds('chrysalis-parity');
      expect(parity.has('platform.core.cases.manage')).toBe(false);
      expect(parity.has('create.case')).toBe(true);
    });

    it('keeps the Elastic capabilities on, which is what supplies the built-in tools', () => {
      expect(CHRYSALIS_PARITY_AGENT.enableElasticCapabilities).toBe(true);
    });

    it('expects only platform.core and attachments built-ins the agent gets by default or at run time', () => {
      // `security.*` and `platform.workflows.*` ids come from skills defined in other
      // plugins; checking them against `skillIds` would need those definitions (a
      // cross-plugin dependency), so only the ids owned by `@kbn/agent-builder-common`
      // are checked here.
      const defaults: readonly string[] = defaultAgentToolIds;
      const attachments: readonly string[] = Object.values(attachmentTools);
      const uncovered = [...expectedIds('chrysalis-parity')].filter(
        (id) =>
          (id.startsWith('platform.core.') && !defaults.includes(id)) ||
          (id.startsWith('attachments.') && !attachments.includes(id))
      );
      expect(uncovered).toEqual([]);
    });

    it('leaves no seeded custom tool id that the parity agent does not carry', () => {
      // Built-ins (platform.*, security.*, attachments.*) reach the agent through
      // its default tools, skills or the run itself; every other id is a seeded
      // custom tool and must be one of the agent's own.
      const custom = [...expectedIds('chrysalis-parity')].filter(
        (id) => !/^(platform|security|attachments)\./.test(id)
      );
      expect(custom.filter((id) => !parityToolIds.includes(id))).toEqual([]);
    });
  });
});
