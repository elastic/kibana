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
import { WATCH_DETECTION_TAG, WATCH_TAG } from '@kbn/pnd-common';
import {
  extractWatchPolicy,
  normalizeWorkflowTriggerType,
  projectCallablesFromDefinition,
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
    const definition = parse(getManagedYaml(PND_WATCH_DETECTION_WORKFLOW_ID)) as WorkflowYaml;

    interface NestedStep {
      name: string;
      type: string;
      if?: string;
      condition?: string;
      with?: Record<string, unknown>;
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
    it('gates both workers on an approval step that reads response.approved', () => {
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

      it('filters the reviewed tag out of the harvest', () => {
        expect(reviewedTag).toEqual(expect.any(String));
        expect(harvestQuery).toContain('NOT COALESCE(MV_CONTAINS(`kibana.alert.workflow_tags`');
        expect(harvestQuery).toContain('{{ consts.reviewed_tag }}');
      });

      it('measures FP rate independently from the unreviewed work queue', () => {
        expect(harvestQuery).toContain('fp_rate_count = COUNT(*) WHERE is_fp');
        expect(harvestQuery).toContain('fp_rate_count * 100 >= total_count');
      });

      it('does not split one rule history when its name changes', () => {
        const groupClause = harvestQuery
          .split('\n')
          .find((line) => line.trimStart().startsWith('BY '));

        expect(groupClause).not.toContain('kibana.alert.rule.name');
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
          'mark_alerts_reviewed',
        ]);

        const [dismissed, applied, handoff, reviewed] = tagSteps;
        expect(dismissed.if).toContain('steps.review_tuning.output.response.approved == false');
        expect(dismissed.with?.tags_to_add).toBe('${{ consts.dismissed_tags }}');
        for (const step of [applied, handoff, reviewed]) {
          expect(step.if).toContain('steps.review_tuning.output.response.approved == true');
        }
        expect(applied.with?.tags_to_add).toBe('${{ consts.applied_tags }}');
        expect(handoff.with?.tags_to_add).toBe('${{ consts.handoff_tags }}');
        expect(reviewed.with?.tags_to_add).toBe('${{ consts.reviewed_only_tags }}');
        for (const step of tagSteps) {
          expect(step).not.toHaveProperty('on-failure');
        }
      });

      // The applied tag must mean this pipeline changed the rule. Manual handoffs and
      // approved query proposals that could not be applied use distinct outcomes.
      it('tags applied only when the rule was actually patched', () => {
        const applied = tagSteps.find(({ name }) => name === 'mark_alerts_applied')!;
        const reviewed = tagSteps.find(({ name }) => name === 'mark_alerts_reviewed')!;

        expect(applied.if).toContain('steps.record_outcome.output.rule_patched == true');
        expect(reviewed.if).toContain('steps.record_outcome.output.rule_patched == false');

        const outcome = proposalSteps.find(({ name }) => name === 'record_outcome')!;
        expect(String(outcome.with?.rule_patched)).toContain(
          'steps.apply_query_tuning.error == null'
        );
      });

      // The gate can stay open for 72h; a stale approval must not clobber an analyst
      // edit made in the meantime.
      it('re-reads the rule after approval and applies only when it is unchanged', () => {
        const apply = proposalSteps.find(({ name }) => name === 'apply_query_tuning')!;
        const eligibility = proposalSteps.find(({ name }) => name === 'decide_apply')!;
        expect(String(eligibility.with?.eligible)).toContain(
          'steps.refetch_rule.output.updated_at == steps.fetch_rule.output.updated_at'
        );
        expect((apply.with?.body as Record<string, string>).id).toBe(
          '{{ steps.refetch_rule.output.id }}'
        );
        expect(proposalSteps.some(({ name }) => name === 'refetch_rule')).toBe(true);
      });

      it('runs both tuning previews inline to avoid child-resume races', () => {
        expect(proposalSteps.filter(({ type }) => type === 'workflow.execute')).toEqual([]);
        expect(proposalSteps.map(({ name }) => name)).toEqual(
          expect.arrayContaining([
            'preview_current_rule',
            'count_current_preview_alerts',
            'preview_proposed_rule',
            'count_proposed_preview_alerts',
          ])
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

      it('bounds direct proposal inputs', () => {
        const [trigger] = proposal.triggers as unknown as Array<{
          inputs: { properties: Record<string, Record<string, unknown>> };
        }>;
        const { properties } = trigger.inputs;

        expect(properties.alert_ids).toEqual(
          expect.objectContaining({ minItems: 1, maxItems: 1000 })
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
            reviewed_only_tags: ['detection-watch:tuning-reviewed'],
          })
        );

        const tagConsts = proposal.consts as Record<string, string[]>;
        for (const tags of [
          tagConsts.dismissed_tags,
          tagConsts.applied_tags,
          tagConsts.handoff_tags,
          tagConsts.reviewed_only_tags,
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
        const launch = tuningSteps.find(({ name }) => name === 'launch_proposal')!;
        const launchInputs = launch.with?.inputs as Record<string, string>;

        expect(columns).toContain('alert_ids');
        expect(launchInputs.alert_ids).toContain(`foreach.item.${columns.indexOf('alert_ids')}`);
        for (const step of tagSteps) {
          expect(step.with?.alert_ids).toBe('${{ inputs.alert_ids }}');
        }
      });

      // Alerts are tagged only after a gate resolves, so a resweep re-harvests rules
      // whose gate is still pending; the per-rule drop key is what deduplicates them.
      it('launches one fire-and-forget proposal per rule, deduplicated per rule', () => {
        const launches = tuningSteps.filter(({ type }) => type === 'workflow.executeAsync');

        expect(launches.map(({ name }) => name)).toEqual(['launch_proposal']);
        expect(launches[0].with?.['workflow-id']).toBe(PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID);
        expect(tuningSteps.map(({ type }) => type)).not.toContain('waitForApproval');

        const { concurrency } = (proposal as unknown as { settings: Record<string, unknown> })
          .settings as { concurrency: { key: string; strategy: string; max: number } };
        expect(concurrency.key).toContain('{{ inputs.rule_id }}');
        expect(concurrency.strategy).toBe('drop');
        expect(concurrency.max).toBe(1);
      });
    });

    it('keeps the skills and the preview worker inside the workers themselves', () => {
      const workerCallables = (id: string) =>
        projectCallablesFromDefinition(parse(getManagedYaml(id)) as WorkflowYaml, undefined);

      expect(workerCallables(PND_RULE_TUNING_WORKFLOW_ID)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID, kind: 'workflow' }),
        ])
      );
      expect(workerCallables(PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID)).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'investigate-rule', kind: 'skill' })])
      );
      expect(workerCallables(PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID)).not.toEqual(
        expect.arrayContaining([
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
