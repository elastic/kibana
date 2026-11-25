/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowYaml } from '@kbn/workflows';
import type { InternalAgentDefinition } from '@kbn/agent-builder-server';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { AgentLookup } from './build_agent_lookup';
import { projectSkillsFromDefinition } from './project_skills';

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
        ? ({
            type: 'my-type',
            configuration: { skill_ids: agentSkillIds },
          } as unknown as InternalAgentDefinition)
        : null,
    getAgentType: (typeId) =>
      typeId === 'my-type' ? { baseConfiguration: { skill_ids: typeBaseSkillIds } } : null,
    getSkill: (id) =>
      knownSkills.has(id)
        ? ({ name: id, description: `${id} description` } as unknown as InternalSkillDefinition)
        : null,
  };
};

const step = (overrides: object = {}) => ({
  name: 'run',
  type: 'ai.agent',
  'agent-id': 'my-agent',
  with: { message: 'go' },
  ...overrides,
});

describe('projectSkillsFromDefinition', () => {
  describe('without step configuration_overrides — uses agent skill_ids', () => {
    it('returns agent skill_ids when the type has no base skills', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition(step()),
        makeAgents(['skill-a', 'skill-b'], [])
      );
      expect(result.map((c) => c.id)).toEqual(['skill-a', 'skill-b']);
    });

    it('prepends type base skills before agent skill_ids', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition(step()),
        makeAgents(['agent-skill'], ['base-skill'])
      );
      expect(result.map((c) => c.id)).toEqual(['base-skill', 'agent-skill']);
    });

    it('returns only base skills when agent has no skill_ids', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition(step()),
        makeAgents(undefined, ['base-skill'])
      );
      expect(result.map((c) => c.id)).toEqual(['base-skill']);
    });

    it('returns empty when both agent and type have no skill_ids', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition(step()),
        makeAgents(undefined, undefined)
      );
      expect(result.map((c) => c.id)).toEqual([]);
    });

    it('deduplicates skills present in both type base and agent', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition(step()),
        makeAgents(['shared', 'agent-only'], ['base-only', 'shared'])
      );
      expect(result.map((c) => c.id)).toEqual(['base-only', 'shared', 'agent-only']);
    });

    it('skips getAgentType when the agent definition has no type field', () => {
      const getAgentType = jest.fn();
      const agents: AgentLookup = {
        getAgent: () =>
          ({
            type: undefined,
            configuration: { skill_ids: ['skill-a'] },
          } as unknown as InternalAgentDefinition),
        getAgentType,
        getSkill: () => null,
      };
      const result = projectSkillsFromDefinition(makeDefinition(step()), agents);
      expect(getAgentType).not.toHaveBeenCalled();
      expect(result.map((c) => c.id)).toEqual(['skill-a']);
    });

    it('uses only agent skills when the type is not in the lookup', () => {
      const agents: AgentLookup = {
        getAgent: () =>
          ({
            type: 'unknown-type',
            configuration: { skill_ids: ['skill-a'] },
          } as unknown as InternalAgentDefinition),
        getAgentType: () => null,
        getSkill: () => null,
      };
      const result = projectSkillsFromDefinition(makeDefinition(step()), agents);
      expect(result.map((c) => c.id)).toEqual(['skill-a']);
    });
  });

  describe('skill name and description from agent builder registry', () => {
    it('uses skill registry name and description', () => {
      const agents: AgentLookup = {
        ...makeAgents(['my-skill']),
        getSkill: (id) =>
          id === 'my-skill'
            ? ({
                name: 'My Skill',
                description: 'Does something useful',
              } as unknown as InternalSkillDefinition)
            : null,
      };
      const [callable] = projectSkillsFromDefinition(makeDefinition(step()), agents);
      expect(callable.name).toBe('My Skill');
      expect(callable.summary).toBe('Does something useful');
    });

    it('falls back to humanized id and default summary when skill is not in registry', () => {
      const agents: AgentLookup = {
        ...makeAgents(['alert-analysis']),
        getSkill: () => null,
      };
      const [callable] = projectSkillsFromDefinition(makeDefinition(step()), agents);
      expect(callable.name).toBe('Alert Analysis');
      expect(callable.summary).toBe('Invoked via ai.agent');
    });

    it('uses makeAgents skill defs for name and summary by default', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition(step()),
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
      const result = projectSkillsFromDefinition(
        makeDefinition(
          step({ with: { message: 'go', configuration_overrides: { skill_ids: ['override'] } } })
        ),
        makeAgents(['agent-skill'], ['base-skill'])
      );
      expect(result.map((c) => c.id)).toEqual(['base-skill', 'override']);
    });

    it('returns only overrides when the type has no base skills', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition(
          step({ with: { message: 'go', configuration_overrides: { skill_ids: ['override'] } } })
        ),
        makeAgents(['agent-skill'], [])
      );
      expect(result.map((c) => c.id)).toEqual(['override']);
    });

    it('empty override array replaces agent skills, leaving only type base', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition(
          step({ with: { message: 'go', configuration_overrides: { skill_ids: [] } } })
        ),
        makeAgents(['agent-skill'], ['base-skill'])
      );
      expect(result.map((c) => c.id)).toEqual(['base-skill']);
    });

    it('filters non-string entries from the override array', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition(
          step({
            with: {
              message: 'go',
              configuration_overrides: { skill_ids: ['valid', 42, null, 'also-valid'] },
            },
          })
        ),
        makeAgents([], [])
      );
      expect(result.map((c) => c.id)).toEqual(['valid', 'also-valid']);
    });

    it('returns override skills when there is no agent lookup', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition(
          step({
            with: { message: 'go', configuration_overrides: { skill_ids: ['override-a'] } },
          })
        )
        // no agentLookup
      );
      expect(result.map((c) => c.id)).toEqual(['override-a']);
    });

    it('returns override skills when the agent-id cannot be resolved from the lookup', () => {
      const agents: AgentLookup = {
        getAgent: () => null,
        getAgentType: () => null,
        getSkill: () => null,
      };
      const result = projectSkillsFromDefinition(
        makeDefinition(
          step({
            with: { message: 'go', configuration_overrides: { skill_ids: ['override-b'] } },
          })
        ),
        agents
      );
      expect(result.map((c) => c.id)).toEqual(['override-b']);
    });

    it('does not URI-scan when overrides are present but agent is unresolved', () => {
      const agents: AgentLookup = {
        getAgent: () => null,
        getAgentType: () => null,
        getSkill: () => null,
      };
      const result = projectSkillsFromDefinition(
        makeDefinition(
          step({
            with: {
              message: 'also use skill://uri-skill to proceed',
              configuration_overrides: { skill_ids: ['structured-skill'] },
            },
          })
        ),
        agents
      );
      expect(result.map((c) => c.id)).toEqual(['structured-skill']);
    });
  });

  describe('fallback to URI scanning', () => {
    it('scans message for skill:// URIs when no lookup is provided', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition(step({ with: { message: 'use skill://uri-skill to proceed' } }))
      );
      expect(result.map((c) => c.id)).toEqual(['uri-skill']);
    });

    it('scans message for skill:// URIs when the agent is not in the lookup', () => {
      const agents: AgentLookup = {
        getAgent: () => null,
        getAgentType: () => null,
        getSkill: () => null,
      };
      const result = projectSkillsFromDefinition(
        makeDefinition({
          name: 'run',
          type: 'ai.agent',
          'agent-id': 'unknown-agent',
          with: { message: 'use skill://uri-skill to proceed' },
        }),
        agents
      );
      expect(result.map((c) => c.id)).toEqual(['uri-skill']);
    });

    it('falls back to URI scanning when step has no agent-id', () => {
      const result = projectSkillsFromDefinition(
        makeDefinition({
          name: 'run',
          type: 'ai.agent',
          with: { message: 'use skill://uri-skill to proceed' },
        }),
        makeAgents(['agent-skill'])
      );
      expect(result.map((c) => c.id)).toEqual(['uri-skill']);
    });
  });

  it('discovers skill URIs nested in branch containers', () => {
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
                  name: 'run_agent',
                  type: 'ai.agent',
                  with: { message: 'use skill://nested-skill to proceed' },
                },
              ],
            },
          ],
        },
      ],
    } as unknown as WorkflowYaml;

    expect(projectSkillsFromDefinition(definition)).toEqual([
      expect.objectContaining({ id: 'nested-skill', kind: 'skill' }),
    ]);
  });
});
