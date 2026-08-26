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
            ui: { color: '#8b5cf6', icon: 'commandLine', order: 40 },
          },
        },
        steps: [{ name: 'stub', type: 'console', with: { message: 'hi' } }],
      } as unknown as WorkflowYaml;

      expect(extractWatchPolicy(definition)).toMatchObject({
        mandate: 'Deep investigation & hunts',
        handoff: 'records',
        ui: { color: '#8b5cf6', icon: 'commandLine', order: 40 },
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

    describe('rule tuning alert marking', () => {
      const tuning = parse(
        getManagedWorkflowDefinition(PND_RULE_TUNING_WORKFLOW_ID)!.yaml!
      ) as WorkflowYaml;
      const tuningSteps = flattenSteps(tuning.steps as unknown as NestedStep[]);
      const harvest = tuningSteps.find(({ name }) => name === 'harvest_fp_alerts_by_rule')!;
      const harvestQuery = String(harvest.with?.query);
      const reviewedTag = (tuning.consts as Record<string, string>).reviewed_tag;
      const tagSteps = tuningSteps.filter(({ type }) => type === 'security.setAlertTags');

      it('filters the reviewed tag out of the harvest', () => {
        expect(reviewedTag).toEqual(expect.any(String));
        expect(harvestQuery).toContain('NOT MV_CONTAINS(`kibana.alert.workflow_tags`');
        expect(harvestQuery).toContain('{{ consts.reviewed_tag }}');
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
        ]);

        const [dismissed, applied] = tagSteps;
        expect(dismissed.if).toContain('steps.review_tuning.output.response.approved == false');
        expect(dismissed.with?.tags_to_add).toBe('${{ consts.dismissed_tags }}');
        expect(applied.if).toContain('steps.review_tuning.output.response.approved == true');
        expect(applied.with?.tags_to_add).toBe('${{ consts.applied_tags }}');
      });

      // The tag API requires an array; only a value that is exactly one `${{ }}`
      // expression survives templating as an array instead of a string.
      it('passes tags_to_add as a single expression, never a template', () => {
        for (const step of tagSteps) {
          expect(String(step.with?.tags_to_add)).toMatch(/^\$\{\{ [\w.]+ \}\}$/);
        }
      });

      it('declares dismissed and applied tag sets', () => {
        expect(tuning.consts).toEqual(
          expect.objectContaining({
            dismissed_tags: [
              'detection-watch:tuning-reviewed',
              'detection-watch:tuning-dismissed',
            ],
            applied_tags: [
              'detection-watch:tuning-reviewed',
              'detection-watch:tuning-applied',
            ],
          })
        );
        expect(tuning.consts).not.toHaveProperty('reviewed_only_tags');
      });

      it('does not use classify_proposal or can_apply', () => {
        expect(tuningSteps.some(({ name }) => name === 'classify_proposal')).toBe(false);
        expect(JSON.stringify(tuningSteps)).not.toContain('can_apply');
      });

      // The harvest projects its columns positionally, so reordering KEEP would make the
      // tag step read some other column as the alert ids.
      it('reads the alert ids from the column position KEEP assigns them', () => {
        const keepClause = harvestQuery
          .split('\n')
          .find((line) => line.trimStart().startsWith('| KEEP'))!;
        const columns = keepClause
          .replace('| KEEP', '')
          .split(',')
          .map((column) => column.trim().replace(/`/g, ''));

        expect(columns).toContain('alert_ids');
        for (const step of tagSteps) {
          expect(step.with?.alert_ids).toContain(`foreach.item.${columns.indexOf('alert_ids')}`);
        }
      });
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
