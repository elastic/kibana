/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type { WorkflowListItemDto, WorkflowYaml } from '@kbn/workflows';
import {
  getManagedWorkflowDefinition,
  PND_RULE_CREATION_WORKFLOW_ID,
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW_ID,
  PND_WATCH_DETECTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { AgentLookup } from '../utils';
import type { InternalAgentDefinition } from '@kbn/agent-builder-server/agents';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { WATCH_DETECTION_TAG, WATCH_TAG } from '@kbn/pnd-common';
import {
  extractWatchPolicy,
  normalizeWorkflowTriggerType,
  projectSkillsFromDefinition,
  projectSchedule,
  projectWorkflowToWatch,
} from './project_watch';

const DETECTION_WORKFLOW_IDS = [
  PND_WATCH_DETECTION_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW_ID,
  PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID,
  PND_RULE_CREATION_WORKFLOW_ID,
  PND_RULE_PREVIEW_WORKFLOW_ID,
];

const getManagedYaml = (workflowId: string): string => {
  const definition = getManagedWorkflowDefinition(workflowId);
  if (!definition) throw new Error(`Missing managed workflow definition for "${workflowId}"`);
  if ('yaml' in definition && definition.yaml) return definition.yaml;
  if ('yamlTemplate' in definition && definition.yamlTemplate) {
    return definition.yamlTemplate({ settingsVersion: 1, autonomyLevel: 'manual' });
  }
  throw new Error(`Managed workflow definition "${workflowId}" has no YAML source`);
};

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
            ui: { color: '#8b5cf6', order: 40 },
          },
        },
        steps: [{ name: 'stub', type: 'console', with: { message: 'hi' } }],
      } as unknown as WorkflowYaml;

      expect(extractWatchPolicy(definition)).toMatchObject({
        mandate: 'Deep investigation & hunts',
        handoff: 'records',
        ui: { color: '#8b5cf6', order: 40 },
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
    it('derives on-demand behavior from a manual trigger', () => {
      expect(projectSchedule([{ type: 'manual', summary: 'Manual / on demand' }])).toMatchObject({
        mode: 'demand',
        cadence: 'manual',
        set: false,
        onDemand: true,
        handoff: 'none',
      });
    });

    it('derives a neutral full-day projection from a scheduled trigger', () => {
      expect(projectSchedule([{ type: 'schedule', summary: 'Scheduled' }])).toMatchObject({
        mode: 'always',
        set: true,
        from: 0,
        to: 23,
        onDemand: false,
      });
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

    describe('without step configuration_overrides — uses agent skill_ids', () => {
      it('returns agent skill_ids when the type has no base skills', () => {
        const result = projectSkillsFromDefinition(
          makeDefinition(step()),
          undefined,
          makeAgents(['skill-a', 'skill-b'], [])
        );
        expect(result.map((c) => c.id)).toEqual(['skill-a', 'skill-b']);
      });

      it('prepends type base skills before agent skill_ids', () => {
        const result = projectSkillsFromDefinition(
          makeDefinition(step()),
          undefined,
          makeAgents(['agent-skill'], ['base-skill'])
        );
        expect(result.map((c) => c.id)).toEqual(['base-skill', 'agent-skill']);
      });

      it('returns only base skills when agent has no skill_ids', () => {
        const result = projectSkillsFromDefinition(
          makeDefinition(step()),
          undefined,
          makeAgents(undefined, ['base-skill'])
        );
        expect(result.map((c) => c.id)).toEqual(['base-skill']);
      });

      it('returns empty when both agent and type have no skill_ids', () => {
        const result = projectSkillsFromDefinition(
          makeDefinition(step()),
          undefined,
          makeAgents(undefined, undefined)
        );
        expect(result.map((c) => c.id)).toEqual([]);
      });

      it('deduplicates skills present in both type base and agent', () => {
        const result = projectSkillsFromDefinition(
          makeDefinition(step()),
          undefined,
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
        const result = projectSkillsFromDefinition(makeDefinition(step()), undefined, agents);
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
        const result = projectSkillsFromDefinition(makeDefinition(step()), undefined, agents);
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
        const [callable] = projectSkillsFromDefinition(makeDefinition(step()), undefined, agents);
        expect(callable.name).toBe('My Skill');
        expect(callable.summary).toBe('Does something useful');
      });

      it('uses skill registry when policy has no callable entry for the skill', () => {
        const agents: AgentLookup = {
          ...makeAgents(['my-skill']),
          getSkill: (id) =>
            id === 'my-skill'
              ? ({
                  name: 'Registry Name',
                  description: 'Registry summary',
                } as unknown as InternalSkillDefinition)
              : null,
        };
        const policy = {
          callables: [{ id: 'other-skill', name: 'Other', summary: 'Unrelated' }],
        };
        const [callable] = projectSkillsFromDefinition(
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
              ? ({
                  name: 'Registry Name',
                  description: 'Registry description',
                } as unknown as InternalSkillDefinition)
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
        const [callable] = projectSkillsFromDefinition(
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
        const [callable] = projectSkillsFromDefinition(makeDefinition(step()), undefined, agents);
        expect(callable.name).toBe('Alert Analysis');
        expect(callable.summary).toBe('Invoked via ai.agent');
      });

      it('uses makeAgents skill defs for name and summary by default', () => {
        const result = projectSkillsFromDefinition(
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
        const result = projectSkillsFromDefinition(
          makeDefinition(
            step({ with: { message: 'go', configuration_overrides: { skill_ids: ['override'] } } })
          ),
          undefined,
          makeAgents(['agent-skill'], ['base-skill'])
        );
        expect(result.map((c) => c.id)).toEqual(['base-skill', 'override']);
      });

      it('returns only overrides when the type has no base skills', () => {
        const result = projectSkillsFromDefinition(
          makeDefinition(
            step({ with: { message: 'go', configuration_overrides: { skill_ids: ['override'] } } })
          ),
          undefined,
          makeAgents(['agent-skill'], [])
        );
        expect(result.map((c) => c.id)).toEqual(['override']);
      });

      it('empty override array replaces agent skills, leaving only type base', () => {
        const result = projectSkillsFromDefinition(
          makeDefinition(
            step({ with: { message: 'go', configuration_overrides: { skill_ids: [] } } })
          ),
          undefined,
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
          undefined,
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
          ),
          undefined
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
          undefined,
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
          undefined,
          agents
        );
        // Only the structured override is returned; URI scanning is not run.
        expect(result.map((c) => c.id)).toEqual(['structured-skill']);
      });
    });

    describe('fallback to URI scanning', () => {
      it('scans message for skill:// URIs when no lookup is provided', () => {
        const result = projectSkillsFromDefinition(
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
        const result = projectSkillsFromDefinition(
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
        const result = projectSkillsFromDefinition(
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

    expect(projectSkillsFromDefinition(definition, undefined)).toEqual([
      expect.objectContaining({ id: 'nested-skill', kind: 'skill' }),
    ]);
  });

  describe('detection watch definition', () => {
    const definition = parse(getManagedYaml(PND_WATCH_DETECTION_WORKFLOW_ID)) as WorkflowYaml;

    interface NestedStep {
      name: string;
      type: string;
      if?: string;
      condition?: string;
      with?: Record<string, unknown>;
      steps?: NestedStep[];
      else?: NestedStep[];
      'on-failure'?: Record<string, unknown>;
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

    it('projects the scheduled sweep and keeps on-demand runs available', () => {
      expect(projected.triggers.map(({ type }) => type)).toEqual(['schedule', 'manual']);
      expect(projected.schedule.cadence).toBe('sweep');
      expect(projected.schedule.onDemand).toBe(true);
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

    // Tuning is async because the sweep joins on its proposal gates and can park
    // for 72h; a sync call would park this watch run and its concurrency slot too.
    it('calls each worker exactly once, the tuning sweep asynchronously', () => {
      const calls = flattenSteps(definition.steps as unknown as NestedStep[]).filter(({ type }) =>
        ['workflow.execute', 'workflow.executeAsync'].includes(String(type))
      );

      expect(calls.map(({ name, type }) => [name, type])).toEqual([
        ['run_rule_tuning', 'workflow.executeAsync'],
        ['run_rule_creation', 'workflow.execute'],
      ]);
    });

    it('projects no skills of its own', () => {
      expect(projected.skills).toEqual([]);
    });

    // `| default: []` silently resolves to undefined because Liquid has no array
    // literal, which breaks any foreach whose source step produced no rows.
    it('never falls back to a bare [] literal in the detection workflows', () => {
      for (const id of DETECTION_WORKFLOW_IDS) {
        const withoutComments = getManagedYaml(id)
          .split('\n')
          .filter((line) => !line.trimStart().startsWith('#'))
          .join('\n');

        expect(withoutComments).not.toMatch(/default:\s*\[\s*\]/);
      }
    });

    // Liquid cannot group a condition with parentheses; it raises a tokenization error
    // that fails the step at runtime, long after the definition installs cleanly.
    it('groups no step condition with parentheses', () => {
      const conditions = DETECTION_WORKFLOW_IDS.flatMap((id) => {
        const { steps } = parse(getManagedYaml(id)) as WorkflowYaml;
        return flattenSteps(steps as unknown as NestedStep[]).flatMap(
          ({ name, if: stepIf, condition }) =>
            [stepIf, condition].filter(Boolean).map((expr) => [name, expr] as const)
        );
      });

      expect(conditions.length).toBeGreaterThan(0);
      for (const [name, expr] of conditions) {
        expect({ name, expr }).toEqual({ name, expr: expect.not.stringContaining('(') });
      }
    });

    // A legacy `type: array` output is compiled to an array of scalars, so emitting
    // objects through one fails output validation at runtime.
    it('declares no array outputs in the detection workflows', () => {
      for (const id of DETECTION_WORKFLOW_IDS) {
        const { outputs } = parse(getManagedYaml(id)) as WorkflowYaml;
        const declared = Array.isArray(outputs) ? (outputs as Array<{ type?: string }>) : [];

        expect(declared.map(({ type }) => type)).not.toContain('array');
      }
    });

    // The preview API validates timeframeEnd with zod's `.datetime()`, which rejects a
    // UTC offset and only accepts a `Z` suffix.
    it('sends every preview timeframeEnd as UTC', () => {
      for (const id of [PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID, PND_RULE_CREATION_WORKFLOW_ID]) {
        const lines = getManagedYaml(id)
          .split('\n')
          .filter((line) => line.includes('timeframeEnd'));

        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
          expect(line).not.toContain('%:z');
        }
      }
    });

    // Only `waitForApproval` renders the approve/reject buttons; a `waitForInput` gate
    // makes an analyst hand-author the resume payload as JSON instead.
    it('gates the proposal and creation workers on approval responses', () => {
      for (const id of [PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID, PND_RULE_CREATION_WORKFLOW_ID]) {
        const { steps } = parse(getManagedYaml(id)) as WorkflowYaml;
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

    // The sweep has no ai.agent step; the diagnosing skill lives in the proposal child.
    it('keeps the skills inside the workers themselves', () => {
      const workerSkills = (id: string) =>
        projectSkillsFromDefinition(parse(getManagedYaml(id)) as WorkflowYaml, undefined);

      expect(workerSkills(PND_RULE_TUNING_WORKFLOW_ID)).toEqual([]);
      expect(workerSkills(PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID)).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'investigate-rule', kind: 'skill' })])
      );
      expect(workerSkills(PND_RULE_CREATION_WORKFLOW_ID)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'detection-rule-edit', kind: 'skill' }),
        ])
      );
    });

    describe('rule tuning alert marking', () => {
      const tuning = parse(
        getManagedWorkflowDefinition(PND_RULE_TUNING_WORKFLOW_ID)!.yaml!
      ) as WorkflowYaml;
      const proposal = parse(
        getManagedWorkflowDefinition(PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID)!.yaml!
      ) as WorkflowYaml;
      const tuningSteps = flattenSteps(tuning.steps as unknown as NestedStep[]);
      const proposalSteps = flattenSteps(proposal.steps as unknown as NestedStep[]);
      const harvest = tuningSteps.find(({ name }) => name === 'harvest_fp_alerts_by_rule')!;
      const harvestQuery = String(harvest.with?.query);
      const reviewedTag = (tuning.consts as Record<string, string>).reviewed_tag;
      const tagSteps = proposalSteps.filter(({ type }) => type === 'security.setAlertTags');

      // The newest reviewed alert is a per-rule watermark: every FP at or before it
      // counts as addressed, tagged or not, so FPs beyond the tagged newest-100 batch
      // cannot be rediagnosed on the next sweep.
      it('retires everything at or before the newest reviewed alert', () => {
        expect(reviewedTag).toEqual(expect.any(String));
        expect(harvestQuery).toContain('MV_CONTAINS(`kibana.alert.workflow_tags`');
        expect(harvestQuery).toContain('{{ consts.reviewed_tag }}');
        expect(harvestQuery).toContain('INLINE STATS reviewed_watermark = MAX(@timestamp)');
        expect(harvestQuery).toContain('BY `kibana.alert.rule.uuid`');
        expect(harvestQuery).toContain(
          '(reviewed_watermark IS NULL OR @timestamp > reviewed_watermark)'
        );
      });

      it('measures FP rate independently from the unreviewed work queue', () => {
        expect(harvestQuery).toContain('fp_rate_count = COUNT(*) WHERE is_fp');
        expect(harvestQuery).toContain('fp_rate_count * 100 >= total_count');
      });

      // A proposal can outlive its sweep (cancelled sweep, manual run). Its rule must
      // not consume a sweep slot again while the gate is pending, so the harvest
      // excludes rules with an in-flight proposal, and fails open when the lookup or
      // the group-key parse cannot be trusted.
      it('skips rules whose proposal is still in flight', () => {
        const lookup = tuningSteps.find(({ name }) => name === 'list_active_proposals')!;
        const path = String(lookup.with?.path);
        const nonTerminal = [
          'pending',
          'waiting',
          'waiting_for_input',
          'waiting_for_child',
          'running',
          'queued',
        ];

        expect(path).toContain(
          `/api/workflows/workflow/${PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID}/executions?`
        );
        for (const status of nonTerminal) {
          expect(path).toContain(`statuses=${status}`);
        }
        expect(lookup['on-failure']).toEqual({ continue: true });

        const resolve = tuningSteps.find(({ name }) => name === 'resolve_active_rules')!;
        expect(String(resolve.if)).toContain(
          'parsed_count == steps.collect_active_rules.output.expected'
        );

        const filter = JSON.stringify(harvest.with?.filter);
        expect(filter).toContain('must_not');
        expect(filter).toContain(
          '"kibana.alert.rule.uuid":"${{ steps.resolve_active_rules.output.rule_uuids | default: consts.no_rows }}"'
        );
      });

      it('does not split one rule history when its name changes', () => {
        const groupClause = harvestQuery
          .split('\n')
          .find((line) => line.trimStart().startsWith('BY '));

        expect(groupClause).not.toContain('kibana.alert.rule.name');
      });

      // The per-document exclusions live in the DSL filter so Lucene drops the rows
      // before ES|QL sees them.
      it('excludes hidden building-block alerts and bounds the window in the filter', () => {
        const filter = JSON.stringify(harvest.with?.filter);

        expect(filter).toContain('"exists":{"field":"kibana.alert.building_block_type"}');
        expect(filter).toContain(
          '"range":{"@timestamp":{"gte":"now-{{ inputs.analysis_window_days | default: consts.analysis_window_days }}d"}}'
        );
      });

      // The tag API writes to the alerts index of the space it runs in, so anything the
      // harvest reads outside that space could never be marked.
      it('harvests only the space it can tag in', () => {
        expect(harvestQuery).toContain('FROM .alerts-security.alerts-{{ workflow.spaceId }}');
      });

      // A partial aggregation returns a short alert_ids list, so alerts that drove an
      // approved change would stay untagged and come back on the next sweep.
      it('refuses partial harvest results', () => {
        expect(harvest.with?.allow_partial_results).toBe(false);
      });

      it('tags the harvested alerts once a decision is recorded', () => {
        expect(tagSteps.map(({ name }) => name)).toEqual([
          'mark_alerts_dismissed',
          'mark_alerts_applied',
          'mark_alerts_handoff',
        ]);

        const [dismissed, applied, handoff] = tagSteps;
        expect(dismissed.if).toContain('steps.review_tuning.output.response.approved == false');
        expect(dismissed.with?.tags_to_add).toBe('${{ consts.dismissed_tags }}');
        for (const step of [applied, handoff]) {
          expect(step.if).toContain('steps.review_tuning.output.response.approved == true');
        }
        expect(applied.with?.tags_to_add).toBe('${{ consts.applied_tags }}');
        expect(handoff.with?.tags_to_add).toBe('${{ consts.handoff_tags }}');
        for (const step of tagSteps) {
          expect(step).not.toHaveProperty('on-failure');
        }
      });

      // The applied tag must mean this pipeline changed the rule. Manual handoffs use a
      // distinct outcome; failed query applications remain unreviewed for a later retry.
      it('tags applied only when the rule was actually patched', () => {
        const applied = tagSteps.find(({ name }) => name === 'mark_alerts_applied')!;

        expect(applied.if).toContain('steps.record_outcome.output.rule_patched == true');

        const outcome = proposalSteps.find(({ name }) => name === 'record_outcome')!;
        expect(String(outcome.with?.rule_patched)).toContain(
          'steps.apply_query_tuning.error == null'
        );
      });

      // The gate can stay open for 72h; a stale approval must not clobber an analyst
      // edit made in the meantime. Both reads go by saved-object id, so a rule
      // deleted and recreated under the same signature 404s instead of matching.
      it('re-reads the rule after approval and applies only when it is unchanged', () => {
        const fetches = proposalSteps.filter(({ name }) =>
          ['fetch_rule', 'refetch_rule'].includes(name)
        );
        const apply = proposalSteps.find(({ name }) => name === 'apply_query_tuning')!;
        const eligibility = proposalSteps.find(({ name }) => name === 'decide_apply')!;
        expect(fetches).toHaveLength(2);
        for (const fetch of fetches) {
          expect(String(fetch.with?.path)).toContain('?id={{ inputs.rule_uuid | url_encode }}');
        }
        expect(String(eligibility.with?.eligible)).toContain(
          'steps.refetch_rule.output.updated_at == steps.fetch_rule.output.updated_at'
        );
        expect((apply.with?.body as Record<string, string>).id).toBe(
          '{{ steps.refetch_rule.output.id }}'
        );
        expect(proposalSteps.some(({ name }) => name === 'refetch_rule')).toBe(true);
      });

      // Both backtests run inside one preview worker execution: one synchronous
      // child per wake-up cycle is safe, while two consecutive child calls share
      // one immediate-resume slot and can strand the proposal in waiting_for_child.
      it('backtests both queries through a single preview worker run', () => {
        const children = proposalSteps.filter(({ type }) => type === 'workflow.execute');

        expect(children.map(({ name }) => name)).toEqual(['run_previews']);
        const [previews] = children;
        expect(previews.with?.['workflow-id']).toBe(PND_RULE_PREVIEW_WORKFLOW_ID);

        const previewInputs = previews.with?.inputs as Record<
          string,
          Record<string, string> | string
        >;
        expect((previewInputs.preview_body as Record<string, string>).query).toBe(
          '{{ steps.fetch_rule.output.query }}'
        );
        expect((previewInputs.proposed_body as Record<string, string>).query).toBe(
          '{{ steps.diagnose_rule.output.structured_output.proposed_query }}'
        );
      });

      it('requires both previews before applying a query change', () => {
        const eligibility = proposalSteps.find(({ name }) => name === 'decide_apply')!;
        const condition = String(eligibility.with?.eligible);

        expect(condition).toContain('current_succeeded == true');
        expect(condition).toContain('current_is_aborted == false');
        expect(condition).toContain('proposed_succeeded == true');
        expect(condition).toContain('proposed_is_aborted == false');
      });

      // A partial or timed-out alert count would understate a backtest, so the
      // preview worker must fail its verdict instead of reporting a low number.
      it('fails preview verdicts on partial counts', () => {
        const preview = parse(getManagedYaml(PND_RULE_PREVIEW_WORKFLOW_ID)) as WorkflowYaml;
        const previewSteps = flattenSteps(preview.steps as unknown as NestedStep[]);
        const counts = previewSteps.filter(({ type }) => type === 'elasticsearch.search');
        const emit = previewSteps.find(({ name }) => name === 'emit_result')!;
        const emitInput = JSON.stringify(emit.with);

        expect(counts).toHaveLength(2);
        for (const count of counts) {
          expect(count.with?.allow_partial_search_results).toBe(false);
        }
        for (const verdict of ['succeeded', 'proposed_succeeded']) {
          expect(String((emit.with as Record<string, string>)[verdict])).toContain(
            'timed_out == false'
          );
        }
        expect(emitInput).toContain('_shards.failed == 0');
      });

      it('keeps query modes with omitted preview fields as manual handoffs', () => {
        const support = proposalSteps.find(({ name }) => name === 'record_auto_apply_support')!;
        const eligibility = proposalSteps.find(({ name }) => name === 'decide_apply')!;
        const condition = String(eligibility.with?.eligible);

        expect(String(support.with?.supported)).toContain(
          'steps.fetch_rule.output.data_view_id == null'
        );
        expect(String(support.with?.supported)).toContain(
          'steps.fetch_rule.output.timestamp_override == null'
        );
        expect(String(support.with?.supported)).toContain(
          'steps.fetch_rule.output.alert_suppression == null'
        );
        expect(condition).toContain('steps.record_auto_apply_support.output.supported == true');
      });

      it('bounds direct proposal inputs', () => {
        const [trigger] = proposal.triggers as unknown as Array<{
          inputs: { properties: Record<string, Record<string, unknown>> };
        }>;
        const { properties } = trigger.inputs;

        expect(properties.rule_uuid).toEqual(expect.objectContaining({ maxLength: 512 }));
        expect(properties.alert_ids).toEqual(
          expect.objectContaining({ minItems: 1, maxItems: 100 })
        );
        expect(properties.analysis_window_days).toEqual(
          expect.objectContaining({ minimum: 1, maximum: 30 })
        );
        expect(properties.preview_invocation_count).toEqual(
          expect.objectContaining({ minimum: 1, maximum: 10 })
        );
      });

      // The tag API requires an array; only a value that is exactly one `${{ }}`
      // expression survives templating as an array instead of a string.
      it('passes tags_to_add as a single expression, never a template', () => {
        for (const step of tagSteps) {
          expect(String(step.with?.tags_to_add)).toMatch(/^\$\{\{ [\w.]+ \}\}$/);
        }
      });

      it('declares the decision tag sets, each carrying the reviewed tag the harvest filters', () => {
        expect(proposal.consts).toEqual(
          expect.objectContaining({
            dismissed_tags: ['detection-watch:tuning-reviewed', 'detection-watch:tuning-dismissed'],
            applied_tags: ['detection-watch:tuning-reviewed', 'detection-watch:tuning-applied'],
            handoff_tags: ['detection-watch:tuning-reviewed', 'detection-watch:tuning-handoff'],
          })
        );

        const tagConsts = proposal.consts as Record<string, string[]>;
        for (const tags of [
          tagConsts.dismissed_tags,
          tagConsts.applied_tags,
          tagConsts.handoff_tags,
        ]) {
          expect(tags).toContain(reviewedTag);
        }
      });

      // The diagnose prompt names a security_solution inline tool by its string id; a
      // skill-side rename would silently degrade the agent back to re-deriving alerts.
      it('pins the get_alerts_by_ids tool id the diagnose prompt depends on', () => {
        const diagnose = proposalSteps.find(({ name }) => name === 'diagnose_rule')!;
        expect(String(diagnose.with?.message)).toContain('investigate-rule.get_alerts_by_ids');
      });

      // The harvested ids are the dataset. A security.alerts query would re-fetch the
      // same alerts through a natural-language round trip and burn agent time.
      it('keeps the diagnosis on the supplied ids instead of querying alerts again', () => {
        const diagnose = proposalSteps.find(({ name }) => name === 'diagnose_rule')!;
        const message = String(diagnose.with?.message);

        expect(message).toContain('do not run the security.alerts queries');
        expect(message).not.toContain('time_window_hours');
      });

      it('does not use classify_proposal or can_apply', () => {
        for (const steps of [tuningSteps, proposalSteps]) {
          expect(steps.some(({ name }) => name === 'classify_proposal')).toBe(false);
          expect(JSON.stringify(steps)).not.toContain('can_apply');
        }
      });

      // The harvest projects its columns positionally, so reordering KEEP would make the
      // sweep hand some other column to the proposal as the alert ids.
      it('passes the alert ids from the column position KEEP assigns them', () => {
        const keepClause = harvestQuery
          .split('\n')
          .find((line) => line.trimStart().startsWith('| KEEP'))!;
        const columns = keepClause
          .replace('| KEEP', '')
          .split(',')
          .map((column) => column.trim().replace(/`/g, ''));
        const launch = tuningSteps.find(({ name }) => name === 'run_proposal')!;
        const launchInputs = launch.with?.inputs as Record<string, string>;

        expect(columns).toContain('alert_ids');
        expect(launchInputs.alert_ids).toContain(`foreach.item.${columns.indexOf('alert_ids')}`);
        for (const step of tagSteps) {
          expect(step.with?.alert_ids).toBe('${{ inputs.alert_ids }}');
        }
      });

      // TOP sorts by the collected value, so plain _id collection has no meaningful
      // order. The harvest collects sortable `timestamp|id` keys and expands them
      // back to plain ids, so alert_ids is exactly the newest-100 set: it grounds
      // the diagnosis and, once tagged, places the reviewed watermark.
      it('keeps only the newest false positives as alert ids', () => {
        expect(harvestQuery).toContain(
          'fp_recency_key = CONCAT(DATE_FORMAT("yyyyMMddHHmmssSSS", @timestamp), "|", _id)'
        );
        expect(harvestQuery).toContain('recent_keys = TOP(fp_recency_key');
        expect(harvestQuery).toContain('MV_EXPAND recent_keys');
        expect(harvestQuery).toContain('alert_id = SUBSTRING(recent_keys, 19)');
        expect(harvestQuery).toContain('alert_ids = VALUES(alert_id)');
      });

      // The gates live in the proposal children (one execution = one resume slot),
      // while the sweep fans out synchronously and joins once every gate settles.
      it('fans out one sync proposal per rule and joins on all gates', () => {
        const fanOut = tuningSteps.find(({ name }) => name === 'run_proposals')! as NestedStep & {
          mode?: string;
          concurrency?: { max: number; 'count-waiting': boolean };
        };
        const launches = tuningSteps.filter(({ type }) => type === 'workflow.execute');

        expect(fanOut.type).toBe('parallel');
        // Settled: one failed proposal must not skip the other rules' gates.
        expect(fanOut.mode).toBe('settled');
        // A slot per harvested rule (max_rules_per_sweep) so every gate opens at once.
        expect(fanOut.concurrency).toEqual({ max: 10, 'count-waiting': false });
        // A timeout here would abort branches and cancel children mid-approval;
        // the child gate's own timeout is the only clock.
        expect(fanOut).not.toHaveProperty('timeout');
        expect(fanOut).not.toHaveProperty('branch-timeout');

        expect(launches.map(({ name }) => name)).toEqual(['run_proposal']);
        expect(launches[0].with?.['workflow-id']).toBe(PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID);
        expect(launches[0]).not.toHaveProperty('on-failure');
        expect(tuningSteps.map(({ type }) => type)).not.toContain('waitForApproval');
        expect(tuningSteps.map(({ type }) => type)).not.toContain('workflow.executeAsync');

        const { concurrency } = (proposal as unknown as { settings: Record<string, unknown> })
          .settings as { concurrency: { key: string; strategy: string; max: number } };
        expect(concurrency.key).toContain('{{ inputs.rule_uuid }}');
        expect(concurrency.strategy).toBe('drop');
        expect(concurrency.max).toBe(1);
      });

      // A sweep waits out its slowest gate (72h) and every space shares one
      // concurrency key, so a single lane would let one pending gate drop the whole
      // fleet's scheduled sweeps.
      it('leaves room for other spaces to sweep while gates are pending', () => {
        const { concurrency } = (tuning as unknown as { settings: Record<string, unknown> })
          .settings as { concurrency: { strategy: string; max: number } };

        expect(concurrency.strategy).toBe('drop');
        expect(concurrency.max).toBe(5);
      });

      // The fan-in reads the settled aggregate, so the summary cannot run before
      // every gate has resolved or failed.
      it('summarizes decisions from the settled fan-out results', () => {
        const summary = tuningSteps.find(({ name }) => name === 'summarize_decisions')!;
        const emit = tuningSteps.find(({ name }) => name === 'emit_result')!;
        const summaryInput = JSON.stringify(summary.with);

        expect(summaryInput).toContain('steps.run_proposals.output.failed');
        expect(summaryInput).toContain("where: 'approved'");
        expect(summaryInput).toContain("where: 'applied'");
        for (const key of [
          'proposals_requested',
          'proposals_approved',
          'proposals_failed',
          'rules_applied',
        ]) {
          expect(String((emit.with as Record<string, string>)[key])).toContain(
            `steps.summarize_decisions.output.${key}`
          );
        }
      });
    });
  });
});
