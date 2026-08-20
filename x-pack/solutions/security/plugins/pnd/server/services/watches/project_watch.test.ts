/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentLookup } from './types';
import { parse } from 'yaml';
import type { WorkflowListItemDto, WorkflowYaml } from '@kbn/workflows';
import {
  getManagedWorkflowDefinition,
  PND_RULE_CREATION_WORKFLOW_ID,
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW_ID,
  PND_WATCH_DETECTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { WATCH_DETECTION_TAG, WATCH_TAG } from '@kbn/pnd-common';
import {
  extractWatchPolicy,
  normalizeWorkflowTriggerType,
  projectCallablesFromDefinition,
  projectSchedule,
  projectWorkflowToWatch,
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
            handoff: 'records',
            ui: { color: '#8b5cf6', icon: 'console', order: 40 },
          },
        },
        steps: [{ name: 'stub', type: 'console', with: { message: 'hi' } }],
      } as unknown as WorkflowYaml;

      expect(extractWatchPolicy(definition)).toMatchObject({
        mandate: 'Deep investigation & hunts',
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

  describe('detection watch definition', () => {
    const managed = getManagedWorkflowDefinition(PND_WATCH_DETECTION_WORKFLOW_ID);
    const definition = parse(managed!.yaml!) as WorkflowYaml;

    interface NestedStep {
      name: string;
      type: string;
      if?: string;
      condition?: string;
      steps?: NestedStep[];
      else?: NestedStep[];
    }

    const flattenSteps = (steps: NestedStep[]): NestedStep[] =>
      steps.flatMap((step) => [
        step,
        ...flattenSteps(step.steps ?? []),
        ...flattenSteps(step.else ?? []),
      ]);

    const projected = projectWorkflowToWatch({
      id: PND_WATCH_DETECTION_WORKFLOW_ID,
      name: definition.name,
      description: definition.description,
      enabled: true,
      managed: true,
      definition,
    } as unknown as WorkflowListItemDto);

    it('projects the detection tier tags and catalog position', () => {
      expect(projected.tags).toEqual(expect.arrayContaining([WATCH_TAG, WATCH_DETECTION_TAG]));
      expect(projected.managed).toBe(true);
      expect(projected.sortOrder).toBe(50);
      expect(projected.mandate).toBe('Detection engineering');
    });

    it('projects a manual-only trigger', () => {
      expect(projected.triggers.map(({ type }) => type)).toEqual(['manual']);
      expect(projected.schedule.cadence).toBe('manual');
    });

    it('dispatches to exactly one worker per run', () => {
      const steps = definition.steps as Array<{
        name: string;
        type: string;
        condition?: string;
        steps?: Array<{ name: string }>;
        else?: Array<{ name: string }>;
      }>;
      const dispatch = steps.find(({ name }) => name === 'dispatch_worker');

      expect(dispatch?.type).toBe('if');
      expect(dispatch?.condition).toContain("worker == 'tuning'");
      expect(dispatch?.steps?.map(({ name }) => name)).toEqual(['run_rule_tuning']);
      expect(dispatch?.else?.map(({ name }) => name)).toEqual(['run_rule_creation']);
    });

    it('calls each worker exactly once', () => {
      const calls = flattenSteps(definition.steps as unknown as NestedStep[]).filter(
        ({ type }) => type === 'workflow.execute'
      );

      expect(calls.map(({ name }) => name)).toEqual(['run_rule_tuning', 'run_rule_creation']);
    });

    it('projects the two workers it calls, and no skills of its own', () => {
      expect(projected.callables).toEqual([
        expect.objectContaining({ id: PND_RULE_TUNING_WORKFLOW_ID, kind: 'workflow' }),
        expect.objectContaining({ id: PND_RULE_CREATION_WORKFLOW_ID, kind: 'workflow' }),
      ]);
    });

    // `| default: []` silently resolves to undefined because Liquid has no array
    // literal, which breaks any foreach whose source step produced no rows.
    it('never falls back to a bare [] literal in the detection workflows', () => {
      const ids = [
        PND_WATCH_DETECTION_WORKFLOW_ID,
        PND_RULE_TUNING_WORKFLOW_ID,
        PND_RULE_CREATION_WORKFLOW_ID,
        PND_RULE_PREVIEW_WORKFLOW_ID,
      ];

      for (const id of ids) {
        const withoutComments = getManagedWorkflowDefinition(id)!
          .yaml!.split('\n')
          .filter((line) => !line.trimStart().startsWith('#'))
          .join('\n');

        expect(withoutComments).not.toMatch(/default:\s*\[\s*\]/);
      }
    });

    // Liquid cannot group a condition with parentheses; it raises a tokenization error
    // that fails the step at runtime, long after the definition installs cleanly.
    it('groups no step condition with parentheses', () => {
      const ids = [
        PND_WATCH_DETECTION_WORKFLOW_ID,
        PND_RULE_TUNING_WORKFLOW_ID,
        PND_RULE_CREATION_WORKFLOW_ID,
        PND_RULE_PREVIEW_WORKFLOW_ID,
      ];

      for (const id of ids) {
        const { steps } = parse(getManagedWorkflowDefinition(id)!.yaml!) as WorkflowYaml;
        const conditions = flattenSteps(steps as unknown as NestedStep[]).flatMap(
          ({ name, if: stepIf, condition }) =>
            [stepIf, condition].filter(Boolean).map((expr) => [name, expr] as const)
        );

        expect(conditions.length).toBeGreaterThan(0);
        for (const [name, expr] of conditions) {
          expect({ name, expr }).toEqual({ name, expr: expect.not.stringContaining('(') });
        }
      }
    });

    // A legacy `type: array` output is compiled to an array of scalars, so emitting
    // objects through one fails output validation at runtime.
    it('declares no array outputs in the detection workflows', () => {
      const ids = [
        PND_WATCH_DETECTION_WORKFLOW_ID,
        PND_RULE_TUNING_WORKFLOW_ID,
        PND_RULE_CREATION_WORKFLOW_ID,
        PND_RULE_PREVIEW_WORKFLOW_ID,
      ];

      for (const id of ids) {
        const { outputs } = parse(getManagedWorkflowDefinition(id)!.yaml!) as WorkflowYaml;
        const declared = Array.isArray(outputs) ? (outputs as Array<{ type?: string }>) : [];

        expect(declared.map(({ type }) => type)).not.toContain('array');
      }
    });

    // The preview API validates timeframeEnd with zod's `.datetime()`, which rejects a
    // UTC offset and only accepts a `Z` suffix.
    it('sends every preview timeframeEnd as UTC', () => {
      for (const id of [PND_RULE_TUNING_WORKFLOW_ID, PND_RULE_CREATION_WORKFLOW_ID]) {
        const lines = getManagedWorkflowDefinition(id)!
          .yaml!.split('\n')
          .filter((line) => line.includes('timeframeEnd'));

        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
          expect(line).not.toContain('%:z');
        }
      }
    });

    // Only `waitForApproval` renders the approve/reject buttons; a `waitForInput` gate
    // makes an analyst hand-author the resume payload as JSON instead.
    it('gates both workers on an approval step that reads response.approved', () => {
      for (const id of [PND_RULE_TUNING_WORKFLOW_ID, PND_RULE_CREATION_WORKFLOW_ID]) {
        const { steps } = parse(getManagedWorkflowDefinition(id)!.yaml!) as WorkflowYaml;
        const all = flattenSteps(steps as unknown as NestedStep[]);
        const gates = all.filter(({ type }) => type === 'waitForApproval');

        expect(gates).toHaveLength(1);
        expect(all.map(({ type }) => type)).not.toContain('waitForInput');

        const [gate] = gates;
        const conditions = all
          .flatMap(({ if: stepIf }) => (stepIf ? [stepIf] : []))
          .filter((expr) => expr.includes(gate.name));

        expect(conditions.length).toBeGreaterThan(0);
        for (const expr of conditions) {
          expect(expr).toContain(`steps.${gate.name}.output.response.approved`);
        }
      }
    });

    it('keeps the skills and the preview worker inside the workers themselves', () => {
      const workerCallables = (id: string) =>
        projectCallablesFromDefinition(
          parse(getManagedWorkflowDefinition(id)!.yaml!) as WorkflowYaml,
          undefined
        );

      expect(workerCallables(PND_RULE_TUNING_WORKFLOW_ID)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'investigate-rule', kind: 'skill' }),
          expect.objectContaining({ id: PND_RULE_PREVIEW_WORKFLOW_ID, kind: 'workflow' }),
        ])
      );
      expect(workerCallables(PND_RULE_CREATION_WORKFLOW_ID)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'detection-rule-edit', kind: 'skill' }),
          expect.objectContaining({ id: PND_RULE_PREVIEW_WORKFLOW_ID, kind: 'workflow' }),
        ])
      );
    });
  });
});
