/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowYaml } from '@kbn/workflows';
import type { AgentLookup } from './types';
import {
  extractWatchPolicy,
  normalizeWorkflowTriggerType,
  projectCallablesFromDefinition,
  projectSchedule,
} from './project_watch';

describe('project watch', () => {
  describe('extractWatchPolicy', () => {
    it('reads static policy from consts.watch_policy', () => {
      const definition = {
        version: '1',
        name: 'Deep Watch',
        enabled: true,
        triggers: [{ type: 'manual' }],
        consts: {
          watch_policy: {
            mandate: 'Deep investigation & hunts',
            autonomyLevel: 3,
            handoff: 'records',
            ui: { color: '#8b5cf6', icon: 'console', order: 40 },
          },
        },
        steps: [{ name: 'stub', type: 'console', with: { message: 'hi' } }],
      } as unknown as WorkflowYaml;

      expect(extractWatchPolicy(definition)).toMatchObject({
        mandate: 'Deep investigation & hunts',
        autonomyLevel: 3,
        handoff: 'records',
        ui: { color: '#8b5cf6', icon: 'console', order: 40 },
      });
    });
  });

  describe('normalizeWorkflowTriggerType', () => {
    it.each([
      ['scheduled', 'schedule'],
      ['schedule', 'schedule'],
      ['manual', 'manual'],
      [undefined, 'manual'],
      ['alert', 'event'],
      ['cases.caseCreated', 'event'],
      ['workflow-step', 'event'],
    ] as const)('maps %s to %s', (source, expected) => {
      expect(normalizeWorkflowTriggerType(source)).toBe(expected);
    });
  });

  describe('projectSchedule', () => {
    it('uses actual manual-only triggers instead of an incompatible policy mode', () => {
      expect(
        projectSchedule([{ type: 'manual', summary: 'Manual / on demand' }], {
          mode: 'always',
          cadence: 'stream',
          onDemand: false,
        })
      ).toMatchObject({ mode: 'demand', cadence: 'manual', set: false, onDemand: true });
    });

    it('preserves a configured window for scheduled watches', () => {
      expect(
        projectSchedule([{ type: 'schedule', summary: 'Scheduled' }], {
          mode: 'window',
          from: 22,
          to: 6,
        })
      ).toMatchObject({ mode: 'window', set: true, from: 22, to: 6 });
    });
  });

  describe('ai.agent skill ID resolution', () => {
    const makeDefinition = (agentStep: object) =>
      ({
        version: '1',
        name: 'Test',
        enabled: true,
        triggers: [{ type: 'manual' }],
        steps: [agentStep],
      } as unknown as WorkflowYaml);

    /**
     * Build an AgentLookup that knows one agent ('my-agent' of type 'my-type').
     * Pass undefined for either skill list to omit it from the definition (vs empty []).
     * getSkill returns a predictable def ({ name: id, description: `${id} description` })
     * for every ID drawn from agentSkillIds and typeBaseSkillIds.
     */
    const makeAgents = (
      agentSkillIds: string[] | undefined,
      typeBaseSkillIds: string[] | undefined = []
    ): AgentLookup => {
      const knownSkills = new Set([...(agentSkillIds ?? []), ...(typeBaseSkillIds ?? [])]);
      return {
        getAgent: (id) =>
          id === 'my-agent'
            ? { type: 'my-type', configuration: { skill_ids: agentSkillIds } }
            : null,
        getAgentType: (typeId) =>
          typeId === 'my-type' ? { baseConfiguration: { skill_ids: typeBaseSkillIds } } : null,
        getSkill: (id) =>
          knownSkills.has(id) ? { name: id, description: `${id} description` } : null,
      };
    };

    const step = (overrides: object = {}) => ({
      name: 'run',
      type: 'ai.agent',
      'agent-id': 'my-agent',
      with: { message: 'go' },
      ...overrides,
    });

    describe('without step configuration_overrides — uses agent skill_ids', () => {
      it('returns agent skill_ids when the type has no base skills', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition(step()),
          undefined,
          makeAgents(['skill-a', 'skill-b'], [])
        );
        expect(result.map((c) => c.id)).toEqual(['skill-a', 'skill-b']);
      });

      it('prepends type base skills before agent skill_ids', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition(step()),
          undefined,
          makeAgents(['agent-skill'], ['base-skill'])
        );
        expect(result.map((c) => c.id)).toEqual(['base-skill', 'agent-skill']);
      });

      it('returns only base skills when agent has no skill_ids', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition(step()),
          undefined,
          makeAgents(undefined, ['base-skill'])
        );
        expect(result.map((c) => c.id)).toEqual(['base-skill']);
      });

      it('returns empty when both agent and type have no skill_ids', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition(step()),
          undefined,
          makeAgents(undefined, undefined)
        );
        expect(result.map((c) => c.id)).toEqual([]);
      });

      it('deduplicates skills present in both type base and agent', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition(step()),
          undefined,
          makeAgents(['shared', 'agent-only'], ['base-only', 'shared'])
        );
        expect(result.map((c) => c.id)).toEqual(['base-only', 'shared', 'agent-only']);
      });

      it('skips getAgentType when the agent definition has no type field', () => {
        const getAgentType = jest.fn();
        const agents: AgentLookup = {
          getAgent: () => ({ type: undefined, configuration: { skill_ids: ['skill-a'] } }),
          getAgentType,
          getSkill: () => null,
        };
        const result = projectCallablesFromDefinition(makeDefinition(step()), undefined, agents);
        expect(getAgentType).not.toHaveBeenCalled();
        expect(result.map((c) => c.id)).toEqual(['skill-a']);
      });

      it('uses only agent skills when the type is not in the lookup', () => {
        const agents: AgentLookup = {
          getAgent: () => ({ type: 'unknown-type', configuration: { skill_ids: ['skill-a'] } }),
          getAgentType: () => null,
          getSkill: () => null,
        };
        const result = projectCallablesFromDefinition(makeDefinition(step()), undefined, agents);
        expect(result.map((c) => c.id)).toEqual(['skill-a']);
      });
    });

    describe('skill name and description from agent builder registry', () => {
      it('uses skill registry name and description', () => {
        const agents: AgentLookup = {
          ...makeAgents(['my-skill']),
          getSkill: (id) =>
            id === 'my-skill' ? { name: 'My Skill', description: 'Does something useful' } : null,
        };
        const [callable] = projectCallablesFromDefinition(
          makeDefinition(step()),
          undefined,
          agents
        );
        expect(callable.name).toBe('My Skill');
        expect(callable.summary).toBe('Does something useful');
      });

      it('uses skill registry when policy has no callable entry for the skill', () => {
        const agents: AgentLookup = {
          ...makeAgents(['my-skill']),
          getSkill: (id) =>
            id === 'my-skill' ? { name: 'Registry Name', description: 'Registry summary' } : null,
        };
        const policy = {
          callables: [{ id: 'other-skill', name: 'Other', summary: 'Unrelated' }],
        };
        const [callable] = projectCallablesFromDefinition(
          makeDefinition(step()),
          policy as never,
          agents
        );
        expect(callable.name).toBe('Registry Name');
        expect(callable.summary).toBe('Registry summary');
      });

      it('policy callable override takes precedence over skill registry', () => {
        const agents: AgentLookup = {
          ...makeAgents(['my-skill']),
          getSkill: (id) =>
            id === 'my-skill'
              ? { name: 'Registry Name', description: 'Registry description' }
              : null,
        };
        const policy = {
          callables: [
            {
              id: 'my-skill',
              name: 'Override Name',
              summary: 'Override description',
              gated: true,
              enabled: false,
            },
          ],
        };
        const [callable] = projectCallablesFromDefinition(
          makeDefinition(step()),
          policy as never,
          agents
        );
        expect(callable.name).toBe('Override Name');
        expect(callable.summary).toBe('Override description');
        expect(callable.gated).toBe(true);
        expect(callable.enabled).toBe(false);
      });

      it('falls back to humanized id and empty summary when skill is not in registry', () => {
        const agents: AgentLookup = {
          ...makeAgents(['alert-analysis']),
          getSkill: () => null,
        };
        const [callable] = projectCallablesFromDefinition(
          makeDefinition(step()),
          undefined,
          agents
        );
        expect(callable.name).toBe('Alert Analysis');
        expect(callable.summary).toBe('');
      });

      it('uses makeAgents skill defs for name and summary by default', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition(step()),
          undefined,
          makeAgents(['skill-a', 'skill-b'])
        );
        expect(result[0]).toMatchObject({
          id: 'skill-a',
          name: 'skill-a',
          summary: 'skill-a description',
        });
        expect(result[1]).toMatchObject({
          id: 'skill-b',
          name: 'skill-b',
          summary: 'skill-b description',
        });
      });
    });

    describe('with step configuration_overrides.skill_ids — overrides agent skill_ids', () => {
      it('uses override skills instead of agent skill_ids, keeping type base', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition(
            step({ with: { message: 'go', configuration_overrides: { skill_ids: ['override'] } } })
          ),
          undefined,
          makeAgents(['agent-skill'], ['base-skill'])
        );
        expect(result.map((c) => c.id)).toEqual(['base-skill', 'override']);
      });

      it('returns only overrides when the type has no base skills', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition(
            step({ with: { message: 'go', configuration_overrides: { skill_ids: ['override'] } } })
          ),
          undefined,
          makeAgents(['agent-skill'], [])
        );
        expect(result.map((c) => c.id)).toEqual(['override']);
      });

      it('empty override array replaces agent skills, leaving only type base', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition(
            step({ with: { message: 'go', configuration_overrides: { skill_ids: [] } } })
          ),
          undefined,
          makeAgents(['agent-skill'], ['base-skill'])
        );
        expect(result.map((c) => c.id)).toEqual(['base-skill']);
      });

      it('filters non-string entries from the override array', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition(
            step({
              with: {
                message: 'go',
                configuration_overrides: { skill_ids: ['valid', 42, null, 'also-valid'] },
              },
            })
          ),
          undefined,
          makeAgents([], [])
        );
        expect(result.map((c) => c.id)).toEqual(['valid', 'also-valid']);
      });
    });

    describe('fallback to URI scanning', () => {
      it('scans message for skill:// URIs when no lookup is provided', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition(step({ with: { message: 'use skill://uri-skill to proceed' } })),
          undefined
        );
        expect(result.map((c) => c.id)).toEqual(['uri-skill']);
      });

      it('scans message for skill:// URIs when the agent is not in the lookup', () => {
        const agents: AgentLookup = {
          getAgent: () => null,
          getAgentType: () => null,
          getSkill: () => null,
        };
        const result = projectCallablesFromDefinition(
          makeDefinition({
            name: 'run',
            type: 'ai.agent',
            'agent-id': 'unknown-agent',
            with: { message: 'use skill://uri-skill to proceed' },
          }),
          undefined,
          agents
        );
        expect(result.map((c) => c.id)).toEqual(['uri-skill']);
      });

      it('falls back to URI scanning when step has no agent-id', () => {
        const result = projectCallablesFromDefinition(
          makeDefinition({
            name: 'run',
            type: 'ai.agent',
            with: { message: 'use skill://uri-skill to proceed' },
          }),
          undefined,
          makeAgents(['agent-skill'])
        );
        expect(result.map((c) => c.id)).toEqual(['uri-skill']);
      });
    });
  });

  it('discovers workflow callables nested in branch containers', () => {
    const definition = {
      version: '1',
      name: 'Nested callables',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'parallel_work',
          type: 'parallel',
          branches: [
            {
              name: 'worker_branch',
              steps: [
                {
                  name: 'run_worker',
                  type: 'workflow.executeAsync',
                  with: { workflowId: 'system-security-worker' },
                },
              ],
            },
          ],
        },
      ],
    } as unknown as WorkflowYaml;

    expect(projectCallablesFromDefinition(definition, undefined)).toEqual([
      expect.objectContaining({ id: 'system-security-worker', kind: 'workflow' }),
    ]);
  });
});
