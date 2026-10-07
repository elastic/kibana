/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { MAX_TITLE_LENGTH } from '@kbn/proposals-common';
import type { RuleCoverageWorkerExtras, RuleTuningWorkerExtras } from '@kbn/alertzero-common';
import type { WorkflowYaml } from '@kbn/workflows';
import { createWorkflowLiquidEngine } from '@kbn/workflows';
import { convertJsonSchemaToZod } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import {
  getManagedWorkflowDefinition,
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID,
  ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID,
  ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
  ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW_ID,
  ALERTZERO_RULE_PREVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { projectSkillsFromDefinition } from '../services/utils';
import { workerRegistry } from './worker_registry';

const DETECTION_WORKFLOW_IDS = [
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW_ID,
  ALERTZERO_RULE_PREVIEW_WORKFLOW_ID,
  ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID,
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
];

const getManagedYaml = (workflowId: string): string => {
  const definition = getManagedWorkflowDefinition(workflowId);
  if (!definition) throw new Error(`Missing managed workflow definition for "${workflowId}"`);
  if ('yaml' in definition && definition.yaml) return definition.yaml;
  if ('yamlTemplate' in definition && definition.yamlTemplate) {
    const registration = workerRegistry.get(workflowId);
    if (!registration) throw new Error(`Worker "${workflowId}" is not registered`);
    return definition.yamlTemplate(registration.settings.createDefaultValues());
  }
  throw new Error(`Managed workflow definition "${workflowId}" has no YAML source`);
};

const renderRuleTuningWorker = (extras: RuleTuningWorkerExtras): string => {
  const definition = getManagedWorkflowDefinition(
    ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID
  );
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error('Rule Tuning worker definition has no YAML template');
  }
  return definition.yamlTemplate({
    settingsVersion: 1,
    autonomyLevel: 'assisted',
    scheduleInterval: '6h',
    extras,
  });
};

const renderRuleCoverageWorker = (extras: RuleCoverageWorkerExtras): string => {
  const definition = getManagedWorkflowDefinition(
    ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID
  );
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error('Rule Coverage worker definition has no YAML template');
  }
  return definition.yamlTemplate({
    settingsVersion: 1,
    autonomyLevel: 'assisted',
    scheduleInterval: '6h',
    extras,
  });
};

const resolveExpression = (expression: unknown, context: Record<string, unknown>): unknown =>
  createWorkflowLiquidEngine().evalValueSync(
    String(expression)
      .trim()
      .replace(/^\$?\{\{/, '')
      .replace(/\}\}$/, '')
      .trim(),
    context
  );

interface NestedStep {
  name: string;
  type: string;
  if?: string;
  condition?: string;
  expression?: string;
  with?: Record<string, unknown>;
  steps?: NestedStep[];
  else?: NestedStep[];
  cases?: Array<{ match: string | number | boolean; steps: NestedStep[] }>;
  default?: NestedStep[];
  'on-failure'?: Record<string, unknown>;
}

const flattenSteps = (steps: NestedStep[]): NestedStep[] =>
  steps.flatMap((step) => [
    step,
    ...flattenSteps(step.steps ?? []),
    ...flattenSteps(step.else ?? []),
    ...(step.cases ?? []).flatMap((switchCase) => flattenSteps(switchCase.steps)),
    ...flattenSteps(step.default ?? []),
  ]);

describe('detection rule workflows', () => {
  describe('rule tuning worker', () => {
    const worker = parse(
      getManagedYaml(ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID)
    ) as WorkflowYaml;

    it('schedules the per-space sweep every two hours and keeps manual runs available', () => {
      const triggers = worker.triggers as unknown as Array<{
        type: string;
        with?: Record<string, unknown>;
      }>;

      expect(triggers.map(({ type }) => type)).toEqual(['scheduled', 'manual']);
      expect(triggers[0].with).toEqual({ every: '2h' });
    });

    // Async because the sweep joins on its review gates and can park for 72h;
    // a sync call would park this worker run and stack scheduled runs behind it.
    it('dispatches the tuning sweep asynchronously', () => {
      const calls = flattenSteps(worker.steps as unknown as NestedStep[]).filter(({ type }) =>
        ['workflow.execute', 'workflow.executeAsync'].includes(String(type))
      );

      expect(calls.map(({ name, type }) => [name, type])).toEqual([
        ['run_rule_tuning', 'workflow.executeAsync'],
      ]);
      expect(calls[0].with?.['workflow-id']).toBe(ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID);
      expect(calls[0].with?.inputs).toEqual({
        autonomy_level: '{{ consts.worker_settings.autonomy }}',
        analysis_window_days: '${{ consts.worker_settings.extras.analysisWindowDays }}',
        min_fp_count: '${{ consts.worker_settings.extras.fpCountThreshold }}',
        min_fp_rate_pct: '${{ consts.worker_settings.extras.fpRateThresholdPct }}',
      });
    });

    // The sweep's own consts are fallbacks for a manual run, so a saved setting only
    // takes effect if the wrapper renders it into the dispatch inputs.
    it('forwards the saved analysis window and both FP thresholds to the sweep', () => {
      const saved = { analysisWindowDays: 21, fpCountThreshold: 4, fpRateThresholdPct: 80 };
      const rendered = parse(renderRuleTuningWorker(saved)) as WorkflowYaml;
      const [dispatch] = flattenSteps(rendered.steps as unknown as NestedStep[]);

      // consts.worker_settings is the single place the saved values are rendered into...
      expect((rendered.consts as Record<string, Record<string, unknown>>).worker_settings).toEqual({
        settingsVersion: 1,
        autonomy: 'assisted',
        scheduleInterval: '6h',
        extras: saved,
      });

      // ...and every sweep input is an expression over it. Evaluating them the way the engine
      // does catches a mistyped consts path or a `{{ }}` that would stringify a number, which
      // matching the literal expression text would let through.
      const engine = createWorkflowLiquidEngine();
      const resolve = (expression: unknown) =>
        engine.evalValueSync(
          String(expression)
            .trim()
            .replace(/^\$?\{\{/, '')
            .replace(/\}\}$/, '')
            .trim(),
          { consts: rendered.consts }
        );
      const inputs = dispatch.with?.inputs as Record<string, unknown>;

      expect(resolve(inputs.autonomy_level)).toBe('assisted');
      expect(resolve(inputs.analysis_window_days)).toBe(21);
      expect(resolve(inputs.min_fp_count)).toBe(4);
      expect(resolve(inputs.min_fp_rate_pct)).toBe(80);
      // `${{ }}` keeps the number type the sweep's integer inputs require; `{{ }}` would not.
      for (const key of ['analysis_window_days', 'min_fp_count', 'min_fp_rate_pct']) {
        expect(inputs[key]).toMatch(/^\$\{\{/);
      }
    });
  });

  describe('rule coverage worker', () => {
    const worker = parse(
      getManagedYaml(ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID)
    ) as WorkflowYaml;

    it('schedules the per-space sweep every hour and keeps manual runs available', () => {
      const triggers = worker.triggers as unknown as Array<{
        type: string;
        with?: Record<string, unknown>;
      }>;

      expect(triggers.map(({ type }) => type)).toEqual(['scheduled', 'manual']);
      expect(triggers[0].with).toEqual({ every: '1h' });
    });

    // Sync, unlike Rule Tuning: the coverage sweep starts its reviews detached and
    // returns in seconds, so waiting on it lets this run carry the sweep's result.
    it('dispatches the coverage sweep synchronously', () => {
      const calls = flattenSteps(worker.steps as unknown as NestedStep[]).filter(({ type }) =>
        ['workflow.execute', 'workflow.executeAsync'].includes(String(type))
      );

      expect(calls.map(({ name, type }) => [name, type])).toEqual([
        ['run_rule_coverage', 'workflow.execute'],
      ]);
      expect(calls[0].with?.['workflow-id']).toBe(ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID);
      expect(calls[0].with?.inputs).toEqual({
        autonomy_level: '{{ consts.worker_settings.autonomy }}',
        lookback_days: '${{ consts.worker_settings.extras.lookbackDays }}',
        batch_size: '${{ consts.worker_settings.extras.maxGapsPerRun }}',
      });
    });

    it('forwards the saved lookback and max gaps per run to the sweep', () => {
      const saved = { lookbackDays: 30, maxGapsPerRun: 20 };
      const rendered = parse(renderRuleCoverageWorker(saved)) as WorkflowYaml;
      const [dispatch] = flattenSteps(rendered.steps as unknown as NestedStep[]);

      expect((rendered.consts as Record<string, Record<string, unknown>>).worker_settings).toEqual({
        settingsVersion: 1,
        autonomy: 'assisted',
        scheduleInterval: '6h',
        extras: saved,
      });

      const inputs = dispatch.with?.inputs as Record<string, unknown>;
      expect(resolveExpression(inputs.autonomy_level, { consts: rendered.consts })).toBe(
        'assisted'
      );
      expect(resolveExpression(inputs.lookback_days, { consts: rendered.consts })).toBe(30);
      expect(resolveExpression(inputs.batch_size, { consts: rendered.consts })).toBe(20);
      for (const key of ['lookback_days', 'batch_size']) {
        expect(inputs[key]).toMatch(/^\$\{\{/);
      }
    });

    // The sweep reports read failures as flags instead of failing. Dropping them would
    // make a failed sweep indistinguishable from an empty queue.
    it('echoes the sweep counts and failure flags as its own output', () => {
      const emit = flattenSteps(worker.steps as unknown as NestedStep[]).find(
        ({ type }) => type === 'workflow.output'
      );
      const declared = (worker.outputs as Array<{ name: string }>).map(({ name }) => name);
      const sweepOutput = {
        pending: 3,
        started: 1,
        in_flight: 2,
        search_failed: true,
        lookup_failed: false,
      };
      const context = { steps: { run_rule_coverage: { output: sweepOutput } } };

      expect(declared).toEqual(Object.keys(sweepOutput));
      expect(Object.keys(emit?.with ?? {})).toEqual(Object.keys(sweepOutput));
      for (const [key, value] of Object.entries(sweepOutput)) {
        expect(resolveExpression(emit?.with?.[key], context)).toBe(value);
      }
    });
  });

  describe('detection rule workflow definitions', () => {
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
      for (const id of [
        ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
        ALERTZERO_RULE_CREATION_WORKFLOW_ID,
      ]) {
        const lines = getManagedYaml(id)
          .split('\n')
          .filter((line) => line.includes('timeframeEnd'));

        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
          expect(line).not.toContain('%:z');
        }
      }
    });

    // The decision lives on the investigation as a proposal, and the gate workflow
    // creates the rule as the approver. The worker itself must neither gate nor create.
    it('gates the creation worker through the investigation proposal', () => {
      const { steps } = parse(getManagedYaml(ALERTZERO_RULE_CREATION_WORKFLOW_ID)) as WorkflowYaml;
      const all = flattenSteps(steps as unknown as NestedStep[]);
      const types = all.map(({ type }) => type);

      expect(types).not.toContain('waitForApproval');
      expect(types).not.toContain('waitForInput');
      expect(types).not.toContain('security.createRule');

      const gates = all.filter(
        ({ type, with: input }) =>
          type === 'workflow.execute' &&
          input?.['workflow-id'] === ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID
      );
      expect(gates).toHaveLength(1);
      const inputs = gates[0].with?.inputs as Record<string, unknown>;
      expect(inputs.actionWorkflowId).toBe('system-alertzero-action-create-rule');
      expect(inputs.actionInput).toBe('${{ steps.draft_creation.output.structured_output.rule }}');
    });

    // Every change type decides at the proposal gate, which runs the action as
    // the approver.
    it('gates the review through the investigation proposal workflow', () => {
      const { steps } = parse(
        getManagedYaml(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID)
      ) as WorkflowYaml;
      const all = flattenSteps(steps as unknown as NestedStep[]);

      expect(all.map(({ type }) => type)).not.toContain('waitForApproval');
      expect(all.map(({ type }) => type)).not.toContain('waitForInput');

      const proposals = all.filter(
        ({ type, with: input }) =>
          type === 'workflow.execute' &&
          input?.['workflow-id'] === ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID
      );
      expect(proposals.map(({ name }) => name)).toEqual([
        'propose_entry',
        'propose_query',
        'propose_risk_score',
        'propose_exception',
        'propose_threshold',
        'propose_schedule',
        'propose_manual',
      ]);

      const [entry, action, settings, exception, threshold, schedule, manual] = proposals;
      const entryInputs = entry.with?.inputs as Record<string, unknown>;
      const actionInputs = action.with?.inputs as Record<string, unknown>;
      const settingsInputs = settings.with?.inputs as Record<string, unknown>;
      const exceptionInputs = exception.with?.inputs as Record<string, unknown>;
      const manualInputs = manual.with?.inputs as Record<string, unknown>;

      // Manual autonomy stops once for permission to do the work; the entry gate
      // carries no action and a dismissal terminates the run before diagnosis.
      const gate = all.find(({ name }) => name === 'entry_gate')!;
      expect(gate.type).toBe('if');
      expect(gate.condition).toContain("inputs.autonomy_level == 'manual'");
      expect(gate.condition).toContain('steps.create_investigation.output.conversation_id != null');
      expect((gate.steps ?? []).map(({ name }) => name)).toEqual([
        'propose_entry',
        'entry_decision',
      ]);
      expect(gate).not.toHaveProperty('else');
      expect(entryInputs).not.toHaveProperty('actionWorkflowId');
      expect(entryInputs).not.toHaveProperty('actionInput');
      // No action, so no inherited category; the queue drops an uncategorised proposal.
      expect(entryInputs.category).toBe('configure');
      // Only an approval continues: it matches no case and falls through to diagnosis.
      // A gate nobody answered reports an empty decision and must stop, not pass as an
      // approval.
      const entryDecision = all.find(({ name }) => name === 'entry_decision')!;
      expect(entryDecision.type).toBe('switch');
      expect(
        (entryDecision.cases ?? []).map(({ match, steps: caseSteps }) => [
          match,
          caseSteps.map(({ name }) => name),
        ])
      ).toEqual([
        ['dismissed', ['mark_alerts_declined', 'close_investigation_declined', 'stop_declined']],
        ['expired', ['stop_expired']],
      ]);
      expect(entryDecision.default).toBeUndefined();
      for (const [decision, routed] of [
        ['approved', ''],
        ['dismissed', 'dismissed'],
        ['', 'expired'],
      ]) {
        expect(
          createWorkflowLiquidEngine().parseAndRenderSync(String(entryDecision.expression), {
            steps: { propose_entry: { output: { decision } } },
          })
        ).toBe(routed);
      }
      const stopExpired = all.find(({ name }) => name === 'stop_expired')!;
      expect(stopExpired.type).toBe('workflow.output');
      expect(stopExpired.with).toEqual({
        rule_uuid: '{{ inputs.rule_uuid }}',
        approved: false,
        applied: false,
      });
      const diagnoseIndex = all.findIndex(({ name }) => name === 'diagnose_rule');
      const stopIndex = all.findIndex(({ name }) => name === 'stop_declined');
      expect(all.findIndex(({ name }) => name === 'propose_entry')).toBeLessThan(stopIndex);
      expect(stopIndex).toBeLessThan(diagnoseIndex);
      expect(all[stopIndex].type).toBe('workflow.output');

      expect(actionInputs.actionWorkflowId).toBe(ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID);
      expect(actionInputs.actionInput).toEqual({
        id: '{{ inputs.rule_uuid }}',
        expected_revision: '${{ steps.fetch_rule.output.revision }}',
        query: '{{ steps.diagnose_rule.output.structured_output.proposed_query }}',
      });
      // Same edit-rule action as the query path; it patches only the fields it is given.
      expect(settingsInputs.actionWorkflowId).toBe(ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID);
      expect(settingsInputs.actionWorkflowId).toBe(actionInputs.actionWorkflowId);
      expect(settingsInputs.actionInput).toEqual({
        id: '{{ inputs.rule_uuid }}',
        expected_revision: '${{ steps.fetch_rule.output.revision }}',
        // `${{ }}` keeps the score a number.
        risk_score: '${{ steps.diagnose_rule.output.structured_output.proposed_risk_score }}',
        severity: '{{ steps.diagnose_rule.output.structured_output.proposed_severity }}',
      });
      // An exception is not a rule patch, so it has its own action.
      expect(exceptionInputs.actionWorkflowId).toBe(
        ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID
      );
      const exceptionActionInput = exceptionInputs.actionInput as Record<string, string>;
      expect(exceptionActionInput.rule_id).toBe('{{ inputs.rule_uuid }}');
      // `${{ }}` keeps the entries as objects.
      expect(exceptionActionInput.entries).toBe(
        '${{ steps.diagnose_rule.output.structured_output.exception_entries }}'
      );
      expect(manualInputs).not.toHaveProperty('actionWorkflowId');
      expect(manualInputs).not.toHaveProperty('actionInput');
      // Same reason as the entry gate.
      expect(manualInputs.category).toBe('configure');

      // One switch on the change type: the engine runs the first matching arm only.
      const fork = all.find(({ name }) => name === 'propose_tuning')!;
      expect(fork.type).toBe('switch');
      expect(fork.if).toContain('steps.create_investigation.output.conversation_id != null');
      expect(fork.expression).toContain('steps.diagnose_rule.output.structured_output.change_type');
      expect((fork.cases ?? []).map(({ match }) => match)).toEqual([
        'query',
        'risk_score',
        'exception',
        'threshold',
        'schedule',
      ]);
      expect(
        (fork.cases ?? []).map(({ steps: armSteps }) => armSteps.map(({ name }) => name))
      ).toEqual([
        ['propose_query'],
        ['propose_risk_score'],
        ['attach_exception', 'propose_exception'],
        ['incomplete_threshold_output', 'propose_threshold'],
        ['propose_schedule'],
      ]);
      // The manual proposal is the default arm, so an unrecognised change type
      // still reaches the analyst.
      expect((fork.default ?? []).map(({ name }) => name)).toEqual(['propose_manual']);

      // The `entry_gate` if-step guards the entry proposal and the switch guards the
      // arms; propose_threshold also has a step-level guard (incomplete_threshold_output)
      // verified by the case-arm assertion above.
      for (const proposal of [entry, action, settings, exception, threshold, schedule, manual]) {
        expect(proposal).not.toHaveProperty('if');
      }
      for (const proposal of proposals) {
        expect(proposal).not.toHaveProperty('on-failure');
      }
      for (const proposal of [action, settings, exception, manual]) {
        expect((proposal.with?.inputs as Record<string, unknown>).comment).toBe(
          '{{ steps.compose_proposal.output.comment }}'
        );
      }
      // The actions declare always-gate, so no caller-side auto-approve.
      for (const proposal of [action, settings, exception]) {
        expect((proposal.with?.inputs as Record<string, unknown>).autoApprove).toBe(false);
      }
      // The edit-rule action declares no impact, so the caller's value is shown.
      expect(actionInputs.impact).toBe('medium');
      expect(settingsInputs.impact).toBe('low');
    });

    // The review parks in WAITING_FOR_CHILD while the gate holds the decision,
    // and the engine's default 6h workflow timeout would cancel it under the
    // analyst. What it has to outlive is the *deadline* its own proposals get,
    // not the gate workflow's `settings.timeout` — that is a sentinel meaning
    // "never", so comparing against it would only ever assert that this
    // workflow's timeout is longer than a year.
    it('outlives the decision deadline its own proposals get', () => {
      const review = parse(
        getManagedYaml(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID)
      ) as WorkflowYaml;
      const hours = (timeout: unknown) => Number(String(timeout).replace(/h$/, ''));

      // None of this workflow's gates passes `expiresIn`, so each takes the
      // gate's 72h default — the bridge forwards the field unset. A gate that
      // starts asking for its own deadline has to be checked against the
      // ceiling here.
      //
      // Flattened, not top-level: `propose_entry` sits inside `entry_gate`, and
      // the other six hang off `propose_tuning`'s switch cases and default.
      const proposals = flattenSteps(review.steps as NestedStep[]).filter(
        (step) => step.with?.['workflow-id'] === ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID
      );
      expect(proposals.length).toBe(7);
      for (const proposal of proposals) {
        expect((proposal.with?.inputs as Record<string, unknown>)?.expiresIn).toBeUndefined();
      }

      expect(String(review.settings?.timeout)).toMatch(/^\d+h$/);
      expect(hours(review.settings?.timeout)).toBeGreaterThan(72);
    });

    // The sweep has no ai.agent step; the diagnosing skill lives in the review child.
    it('keeps the skills inside the workers themselves', () => {
      const workerSkills = (id: string) =>
        projectSkillsFromDefinition(parse(getManagedYaml(id)) as WorkflowYaml, undefined);

      expect(workerSkills(ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID)).toEqual([]);
      expect(workerSkills(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID)).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'investigate-rule', kind: 'skill' })])
      );
      expect(workerSkills(ALERTZERO_RULE_CREATION_WORKFLOW_ID)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'detection-rule-edit', kind: 'skill' }),
        ])
      );
    });

    describe('rule tuning alert marking', () => {
      const tuning = parse(
        getManagedWorkflowDefinition(ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID)!.yaml!
      ) as WorkflowYaml;
      const review = parse(
        getManagedWorkflowDefinition(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID)!.yaml!
      ) as WorkflowYaml;
      const tuningSteps = flattenSteps(tuning.steps as unknown as NestedStep[]);
      const reviewSteps = flattenSteps(review.steps as unknown as NestedStep[]);
      const harvest = tuningSteps.find(({ name }) => name === 'harvest_fp_alerts_by_rule')!;
      const harvestQuery = String(harvest.with?.query);
      const reviewedTag = (tuning.consts as Record<string, string>).reviewed_tag;
      const tagSteps = reviewSteps.filter(({ type }) => type === 'security.setAlertTags');

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

      // A review can outlive its sweep (cancelled sweep, manual run). Its rule must
      // not consume a sweep slot again while the gate is pending, so the harvest
      // excludes rules with an in-flight review, and fails open when the lookup or
      // the group-key parse cannot be trusted.
      it('skips rules whose review is still in flight', () => {
        const lookup = tuningSteps.find(({ name }) => name === 'list_active_reviews')!;
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
          `/api/workflows/workflow/${ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID}/executions?`
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

      // `kibana.alert.rule.enabled` on an alert is a creation-time snapshot, so a rule
      // disabled after alerting keeps harvesting until its FPs age out of the window.
      // The sweep checks live enabled status for the harvested candidates only and
      // drops disabled rules from the fan-out source (a parallel branch body cannot
      // carry a step-level `if`).
      it('skips reviews for rules that are no longer enabled', () => {
        const collect = tuningSteps.find(({ name }) => name === 'collect_candidates')!;
        const lookup = tuningSteps.find(({ name }) => name === 'list_enabled_candidates')!;
        const rows = tuningSteps.find(({ name }) => name === 'resolve_fanout_rows')!;
        const fanOut = tuningSteps.find(({ name }) => name === 'run_reviews')!;

        const filterKql = String(collect.with?.filter_kql);
        expect(filterKql).toContain('alert.attributes.enabled: true');
        expect(filterKql).toContain('alert.id: ("alert:{{ row[0] }}")');

        const path = String(lookup.with?.path);
        expect(path).toContain('/api/detection_engine/rules/_find?');
        expect(path).toContain('per_page={{ consts.max_candidate_rules }}');
        expect(path).toContain('{{ steps.collect_candidates.output.filter_kql | url_encode }}');
        expect(String(lookup.if)).toContain('steps.collect_candidates.output.count > 0');
        expect(lookup['on-failure']).toEqual({ continue: true });

        const rowsExpr = String(rows.with?.rows);
        expect(rowsExpr).toContain(
          "where_exp: 'row', 'steps.resolve_current_revisions.output.rule_revision_keys contains row[6]'"
        );
        // No `default` after where_exp: an empty filtered array is legitimate and a
        // default would resurrect every disabled candidate.
        expect(rowsExpr).not.toMatch(/where_exp:.*\| default:/);
        // The engine's rehydration planner cannot see step paths inside the quoted
        // where_exp argument. This direct reference keeps the keys resident.
        expect(String(rows.with?.rule_revision_keys)).toContain(
          '${{ steps.resolve_current_revisions.output.rule_revision_keys }}'
        );
        // Slice after the enabled filter: the pool overscans the launch cap so
        // disabled candidates cannot starve enabled rules ranked below them.
        expect(rowsExpr).toContain('| slice: 0, steps.collect_candidates.output.fanout_limit');
        expect(String(collect.with?.fanout_limit)).toContain(
          'inputs.max_rules_per_sweep | default: consts.max_rules_per_sweep'
        );

        expect(String((fanOut as NestedStep & { foreach?: string }).foreach)).toContain(
          'steps.resolve_fanout_rows.output.rows'
        );
      });

      // Rule A was edited after its false positives, so they came from an older
      // version. Rule B was not edited. Only rule B should be reviewed.
      it('reviews a rule only on false positives from its current version', () => {
        const resolveVersions = tuningSteps.find(
          ({ name }) => name === 'resolve_current_revisions'
        )!;
        const rows = tuningSteps.find(({ name }) => name === 'resolve_fanout_rows')!;

        expect(harvestQuery).toContain('BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision`');

        const currentVersions = createWorkflowLiquidEngine().parseAndRenderSync(
          String(resolveVersions.with?.rule_revision_keys),
          {
            steps: {
              list_enabled_candidates: {
                output: {
                  data: [
                    { id: 'rule-a', revision: 2 },
                    { id: 'rule-b', revision: 5 },
                  ],
                },
              },
            },
          }
        );

        // The last column is the "rule@version" key the harvest query adds to each row.
        const ruleAOldVersion = [
          'rule-a',
          12,
          '2026-10-01T00:00:00.000Z',
          ['a1'],
          20,
          12,
          ',rule-a@1,',
        ];
        const ruleBCurrentVersion = [
          'rule-b',
          15,
          '2026-10-01T00:00:00.000Z',
          ['b1'],
          20,
          15,
          ',rule-b@5,',
        ];

        const reviewedRows = resolveExpression(rows.with?.rows, {
          consts: tuning.consts,
          steps: {
            harvest_fp_alerts_by_rule: {
              output: { values: [ruleAOldVersion, ruleBCurrentVersion] },
            },
            resolve_current_revisions: { output: { rule_revision_keys: currentVersions } },
            collect_candidates: { output: { fanout_limit: 10 } },
          },
        });

        expect(reviewedRows).toEqual([ruleBCurrentVersion]);
      });

      // A pending tuning proposal whose rule was edited or deleted since can never be
      // applied, so the sweep expires it rather than leaving Approve and Decline on it.
      describe('expiring stale tuning proposals', () => {
        const list = tuningSteps.find(({ name }) => name === 'list_pending_tuning_proposals')!;
        const loop = tuningSteps.find(({ name }) => name === 'expire_stale_tuning_proposals')!;
        const expireSteps = ['expire_deleted_rule_proposal', 'expire_changed_rule_proposal'].map(
          (stepName) => tuningSteps.find(({ name }) => name === stepName)!
        );
        const proposal = (expectedRevision?: number) => ({
          id: 'proposal-1',
          actionWorkflowId: ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
          actionInput: { id: 'rule-1', expected_revision: expectedRevision, query: 'from logs' },
        });

        const firedSteps = (context: Record<string, unknown>) =>
          expireSteps
            .filter((step) => resolveExpression(step.if, context) === true)
            .map(({ name }) => name);

        it('checks every pending AlertZero rule edit before harvesting', () => {
          const names = tuningSteps.map(({ name }) => name);

          expect(list.with?.path).toBe('/s/{{ workflow.spaceId }}/internal/proposals');
          expect(list.with?.query).toEqual({
            status: 'pending',
            origin: 'alertzero',
            category: 'configure',
            size: 100,
          });
          expect(list['on-failure']).toEqual({ continue: true });
          expect(names.indexOf('expire_stale_tuning_proposals')).toBeLessThan(
            names.indexOf('harvest_fp_alerts_by_rule')
          );

          const otherAction = { ...proposal(0), actionWorkflowId: 'some-other-action' };
          expect(
            resolveExpression((loop as NestedStep & { foreach?: string }).foreach, {
              consts: tuning.consts,
              steps: {
                list_pending_tuning_proposals: {
                  output: { proposals: [proposal(0), otherAction] },
                },
              },
            })
          ).toEqual([proposal(0)]);
          expect(
            resolveExpression((loop as NestedStep & { foreach?: string }).foreach, {
              consts: tuning.consts,
              steps: { list_pending_tuning_proposals: { error: { message: 'HTTP 500' } } },
            })
          ).toEqual([]);
        });

        it.each([
          [
            'a deleted rule',
            { error: { message: 'HTTP 404: Not Found' } },
            0,
            ['expire_deleted_rule_proposal'],
          ],
          [
            'any other read failure',
            { error: { message: 'HTTP 500: Internal Server Error' } },
            0,
            [],
          ],
          ['a rule edited since', { output: { revision: 1 } }, 0, ['expire_changed_rule_proposal']],
          ['an unchanged rule', { output: { revision: 0 } }, 0, []],
          ['a proposal without a revision', { output: { revision: 3 } }, undefined, []],
        ])('handles %s', (_, fetchRule, expectedRevision, expected) => {
          expect(
            firedSteps({
              foreach: { item: proposal(expectedRevision) },
              steps: { fetch_proposal_rule: fetchRule },
            })
          ).toEqual(expected);
        });

        // An expired proposal is settled, so the record keeps it as `expired`; the
        // gate's own timeout later rewrites `executionError` but not `rationale`.
        it('expires the proposal and explains why in plain text', async () => {
          const context = {
            foreach: { item: proposal(0) },
            steps: { fetch_proposal_rule: { output: { revision: 1, updated_by: 'jane' } } },
          };
          const engine = createWorkflowLiquidEngine();
          const [deleted, changed] = await Promise.all(
            expireSteps.map((step) => engine.parseAndRender(String(step.with?.rationale), context))
          );

          for (const step of expireSteps) {
            expect(step.type).toBe('proposals.updateProposal');
            expect(step.with?.proposalId).toBe('{{ foreach.item.id }}');
            expect(step.with?.status).toBe('expired');
            expect(step['on-failure']).toEqual({ continue: true });
          }
          expect(deleted).toBe(
            "The rule was deleted after this proposal was created, so this tuning can't be applied."
          );
          expect(changed).toBe(
            'The rule was changed by "jane" after this proposal was created, so this tuning can\'t be applied.'
          );
        });
      });

      // The pool is cut in ES|QL before the enabled check runs, so it must exceed
      // the launch cap for the enabled filter to have anything to backfill from.
      it('overscans the harvest pool beyond the launch cap', () => {
        const consts = (tuning as unknown as { consts: Record<string, number> }).consts;
        expect(consts.max_candidate_rules).toBe(20);
        expect(consts.max_rules_per_sweep).toBe(10);
        expect(consts.max_candidate_rules).toBeGreaterThan(consts.max_rules_per_sweep);
        expect(harvestQuery).toContain('LIMIT {{ consts.max_candidate_rules }}');

        const trigger = (
          tuning.triggers as unknown as Array<{
            type: string;
            inputs: { properties: Record<string, Record<string, unknown>> };
          }>
        ).find(({ type }) => type === 'manual')!;
        // The input can only lower the launch cap; the fan-out's parallel slots
        // are sized for the default.
        expect(trigger.inputs.properties.max_rules_per_sweep).toEqual(
          expect.objectContaining({ minimum: 1, maximum: consts.max_rules_per_sweep })
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
          'mark_alerts_declined',
          'mark_alerts_dismissed',
          'mark_alerts_applied',
          'mark_alerts_acknowledged',
        ]);

        const [declined, dismissed, applied, acknowledged] = tagSteps;
        // A declined entry gate retires the alerts too, or the next sweep re-opens it.
        const entryDecision = reviewSteps.find(({ name }) => name === 'entry_decision')!;
        expect(
          entryDecision.cases
            ?.find(({ match }) => match === 'dismissed')
            ?.steps.map(({ name }) => name)
        ).toContain(declined.name);
        expect(declined.with?.tags_to_add).toEqual([
          '{{ consts.reviewed_tag }}',
          '{{ consts.dismissed_tag }}',
        ]);
        // One dismissal source: the gate.
        expect(dismissed.if).toContain(
          'steps.record_proposal_action_decision.output.dismissed == true'
        );
        expect(dismissed.if).not.toContain('review_tuning');
        const closeDismissed = reviewSteps.find(
          ({ name }) => name === 'close_investigation_dismissed'
        )!;
        expect(String(closeDismissed.if)).toContain(
          'steps.record_proposal_action_decision.output.dismissed == true'
        );
        expect(String(closeDismissed.if)).not.toContain('review_tuning');
        expect(dismissed.with?.tags_to_add).toEqual([
          '{{ consts.reviewed_tag }}',
          '{{ consts.dismissed_tag }}',
        ]);
        expect(applied.if).toContain(
          'steps.record_proposal_action_decision.output.applied == true'
        );
        expect(applied.with?.tags_to_add).toEqual([
          '{{ consts.reviewed_tag }}',
          '{{ consts.applied_tag }}',
        ]);
        // Approving a recommendation the pipeline cannot apply itself acknowledges
        // the manual follow-up and retires the alerts; the auto-apply path keeps
        // its alerts untagged on failure so a later sweep can retry.
        expect(acknowledged.if).toContain("steps.propose_manual.output.decision == 'approved'");
        // Keyed on the default arm's proposal, not on the change type. The arm also
        // runs for a value the three action arms do not match, and testing the type
        // would leave those alerts untagged after an approval.
        expect(acknowledged.if).not.toContain('change_type');
        expect(acknowledged.if).not.toContain('review_tuning');
        expect(acknowledged.with?.tags_to_add).toEqual([
          '{{ consts.reviewed_tag }}',
          '{{ consts.acknowledged_tag }}',
        ]);
        for (const step of tagSteps) {
          expect(step).not.toHaveProperty('on-failure');
        }
      });

      // One axis per question. What the analyst concluded is read off `decision`
      // on every arm; whether the change landed is read off `status`. A decision
      // cannot be read off `status`, because a dismissal and an approved
      // action-less proposal both report `no_action`.
      it('derives every decision flag from the right gate axis', () => {
        const decision = reviewSteps.find(
          ({ name }) => name === 'record_proposal_action_decision'
        )!;
        const flags = decision.with as Record<string, string>;

        for (const proposal of ['propose_query', 'propose_risk_score', 'propose_exception']) {
          expect(String(flags.applied)).toContain(`steps.${proposal}.output.status == 'succeeded'`);
          expect(String(flags.approved)).toContain(
            `steps.${proposal}.output.decision == 'approved'`
          );
          expect(String(flags.dismissed)).toContain(
            `steps.${proposal}.output.decision == 'dismissed'`
          );
        }
        // The manual proposal has no action, so only `decision` is meaningful.
        expect(String(flags.approved)).toContain(
          "steps.propose_manual.output.decision == 'approved'"
        );
        expect(String(flags.dismissed)).toContain(
          "steps.propose_manual.output.decision == 'dismissed'"
        );
        expect(String(flags.applied)).not.toContain('propose_manual');
        // Neither decision flag touches the status axis; only `applied` does.
        expect(String(flags.approved)).not.toContain('.output.status');
        expect(String(flags.dismissed)).not.toContain('.output.status');
        // Only one proposal step runs per review, so every flag is a plain or-chain.
        for (const flag of [flags.applied, flags.approved, flags.dismissed]) {
          expect(String(flag)).not.toContain(' and ');
        }

        // The per-change-type apply flags are gone.
        for (const name of ['record_apply_results', 'record_outcome']) {
          expect(reviewSteps.some((step) => step.name === name)).toBe(false);
        }

        const emit = reviewSteps.find(({ name }) => name === 'emit_result')!;
        const emitInputs = emit.with as Record<string, string>;
        expect(String(emitInputs.approved)).toContain(
          'steps.record_proposal_action_decision.output.approved == true'
        );
        expect(String(emitInputs.applied)).toContain(
          'steps.record_proposal_action_decision.output.applied == true'
        );
        for (const value of [emitInputs.approved, emitInputs.applied]) {
          expect(String(value)).not.toContain('review_tuning');
          expect(String(value)).not.toContain(' and ');
        }

        // The review changes no rule itself; the gate's action does, as the approver.
        for (const type of ['security.patchRule', 'security.createRuleException']) {
          expect(reviewSteps.filter((step) => step.type === type)).toEqual([]);
        }
        for (const name of [
          'apply_query_tuning',
          'apply_risk_score_tuning',
          'apply_exception_tuning',
        ]) {
          expect(reviewSteps.some((step) => step.name === name)).toBe(false);
        }
      });

      // Every editable field must be in the pick list, or edits to it would be dropped.
      it('patches every editable field it is given, and nothing else', () => {
        const yaml = parse(getManagedYaml(ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID)) as WorkflowYaml;
        const actionSteps = flattenSteps(yaml.steps as unknown as NestedStep[]);
        const patchStep = actionSteps.find(({ type }) => type === 'security.patchRule')!;
        const [trigger] = yaml.triggers as unknown as Array<{
          inputs: { properties: { actionInput: { properties: Record<string, unknown> } } };
        }>;
        const editable = Object.keys(trigger.inputs.properties.actionInput.properties).filter(
          (key) => key !== 'expected_revision'
        );
        const patch = String(patchStep.with?.patch);

        expect(patch).toMatch(/^\$\{\{ inputs\.actionInput \| pick: /);
        expect(patch).not.toContain('expected_revision');
        for (const key of editable) {
          expect(patch).toContain(`'${key}'`);
        }

        // No impact on the action: the caller's value wins.
        const metadata = (yaml.consts as Record<string, Record<string, unknown>>).actionMetadata;
        expect(metadata).not.toHaveProperty('impact');
        expect(metadata.approvalPolicy).toBe('always-gate');
      });

      describe.each([
        ['edit', ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID],
        ['exception', ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID],
      ])('refuses a stale %s proposal', (_kind, workflowId) => {
        it.each([
          ['a deleted rule', { error: { message: 'HTTP 404: Not Found' } }, 0, 'fail_rule_deleted'],
          [
            'any other read failure',
            { error: { message: 'HTTP 500: Internal Server Error' } },
            0,
            'fail_rule_read',
          ],
          ['a rule edited since', { output: { revision: 1 } }, 0, 'fail_rule_changed'],
          ['an unchanged rule', { output: { revision: 0 } }, 0, undefined],
          ['a proposal without a revision', { output: { revision: 3 } }, undefined, undefined],
        ])('for %s', (_, fetchRule, expectedRevision, expectedFailStep) => {
          const yaml = parse(getManagedYaml(workflowId)) as WorkflowYaml;
          const context = {
            inputs: { actionInput: { id: 'rule-1', expected_revision: expectedRevision } },
            steps: { fetch_rule: fetchRule },
          };
          const steps = flattenSteps(yaml.steps as unknown as NestedStep[]);
          const failStep = steps.find(
            ({ type, if: condition }) =>
              type === 'workflow.fail' && resolveExpression(condition, context) === true
          );

          expect(failStep?.name).toBe(expectedFailStep);
          // The rule is only touched after every check has had its chance to stop the run.
          expect(steps.findIndex(({ type }) => type.startsWith('security.'))).toBeGreaterThan(
            steps.findIndex((step) => step === failStep)
          );
        });
      });

      // The gate validates actionInput against this schema at proposal creation.
      it('accepts any subset of editable fields but still checks their values', () => {
        const yaml = parse(getManagedYaml(ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID)) as WorkflowYaml;
        const [trigger] = yaml.triggers as unknown as Array<{
          inputs: { properties: Record<string, unknown> };
        }>;
        const schema = convertJsonSchemaToZod(
          trigger.inputs.properties.actionInput as Parameters<typeof convertJsonSchemaToZod>[0]
        );
        const accepts = (actionInput: Record<string, unknown>) =>
          schema.safeParse(actionInput).success;

        expect(accepts({ id: 'r', query: 'a: b' })).toBe(true);
        expect(accepts({ id: 'r', risk_score: 21, severity: 'low' })).toBe(true);
        expect(accepts({ id: 'r', query: 'a: b', risk_score: 21 })).toBe(true);
        expect(accepts({ query: 'a: b' })).toBe(false);
        // Values are still checked.
        expect(accepts({ id: 'r', risk_score: '21' })).toBe(false);
        expect(accepts({ id: 'r', risk_score: 500 })).toBe(false);
        expect(accepts({ id: 'r', severity: 'informational' })).toBe(false);
        expect(accepts({ id: 'r', enabled: false })).toBe(false);
      });

      // An exception is not a rule patch, so it has its own action.
      it('creates the exception from entries the review passes as objects', () => {
        const yaml = parse(
          getManagedYaml(ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID)
        ) as WorkflowYaml;
        const actionSteps = flattenSteps(yaml.steps as unknown as NestedStep[]);
        const createStep = actionSteps.find(({ type }) => type === 'security.createRuleException')!;

        expect(createStep.with?.rule_id).toBe('{{ inputs.actionInput.rule_id }}');
        expect(createStep.with?.entries).toBe('${{ inputs.actionInput.entries }}');

        const [trigger] = yaml.triggers as unknown as Array<{
          inputs: { properties: Record<string, unknown> };
        }>;
        const schema = convertJsonSchemaToZod(
          trigger.inputs.properties.actionInput as Parameters<typeof convertJsonSchemaToZod>[0]
        );
        const base = { rule_id: 'r', name: 'n', description: 'd' };
        const accepts = (entries: unknown) => schema.safeParse({ ...base, entries }).success;

        expect(accepts([{ field: 'user.name', operator: 'is', value: 'svc' }])).toBe(true);
        expect(accepts([{ field: 'host.name', operator: 'is_one_of', values: ['a'] }])).toBe(true);
        expect(accepts([{ field: 'a.b', operator: 'exists' }])).toBe(true);
        expect(accepts([{ field: 'user.name', operator: 'is' }])).toBe(false);
        expect(accepts([{ field: 'user.name', operator: 'bogus', value: 'x' }])).toBe(false);
        expect(accepts([])).toBe(false);
        // Only `${{ }}` keeps objects; `{{ }}` renders a string.
        expect(
          accepts('${{ steps.diagnose_rule.output.structured_output.exception_entries }}')
        ).toBe(false);
      });

      // The action ran inside the gate, so the patched rule is not visible here; the
      // attachment refresh re-reads it by saved-object id, the same id fetch_rule used,
      // so a rule deleted and recreated under the same signature 404s instead of matching.
      it('re-reads the applied rule to refresh the attachment', () => {
        const fetches = reviewSteps.filter(({ name }) =>
          ['fetch_rule', 'refetch_rule'].includes(name)
        );
        const refetch = reviewSteps.find(({ name }) => name === 'refetch_rule')!;
        const refresh = reviewSteps.find(({ name }) => name === 'refresh_rule_attachment')!;

        expect(fetches).toHaveLength(2);
        for (const fetch of fetches) {
          expect(String(fetch.with?.path)).toContain('?id={{ inputs.rule_uuid | url_encode }}');
        }
        expect(refetch.if).toContain(
          'steps.record_proposal_action_decision.output.applied == true'
        );
        expect(refresh.if).toContain('steps.refetch_rule.output.id != null');
        expect(JSON.stringify(refresh.with)).toContain('steps.refetch_rule.output | json');
      });

      // The rule card reads `origin` as the saved-object id, and the agent's edits keep
      // `origin` but drop the ids from `text`. Resolving by origin looks the rule up by
      // rule_id, so the content comes by value from the same fetch.
      it('links the rule attachment by saved-object id and snapshots fetch_rule', () => {
        const attach = reviewSteps.find(({ name }) => name === 'attach_rule')!;

        expect(attach.with?.type).toBe('security.rule');
        expect(attach.with?.origin).toBe('{{ inputs.rule_uuid }}');
        expect(attach.with?.data).toEqual({
          text: '{{ steps.fetch_rule.output | json }}',
          attachmentLabel: '{{ steps.fetch_rule.output.name }}',
        });
      });

      // No agent runs in the investigation to reference an attachment, so without
      // `render_inline` the analyst only finds these in the attachment list.
      it.each(['attach_rule', 'refresh_rule_attachment', 'attach_exception', 'attach_alerts'])(
        'renders %s inline in the investigation',
        (stepName) => {
          const step = reviewSteps.find(({ name }) => name === stepName)!;

          expect(step.with?.render_inline).toBe(true);
          expect(step.with?.conversation_id).toBe(
            '{{ steps.create_investigation.output.conversation_id }}'
          );
          expect(step['on-failure']).toEqual({ continue: true });
        }
      );

      // The card previews the same item the action creates, but its historical
      // description must not claim that a still-pending or dismissed item was added.
      it('attaches the proposed exception with lifecycle-neutral wording', () => {
        const attach = reviewSteps.find(({ name }) => name === 'attach_exception')!;
        const propose = reviewSteps.find(({ name }) => name === 'propose_exception')!;
        const {
          rule_id: ruleId,
          expected_revision: expectedRevision,
          description: actionDescription,
          ...exceptionItem
        } = (propose.with?.inputs as { actionInput: Record<string, unknown> }).actionInput;

        expect(attach.type).toBe('ai.attachment.add');
        expect(attach.with?.type).toBe('security.exception');
        expect(attach.with?.data).toEqual({
          ...exceptionItem,
          description:
            'Exception proposed by the rule tuning workflow after reviewing {{ inputs.fp_count }} false-positive alerts.',
        });
        expect(ruleId).toBe('{{ inputs.rule_uuid }}');
        expect(expectedRevision).toBe('${{ steps.fetch_rule.output.revision }}');
        expect(actionDescription).toBe(
          'Added by the rule tuning workflow after {{ inputs.fp_count }} false positives were reviewed.'
        );
        expect(reviewSteps.indexOf(attach)).toBeLessThan(reviewSteps.indexOf(propose));
      });

      // The proposal text no longer links alert ids. The attachment takes the
      // first 20, which is the most `security.alerts` accepts.
      it('attaches the first 20 false-positive alerts', () => {
        const attach = reviewSteps.find(({ name }) => name === 'attach_alerts')!;

        expect(review.consts?.alerts_per_attachment).toBe(20);
        expect(attach.type).toBe('ai.attachment.add');
        expect(attach.with?.type).toBe('security.alerts');
        expect(attach.with?.id).toBe('fp-alerts');
        expect((attach.with?.data as { alertIds?: string }).alertIds).toBe(
          '${{ inputs.alert_ids | slice: 0, consts.alerts_per_attachment }}'
        );
        expect(reviewSteps.indexOf(attach)).toBeGreaterThan(
          reviewSteps.findIndex(({ name }) => name === 'attach_rule')
        );
      });

      // Both backtests run inside one preview worker execution, and the proposal
      // gates are the only other children: one synchronous child per wake-up cycle
      // is safe, while two consecutive child calls share one immediate-resume slot
      // and can strand the review in waiting_for_child. Each gate resumes the run
      // before the next child executes, so each cycle holds exactly one child.
      it('backtests both queries through a single preview worker run', () => {
        const children = reviewSteps.filter(({ type }) => type === 'workflow.execute');

        expect(children.map(({ name }) => name)).toEqual([
          'propose_entry',
          'run_previews',
          'propose_query',
          'propose_risk_score',
          'propose_exception',
          'propose_threshold',
          'propose_schedule',
          'propose_manual',
        ]);
        const [, previews] = children;
        expect(previews.with?.['workflow-id']).toBe(ALERTZERO_RULE_PREVIEW_WORKFLOW_ID);

        const previewInputs = previews.with?.inputs as Record<
          string,
          Record<string, string> | string
        >;
        const previewBody = previewInputs.preview_body as Record<string, string>;
        const proposedBody = previewInputs.proposed_body as Record<string, string>;
        expect(previewBody.query).toBe('{{ steps.fetch_rule.output.query }}');
        expect(previewBody.filters).toBe(
          '${{ steps.fetch_rule.output.filters | default: consts.no_items }}'
        );
        // The query arm previews the proposed query; the exception arm keeps the rule's
        // own query and differs only in the filters the exception step built.
        expect(proposedBody.query).toContain(
          "{% if steps.diagnose_rule.output.structured_output.change_type == 'exception' %}{{ steps.fetch_rule.output.query }}"
        );
        expect(proposedBody.query).toContain(
          '{% else %}{{ steps.diagnose_rule.output.structured_output.proposed_query }}{% endif %}'
        );
        expect(proposedBody.filters).toContain('steps.build_exception_filter.output.filters');
        expect(proposedBody.filters).toContain('| default: steps.fetch_rule.output.filters');
      });

      // The backtest informs the analyst but never decides whether the edit-rule
      // action is offered: an inconclusive preview is reported in the proposal text.
      it('reports an inconclusive backtest without withholding the action', () => {
        const action = reviewSteps.find(({ name }) => name === 'propose_query')!;
        const compose = reviewSteps.find(({ name }) => name === 'compose_proposal')!;
        const comment = String((compose.with as Record<string, string>).comment);

        expect(String(action.if)).not.toContain('record_preview_outcome');
        expect(comment).toContain('{% if steps.can_preview_query_change.output.supported %}');
        expect(comment).toContain('inconclusive');
        // The unbacktested branch must not promise a manual handoff. The query arm
        // carries the edit-rule action whether or not the preview ran, so approving
        // applies the change and the alerts are tagged applied, not acknowledged.
        expect(comment).toContain('Approving still applies the proposed change');
        expect(comment).not.toContain('not previewed or applied automatically');
        expect(comment).not.toContain('marks these alerts acknowledged');
      });

      // The diagnosis schema leaves its title unbounded and the proposal step
      // rejects anything longer, so an unbounded forward fails the whole review.
      it('bounds the proposal title to what the proposal step accepts', async () => {
        const compose = reviewSteps.find(({ name }) => name === 'compose_proposal')!;
        const title = String((compose.with as Record<string, string>).title);

        const rendered = await createWorkflowLiquidEngine().parseAndRender(title, {
          steps: {
            diagnose_rule: { output: { structured_output: { title: 'T'.repeat(900) } } },
          },
        });

        expect(rendered.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
      });

      // Appended with `trigger_mode: never` so the note does not run the investigation
      // agent. A direct request rather than the journal note workflow keeps the
      // proposal gate the only synchronous child in its wake-up cycle.
      it.each([
        ['post_fp_pattern', '{{ steps.diagnose_rule.output.structured_output.fp_pattern }}'],
        ['post_reasoning', '{{ steps.diagnose_rule.output.structured_output.reasoning }}'],
      ])('posts %s to the investigation without running the agent', (stepName, field) => {
        const note = reviewSteps.find(({ name }) => name === stepName)!;
        const body = note.with?.body as Record<string, string>;

        expect(note.type).toBe('kibana.request');
        expect(note.with?.method).toBe('POST');
        expect(note.with?.path).toBe('/s/{{ workflow.spaceId }}/api/chat/converse');
        expect(note.if).toContain('steps.create_investigation.output.conversation_id != null');
        expect(note['on-failure']).toEqual({ continue: true });
        expect(body.conversation_id).toBe(
          '{{ steps.create_investigation.output.conversation_id }}'
        );
        expect(body.trigger_mode).toBe('never');
        expect(body.input).toContain(field);
        expect(reviewSteps.indexOf(note)).toBeLessThan(
          reviewSteps.findIndex(({ name }) => name === 'compose_proposal')
        );
      });

      // The proposal only carries a note when that post did not land, so a failed
      // post cannot drop it from everything the analyst sees.
      it.each([
        ['reasoning', 'post_reasoning', '**Reasoning**', '1. Unique reasoning', 'reasoning'],
        [
          'false positive pattern',
          'post_fp_pattern',
          '**False positive pattern**',
          'svc_backup on backup-01',
          'fp_pattern',
        ],
      ])(
        'keeps the %s in the proposal only when the note failed',
        (_label, stepName, heading, text, field) => {
          const compose = reviewSteps.find(({ name }) => name === 'compose_proposal')!;
          const commentTemplate = String((compose.with as Record<string, string>).comment);
          const render = (step: Record<string, unknown>) =>
            createWorkflowLiquidEngine().parseAndRenderSync(commentTemplate, {
              inputs: { fp_count: 2, alert_ids: ['a', 'b'] },
              steps: {
                diagnose_rule: {
                  output: { structured_output: { change_type: 'manual', [field]: text } },
                },
                [stepName]: step,
              },
            });

          const landed = render({});
          const failed = render({ error: { message: 'boom' } });

          expect(landed.includes(heading)).toBe(false);
          expect(landed.includes(text)).toBe(false);
          expect(failed.includes(heading)).toBe(true);
          expect(failed.includes(text)).toBe(true);
        }
      );

      it('leaves the investigation link and the recommended action out of the proposals', () => {
        const entry = reviewSteps.find(({ name }) => name === 'propose_entry')!;
        const compose = reviewSteps.find(({ name }) => name === 'compose_proposal')!;
        const entryComment = String((entry.with?.inputs as { comment: string }).comment);
        const proposalComment = String((compose.with as Record<string, string>).comment);

        expect(entryComment).not.toContain('investigation_line');
        expect(proposalComment).not.toContain('investigation_line');
        expect(proposalComment).not.toContain('Recommended action');
      });

      // A skipped step renders as nil, so `nil == 'succeeded'` is false and the
      // step that ran decides alone. A dismissal always carries `status: no_action`.
      it.each([
        ['query applied', 'propose_query', 'succeeded', 'approved', true, false],
        ['settings applied', 'propose_risk_score', 'succeeded', 'approved', true, false],
        ['exception applied', 'propose_exception', 'succeeded', 'approved', true, false],
        ['query dismissed', 'propose_query', 'no_action', 'dismissed', false, true],
        ['settings dismissed', 'propose_risk_score', 'no_action', 'dismissed', false, true],
        ['exception dismissed', 'propose_exception', 'no_action', 'dismissed', false, true],
        ['manual approved', 'propose_manual', 'no_action', 'approved', false, false],
        ['manual dismissed', 'propose_manual', 'no_action', 'dismissed', false, true],
        ['nobody answered, gate expired', 'propose_query', 'expired', '', false, false],
        ['nothing proposed', 'none', '', '', false, false],
      ])(
        'derives applied and dismissed from whichever proposal ran: %s',
        (_scenario, whichStep, status, decisionValue, expectApplied, expectDismissed) => {
          const decision = reviewSteps.find(
            ({ name }) => name === 'record_proposal_action_decision'
          )!;
          const flags = decision.with as Record<string, string>;
          const steps: Record<string, unknown> =
            whichStep === 'none'
              ? {}
              : { [whichStep]: { output: { status, decision: decisionValue } } };
          const evaluate = (expr: string) =>
            createWorkflowLiquidEngine().evalValueSync(String(expr).trim().slice(3, -2).trim(), {
              steps,
            });

          expect(evaluate(flags.applied)).toBe(expectApplied);
          expect(evaluate(flags.dismissed)).toBe(expectDismissed);
        }
      );

      // A partial or timed-out alert count would understate a backtest, so the
      // preview worker must fail its verdict instead of reporting a low number.
      it('fails preview verdicts on partial counts', () => {
        const preview = parse(getManagedYaml(ALERTZERO_RULE_PREVIEW_WORKFLOW_ID)) as WorkflowYaml;
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

      it('excludes rule modes with omitted preview fields from auto-apply', () => {
        const support = reviewSteps.find(({ name }) => name === 'can_preview_query_change')!;
        expect(String(support.with?.supported)).toContain(
          'steps.fetch_rule.output.data_view_id == null'
        );
        expect(String(support.with?.supported)).toContain(
          'steps.fetch_rule.output.timestamp_override == null'
        );
        expect(String(support.with?.supported)).toContain(
          'steps.fetch_rule.output.alert_suppression == null'
        );
        expect(String(support.with?.supported)).toContain(
          "steps.diagnose_rule.output.structured_output.change_type == 'query'"
        );
        expect(String(support.with?.supported)).toContain(
          "steps.fetch_rule.output.type == 'query'"
        );

        const previews = reviewSteps.find(({ name }) => name === 'run_previews')!;
        expect(String(previews.if)).toContain(
          'steps.can_preview_query_change.output.supported == true'
        );
      });

      it('bounds direct review inputs', () => {
        const [trigger] = review.triggers as unknown as Array<{
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

      // security.setAlertTags declares its inputs as a zod union, so a whole-array
      // template lands the validation error on `with` instead of the templated field
      // and is not recognised as a template. Each tag must be its own list item.
      it('lists tags_to_add item by item, never as one array template', () => {
        for (const step of tagSteps) {
          const tags = step.with?.tags_to_add as string[];
          expect(Array.isArray(tags)).toBe(true);
          for (const tag of tags) {
            expect(tag).toMatch(/^\{\{ consts\.\w+ \}\}$/);
          }
        }
      });

      it('declares one const per decision tag, alongside the reviewed tag the harvest filters', () => {
        expect(review.consts).toEqual(
          expect.objectContaining({
            reviewed_tag: reviewedTag,
            dismissed_tag: 'detection-watch:tuning-dismissed',
            applied_tag: 'detection-watch:tuning-applied',
            acknowledged_tag: 'detection-watch:tuning-acknowledged',
          })
        );

        for (const step of tagSteps) {
          expect(step.with?.tags_to_add).toContain('{{ consts.reviewed_tag }}');
        }
      });

      // The diagnose prompt names a security_solution inline tool by its string id; a
      // skill-side rename would silently degrade the agent back to re-deriving alerts.
      it('pins the get_alerts_by_ids tool id the diagnose prompt depends on', () => {
        const diagnose = reviewSteps.find(({ name }) => name === 'diagnose_rule')!;
        expect(String(diagnose.with?.message)).toContain('investigate-rule.get_alerts_by_ids');
      });

      // The harvested ids are the dataset. A security.alerts query would re-fetch the
      // same alerts through a natural-language round trip and burn agent time.
      it('keeps the diagnosis on the supplied ids instead of querying alerts again', () => {
        const diagnose = reviewSteps.find(({ name }) => name === 'diagnose_rule')!;
        const message = String(diagnose.with?.message);

        expect(message).toContain('do not run the security.alerts queries');
        expect(message).not.toContain('time_window_hours');
      });

      it('does not use redundant proposal classification steps', () => {
        for (const steps of [tuningSteps, reviewSteps]) {
          expect(steps.some(({ name }) => name === 'classify_review')).toBe(false);
          expect(steps.some(({ name }) => name === 'record_apply_path')).toBe(false);
          expect(steps.some(({ name }) => name === 'classify_proposal')).toBe(false);
        }
      });

      // The harvest projects its columns positionally, so reordering KEEP would make the
      // sweep hand some other column to the review as the alert ids.
      it('passes the alert ids from the column position KEEP assigns them', () => {
        const keepClause = harvestQuery
          .split('\n')
          .find((line) => line.trimStart().startsWith('| KEEP'))!;
        const columns = keepClause
          .replace('| KEEP', '')
          .split(',')
          .map((column) => column.trim().replace(/`/g, ''));
        const launch = tuningSteps.find(({ name }) => name === 'run_review')!;
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

      // The gates live in the review children (one execution = one resume slot),
      // while the sweep fans out synchronously and joins once every gate settles.
      it('fans out one sync review per rule and joins on all gates', () => {
        const fanOut = tuningSteps.find(({ name }) => name === 'run_reviews')! as NestedStep & {
          mode?: string;
          concurrency?: { max: number; 'count-waiting': boolean };
        };
        const launches = tuningSteps.filter(({ type }) => type === 'workflow.execute');

        expect(fanOut.type).toBe('parallel');
        // Settled: one failed review must not skip the other rules' gates.
        expect(fanOut.mode).toBe('settled');
        // A slot per launched rule (max_rules_per_sweep; the input can only lower
        // the cap) so every gate opens at once.
        expect(fanOut.concurrency).toEqual({ max: 10, 'count-waiting': false });
        // A timeout here would abort branches and cancel children mid-approval;
        // the child gate's own timeout is the only clock.
        expect(fanOut).not.toHaveProperty('timeout');
        expect(fanOut).not.toHaveProperty('branch-timeout');

        expect(launches.map(({ name }) => name)).toEqual(['run_review']);
        expect(launches[0].with?.['workflow-id']).toBe(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID);
        expect(launches[0]).not.toHaveProperty('on-failure');
        expect(tuningSteps.map(({ type }) => type)).not.toContain('waitForApproval');
        expect(tuningSteps.map(({ type }) => type)).not.toContain('workflow.executeAsync');

        const { concurrency } = (review as unknown as { settings: Record<string, unknown> })
          .settings as { concurrency: { key: string; strategy: string; max: number } };
        expect(concurrency.key).toContain('{{ inputs.rule_uuid }}');
        expect(concurrency.strategy).toBe('drop');
        expect(concurrency.max).toBe(1);
      });

      // The limit is per space; with max 1 a sweep waiting on its gates (up to 72h)
      // would make every scheduled 2h sweep get skipped until it finishes.
      it('keeps sweeping a space for new rules while earlier gates are pending', () => {
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

        expect(summaryInput).toContain('steps.run_reviews.output.failed');
        expect(summaryInput).toContain("where: 'approved'");
        expect(summaryInput).toContain("where: 'applied'");
        for (const key of [
          'reviews_requested',
          'reviews_approved',
          'reviews_failed',
          'rules_applied',
        ]) {
          expect(String((emit.with as Record<string, string>)[key])).toContain(
            `steps.summarize_decisions.output.${key}`
          );
        }
      });
    });

    describe('coverage sweep', () => {
      const sweep = parse(
        getManagedWorkflowDefinition(ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID)!.yaml!
      ) as WorkflowYaml;
      const review = parse(
        getManagedWorkflowDefinition(ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID)!.yaml!
      ) as WorkflowYaml;
      const sweepSteps = flattenSteps(sweep.steps as unknown as NestedStep[]);
      const consts = sweep.consts as Record<string, unknown>;
      const step = (name: string) => sweepSteps.find((s) => s.name === name)!;
      const withOf = (name: string) => step(name).with as Record<string, unknown>;
      const sweepTypes = sweepSteps.map(({ type }) => type);

      // The review keys its concurrency group on the indicator id and the sweep parses
      // those keys back into ids. If the prefix drifts on either side the sweep excludes
      // nothing and re-dispatches every open indicator.
      it('parses the review concurrency key prefix the review actually uses', () => {
        const { concurrency } = (review as unknown as { settings: Record<string, unknown> })
          .settings as { concurrency: { key: string; strategy: string; max: number } };
        const collect = String(withOf('collect_active_indicators').parsed);

        expect(concurrency.key).toBe('coverage-{{ inputs.ki_id }}');
        expect(concurrency.strategy).toBe('drop');
        expect(concurrency.max).toBe(1);
        expect(collect).toContain("map: 'concurrencyGroupKey'");
        expect(collect).toContain("remove: 'coverage-'");
      });

      // `remove` strips every occurrence, not a prefix, and `join`/`split` use a comma.
      // A comma inside a key would yield more ids than there are reviews, and a fragment
      // could name an unrelated indicator. The ids are published only when the parse
      // yields exactly one id per active review, the same integrity check the rule-tuning
      // sweep applies.
      it('publishes the parsed ids only when they match the number of active reviews', () => {
        const collect = withOf('collect_active_indicators');
        const resolve = step('resolve_active_indicators');

        expect(String(collect.parsed_count)).toContain("remove: 'coverage-'");
        expect(String(collect.parsed_count)).toContain('| size');
        expect(String(resolve.if)).toContain(
          'steps.collect_active_indicators.output.parsed_count == steps.collect_active_indicators.output.count'
        );
        expect(String((resolve.with as Record<string, unknown>).indicator_ids)).toContain(
          'steps.collect_active_indicators.output.parsed'
        );
      });

      // Active reviews are read from the engine, never from the indicator. If the lookup
      // fails, the sweep continues with an empty list. Then every pending indicator is a
      // candidate, and the review's own concurrency key drops a duplicate review.
      it('lists active reviews of the review workflow and continues when the lookup fails', () => {
        const lookup = step('list_active_reviews');
        const path = String(lookup.with?.path);

        expect(lookup.type).toBe('kibana.request');
        expect(path).toContain('/s/{{ workflow.spaceId }}/api/workflows/workflow/');
        expect(path).toContain(
          `/api/workflows/workflow/${ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID}/executions?`
        );
        for (const status of [
          'pending',
          'queued',
          'waiting',
          'waiting_for_input',
          'waiting_for_child',
          'running',
        ]) {
          expect(path).toContain(`statuses=${status}`);
        }
        // The executions API rejects size > 100. size=100 is the maximum allowed.
        expect(path).toContain('size=100');
        expect(lookup['on-failure']).toEqual({ continue: true });
      });

      // Limit of active reviews per space: free = maximum minus active, never below zero.
      // The manual input can only lower the maximum.
      it('tops the space up to max_open_checks and no further', () => {
        const free = String(withOf('resolve_free_slots').free);
        const inputs = (
          sweep.triggers as unknown as Array<{
            type: string;
            inputs?: { properties: Record<string, { maximum?: number }> };
          }>
        ).find(({ type }) => type === 'manual')!.inputs!.properties;

        expect(consts.max_open_checks).toBe(100);
        expect(free).toContain('inputs.max_open_checks | default: consts.max_open_checks');
        expect(free).toContain('minus: steps.collect_active_indicators.output.count');
        expect(free).toContain('at_least: 0');
        // dispatch is capped by both the ceiling and the per-sweep batch size
        const dispatch = String(withOf('resolve_dispatch_batch').indicators);
        expect(dispatch).toContain('slice: 0, steps.resolve_free_slots.output.free');
        expect(dispatch).toContain('slice: 0, steps.resolve_batch_size.output.size');
        expect(inputs.max_open_checks.maximum).toBe(consts.max_open_checks);
      });

      it('resolves batch_size from input or default and caps dispatch to it', () => {
        const batchSize = String(withOf('resolve_batch_size').size);
        const inputs = (
          sweep.triggers as unknown as Array<{
            type: string;
            inputs?: { properties: Record<string, { maximum?: number }> };
          }>
        ).find(({ type }) => type === 'manual')!.inputs!.properties;

        expect(consts.batch_size).toBe(5);
        expect(batchSize).toContain('inputs.batch_size | default: consts.batch_size');
        expect(inputs.batch_size.maximum).toBe(50);
      });

      // Indicators with an active review are excluded in the query itself, so they never
      // take a result slot from a free one. The search size is the maximum allowed batch_size
      // input (50) so all valid batch sizes have enough candidates to slice from.
      it('searches pending indicators minus the active ones, sized for the max batch', () => {
        const search = step('search_pending_indicators');
        const query = JSON.stringify(search.with?.query);

        expect(search.type).toBe('elasticsearch.search');
        expect(String(search.with?.index)).toContain('ai-index-idx-');
        expect(query).toContain('"type":"security.coverage"');
        expect(query).toContain('"attributes.status":"pending"');
        expect(query).toContain('must_not');
        expect(query).toContain(
          '"ids":{"values":"${{ steps.resolve_active_indicators.output.indicator_ids | default: consts.no_rows }}"}'
        );
        expect(search.with?.size).toBe(50);
        expect(search['on-failure']).toEqual({ continue: true });
      });

      // All spaces share one indicator index. The sweep and the review filter on the same field.
      it('scopes the sweep search and the review read to the current space', () => {
        const spaceFilter = { term: { 'attributes.space_id': '{{ workflow.spaceId }}' } };
        const sweepQuery = withOf('search_pending_indicators').query as {
          bool: { filter: unknown[] };
        };
        const reviewRead = flattenSteps(review.steps as unknown as NestedStep[]).find(
          ({ name }) => name === 'read_ki'
        );
        const reviewQuery = reviewRead?.with?.query as { bool?: { filter?: unknown[] } };

        expect(sweepQuery.bool.filter).toContainEqual(spaceFilter);
        expect(reviewQuery?.bool?.filter).toContainEqual(spaceFilter);
      });

      // Only `_id` reaches the review. An indicator's content can be 64 kB, so 50 hits
      // would move megabytes the sweep never reads.
      it('reads no indicator content', () => {
        expect(step('search_pending_indicators').with?._source).toBe(false);
        expect(
          ((step('start_reviews').steps ?? [])[0].with?.inputs as Record<string, string>).ki_id
        ).toBe('{{ foreach.item._id }}');
      });

      // The window counts from the indicator's creation time, which `context-engine`
      // stamps once. An indicator that leaves the window is never reviewed, so the sweep
      // takes the oldest ones in the window first.
      it('looks back a bounded number of days and takes the oldest indicators first', () => {
        const search = step('search_pending_indicators');
        const query = JSON.stringify(search.with?.query);
        const inputs = (
          sweep.triggers as unknown as Array<{
            type: string;
            inputs?: { properties: Record<string, { minimum?: number; maximum?: number }> };
          }>
        ).find(({ type }) => type === 'manual')!.inputs!.properties;

        expect(consts.lookback_days).toBe(14);
        expect(query).toContain(
          '"gte":"now-{{ inputs.lookback_days | default: consts.lookback_days }}d"'
        );
        expect(JSON.stringify(search.with?.sort)).toContain('"order":"asc"');
        expect(inputs.lookback_days.minimum).toBe(1);
        expect(inputs.lookback_days.maximum).toBe(90);
      });

      // A review parks on its proposal for up to its timeout, and an expired proposal
      // leaves the indicator pending for the next sweep. That sweep only retries it if
      // the indicator is still inside the window.
      it('looks back further than the longest review can park', () => {
        const { timeout } = (review as unknown as { settings: { timeout: string } }).settings;
        const reviewHours = Number(timeout.replace(/h$/, ''));

        expect(timeout).toMatch(/^\d+h$/);
        expect(Number(consts.lookback_days) * 24).toBeGreaterThan(reviewHours);
      });

      // Async fan-out: the sweep starts one review per indicator and exits. Each review
      // waits for its approval in its own execution. Nothing in the sweep waits.
      it('starts one async review per indicator and never waits for an approval', () => {
        const loop = step('start_reviews') as NestedStep & { foreach?: string };
        const launches = sweepSteps.filter(({ type }) => type === 'workflow.executeAsync');

        expect(loop.type).toBe('foreach');
        expect(String(loop.foreach)).toContain('steps.resolve_dispatch_batch.output.indicators');
        expect(launches.map(({ name }) => name)).toEqual(['start_review']);
        expect(launches[0].with?.['workflow-id']).toBe(ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID);
        expect((launches[0].with?.inputs as Record<string, string>).ki_id).toBe(
          '{{ foreach.item._id }}'
        );
        expect((launches[0].with?.inputs as Record<string, string>).autonomy_level).toBe(
          "{{ inputs.autonomy_level | default: 'manual' }}"
        );
        expect(sweepTypes).not.toContain('workflow.execute');
        expect(sweepTypes).not.toContain('waitForApproval');
        expect(sweepTypes).not.toContain('parallel');
      });

      // The sweep exits in seconds, so one at a time per space is enough. A schedule
      // cannot live on a workflow installed in the global space, so it is manual only.
      it('is manual-only with one sweep per space at a time', () => {
        const triggers = sweep.triggers as unknown as Array<{ type: string }>;
        const { concurrency } = (sweep as unknown as { settings: Record<string, unknown> })
          .settings as { concurrency: { strategy: string; max: number } };

        expect(triggers.map(({ type }) => type)).toEqual(['manual']);
        expect(concurrency.strategy).toBe('drop');
        expect(concurrency.max).toBe(1);
      });

      // The sweep reads the queue and never writes to it; the review owns the outcome.
      it('never writes to the knowledge indicators', () => {
        for (const type of [
          'context-engine.createKi',
          'context-engine.updateKi',
          'context-engine.deleteKi',
          'elasticsearch.index',
          'elasticsearch.update',
        ]) {
          expect(sweepTypes).not.toContain(type);
        }
      });

      // The coverage skill lives in the review; the sweep runs no agent.
      it('keeps the coverage skill inside the review', () => {
        const skills = (id: string) =>
          projectSkillsFromDefinition(parse(getManagedYaml(id)) as WorkflowYaml, undefined);

        expect(skills(ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID)).toEqual([]);
        expect(skills(ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: 'detection-coverage', kind: 'skill' }),
          ])
        );
      });

      // A sweep that reports zero pending because a read failed is not an empty queue,
      // so each failed read is reported separately.
      it('reports the queue and each failed read separately', () => {
        const emit = withOf('emit_result') as Record<string, string>;
        const outputs = (sweep.outputs as Array<{ name: string }>).map(({ name }) => name);

        expect(outputs).toEqual([
          'pending',
          'started',
          'in_flight',
          'search_failed',
          'lookup_failed',
        ]);
        expect(String(emit.pending)).toContain(
          'steps.search_pending_indicators.output.hits.total.value'
        );
        expect(String(emit.started)).toContain('steps.resolve_dispatch_batch.output.indicators');
        expect(String(emit.in_flight)).toContain('steps.collect_active_indicators.output.count');
        expect(String(emit.search_failed)).toContain(
          'steps.search_pending_indicators.error != null'
        );
        expect(String(emit.lookup_failed)).toContain('steps.list_active_reviews.error != null');
      });
    });
  });
});
