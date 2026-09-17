/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import { createWorkflowLiquidEngine } from '@kbn/workflows';
import {
  getManagedWorkflowDefinition,
  ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW_ID,
  ALERTZERO_RULE_PREVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  CREATE_INVESTIGATION_PROPOSAL_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { projectSkillsFromDefinition } from '../services/utils';
import { workerRegistry } from './worker_registry';

const DETECTION_WORKFLOW_IDS = [
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW_ID,
  ALERTZERO_RULE_PREVIEW_WORKFLOW_ID,
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
        analysis_window_days: 14,
      });
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

    // Only `waitForApproval` renders the approve/reject buttons; a `waitForInput` gate
    // makes an analyst hand-author the resume payload as JSON instead.
    it('gates the creation worker on approval responses', () => {
      const { steps } = parse(getManagedYaml(ALERTZERO_RULE_CREATION_WORKFLOW_ID)) as WorkflowYaml;
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
    });

    // Query and manual decisions live on the investigation as proposals, and the gate
    // workflow runs the edit-rule action as the approver. The gate types actionInput
    // as an object, so the manual variant must omit the key rather than pass an empty
    // value, hence two calls instead of one. Exception and risk score changes still
    // use an in-run waitForApproval until their proposal actions exist.
    it('gates the review through the investigation proposal workflow', () => {
      const { steps } = parse(
        getManagedYaml(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID)
      ) as WorkflowYaml;
      const all = flattenSteps(steps as unknown as NestedStep[]);

      const interim = all.filter(({ type }) => type === 'waitForApproval');
      expect(interim.map(({ name }) => name)).toEqual(['review_tuning']);
      expect(String(interim[0].if)).toContain("change_type == 'exception'");
      expect(String(interim[0].if)).toContain("change_type == 'risk_score'");
      expect(String(interim[0].if)).not.toContain("'query'");
      expect(all.map(({ type }) => type)).not.toContain('waitForInput');

      const proposals = all.filter(
        ({ type, with: input }) =>
          type === 'workflow.execute' &&
          input?.['workflow-id'] === CREATE_INVESTIGATION_PROPOSAL_WORKFLOW_ID
      );
      expect(proposals.map(({ name }) => name)).toEqual([
        'propose_entry',
        'propose_action',
        'propose_manual',
      ]);

      const [entry, action, manual] = proposals;
      const entryInputs = entry.with?.inputs as Record<string, unknown>;
      const actionInputs = action.with?.inputs as Record<string, unknown>;
      const manualInputs = manual.with?.inputs as Record<string, unknown>;

      // Manual autonomy stops once for permission to do the work; the entry gate
      // carries no action and a dismissal terminates the run before diagnosis.
      expect(entry.if).toContain("inputs.autonomy_level == 'manual'");
      expect(entryInputs).not.toHaveProperty('actionWorkflowId');
      expect(entryInputs).not.toHaveProperty('actionInput');
      const diagnoseIndex = all.findIndex(({ name }) => name === 'diagnose_rule');
      const stopIndex = all.findIndex(({ name }) => name === 'stop_declined');
      expect(all.findIndex(({ name }) => name === 'propose_entry')).toBeLessThan(stopIndex);
      expect(stopIndex).toBeLessThan(diagnoseIndex);
      expect(all[stopIndex].type).toBe('workflow.output');
      expect(all[stopIndex].if).toContain('steps.record_entry.output.declined == true');

      expect(actionInputs.actionWorkflowId).toBe(ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID);
      expect(actionInputs.actionInput).toEqual({
        id: '{{ inputs.rule_uuid }}',
        query: '{{ steps.diagnose_rule.output.structured_output.proposed_query }}',
      });
      expect(action.if).toContain(
        "steps.diagnose_rule.output.structured_output.change_type == 'query'"
      );

      expect(manualInputs).not.toHaveProperty('actionWorkflowId');
      expect(manualInputs).not.toHaveProperty('actionInput');
      expect(manual.if).toContain(
        "steps.diagnose_rule.output.structured_output.change_type == 'manual'"
      );

      for (const proposal of proposals) {
        expect(proposal.if).toContain('steps.create_investigation.output.conversation_id != null');
        expect(proposal).not.toHaveProperty('on-failure');
      }
      for (const proposal of [action, manual]) {
        expect((proposal.with?.inputs as Record<string, unknown>).comment).toBe(
          '{{ steps.compose_proposal.output.comment }}'
        );
      }
    });

    // The review parks in WAITING_FOR_CHILD while the gate holds the decision —
    // up to 72h per park, and the gate's ceiling allows for a second park before
    // it settles. The engine's default 6h workflow timeout would cancel the
    // review under the analyst.
    it('outlives the proposal gate it waits on', () => {
      const review = parse(
        getManagedYaml(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID)
      ) as WorkflowYaml;
      const gate = parse(getManagedYaml(CREATE_INVESTIGATION_PROPOSAL_WORKFLOW_ID)) as WorkflowYaml;
      const hours = (timeout: unknown) => Number(String(timeout).replace(/h$/, ''));

      expect(String(review.settings?.timeout)).toMatch(/^\d+h$/);
      expect(hours(review.settings?.timeout)).toBeGreaterThan(hours(gate.settings?.timeout));
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
      // carry a step-level `if`), failing open into a full fan-out when the lookup
      // returned nothing.
      it('skips reviews for rules that are no longer enabled', () => {
        const collect = tuningSteps.find(({ name }) => name === 'collect_candidates')!;
        const lookup = tuningSteps.find(({ name }) => name === 'list_enabled_candidates')!;
        const resolve = tuningSteps.find(({ name }) => name === 'resolve_enabled_rules')!;
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

        // The prefixed joined string stays non-empty when zero candidates are
        // enabled, so all-disabled never reads as a missing lookup.
        expect(String(resolve.if)).toContain('steps.list_enabled_candidates.output.data != null');
        expect(String(resolve.with?.enabled_rule_ids)).toContain(
          "| join: ',' | prepend: 'enabled:'"
        );

        const rowsExpr = String(rows.with?.rows);
        expect(rowsExpr).toContain(
          "where_exp: 'row', 'steps.resolve_enabled_rules.output.enabled_rule_ids == null or steps.resolve_enabled_rules.output.enabled_rule_ids contains row[0]'"
        );
        // No `default` after where_exp: an empty filtered array is legitimate and a
        // default would resurrect every disabled candidate.
        expect(rowsExpr).not.toMatch(/where_exp:.*\| default:/);
        // The engine's rehydration planner cannot see step paths inside the quoted
        // where_exp argument; this direct reference keeps the ids resident. If it
        // is removed, an evicted value renders null and the filter fails open.
        expect(String(rows.with?.enabled_rule_ids)).toContain(
          '${{ steps.resolve_enabled_rules.output.enabled_rule_ids }}'
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
        expect(declined.if).toContain('steps.record_entry.output.declined == true');
        expect(declined.with?.tags_to_add).toEqual([
          '{{ consts.reviewed_tag }}',
          '{{ consts.dismissed_tag }}',
        ]);
        // Dismissals come from either gate: the proposal gate (query, manual) or the
        // interim in-run gate (exception, risk score); missing either leaves alerts
        // unreviewed and the next sweep re-proposes the same rule.
        expect(dismissed.if).toContain(
          'steps.record_proposal_action_decision.output.dismissed == true'
        );
        expect(dismissed.if).toContain('steps.review_tuning.output.response.approved == false');
        const closeDismissed = reviewSteps.find(
          ({ name }) => name === 'close_investigation_dismissed'
        )!;
        expect(String(closeDismissed.if)).toContain(
          'steps.record_proposal_action_decision.output.dismissed == true'
        );
        expect(String(closeDismissed.if)).toContain(
          'steps.review_tuning.output.response.approved == false'
        );
        expect(dismissed.with?.tags_to_add).toEqual([
          '{{ consts.reviewed_tag }}',
          '{{ consts.dismissed_tag }}',
        ]);
        expect(applied.if).toContain('steps.record_outcome.output.rule_patched == true');
        expect(applied.with?.tags_to_add).toEqual([
          '{{ consts.reviewed_tag }}',
          '{{ consts.applied_tag }}',
        ]);
        // Approving a recommendation the pipeline cannot apply itself acknowledges
        // the manual follow-up and retires the alerts; the auto-apply path keeps
        // its alerts untagged on failure so a later sweep can retry.
        expect(acknowledged.if).toContain(
          "steps.diagnose_rule.output.structured_output.change_type == 'manual'"
        );
        expect(acknowledged.if).toContain("steps.propose_manual.output.decision == 'approved'");
        expect(acknowledged.if).not.toContain('review_tuning');
        expect(acknowledged.with?.tags_to_add).toEqual([
          '{{ consts.reviewed_tag }}',
          '{{ consts.acknowledged_tag }}',
        ]);
        for (const step of tagSteps) {
          expect(step).not.toHaveProperty('on-failure');
        }
      });

      // The applied tag must mean the gate actually ran the edit-rule action, so it
      // reads `status == 'succeeded'`. What the analyst concluded is a separate axis:
      // `decision` is `approved` or `dismissed`, and is absent until someone decides
      // — so a run that never proposed matches none of these, leaving its alerts
      // untagged for a later sweep to retry.
      it('derives every decision flag from the gate outcome', () => {
        const decision = reviewSteps.find(
          ({ name }) => name === 'record_proposal_action_decision'
        )!;
        const flags = decision.with as Record<string, string>;

        expect(String(flags.applied)).toContain(
          "steps.propose_action.output.status == 'succeeded'"
        );
        expect(String(flags.approved)).toContain(
          "steps.propose_action.output.status == 'succeeded'"
        );
        expect(String(flags.approved)).toContain(
          "steps.propose_manual.output.decision == 'approved'"
        );
        expect(String(flags.dismissed)).toContain(
          "steps.propose_action.output.decision == 'dismissed'"
        );
        expect(String(flags.dismissed)).toContain(
          "steps.propose_manual.output.decision == 'dismissed'"
        );

        // record_outcome reads from record_apply_results to avoid Liquid parentheses;
        // the query path is applied by the gate's action, the others in-run.
        const applyResults = reviewSteps.find(({ name }) => name === 'record_apply_results')!;
        expect(String(applyResults.with?.query_applied)).toContain(
          'steps.record_proposal_action_decision.output.applied == true'
        );
        expect(String(applyResults.with?.query_applied)).not.toContain('apply_query_tuning');
        const outcome = reviewSteps.find(({ name }) => name === 'record_outcome')!;
        for (const flag of ['query_applied', 'exception_applied', 'risk_score_applied']) {
          expect(String(outcome.with?.rule_patched)).toContain(
            `steps.record_apply_results.output.${flag} == true`
          );
        }

        // The sweep reads `approved` from both gates: the proposal gate for query and
        // manual, the interim in-run gate for exception and risk score.
        const emit = reviewSteps.find(({ name }) => name === 'emit_result')!;
        const approved = String((emit.with as Record<string, string>).approved);
        expect(approved).toContain('steps.record_proposal_action_decision.output.approved == true');
        expect(approved).toContain('steps.review_tuning.output.response.approved == true');
        expect(approved).not.toContain(' and ');

        // The review never patches a query itself; only the risk score path patches in-run.
        expect(reviewSteps.some(({ name }) => name === 'apply_query_tuning')).toBe(false);
        expect(
          reviewSteps.filter(({ type }) => type === 'security.patchRule').map(({ name }) => name)
        ).toEqual(['apply_risk_score_tuning']);
      });

      it('applies exceptions via security.createRuleException for approved exception proposals', () => {
        const apply = reviewSteps.find(({ name }) => name === 'apply_exception_tuning')!;
        expect(apply.type).toBe('security.createRuleException');
        expect(apply.if).toContain(
          "steps.diagnose_rule.output.structured_output.change_type == 'exception'"
        );
        expect(apply.if).toContain('steps.review_tuning.output.response.approved == true');
        expect(apply['on-failure']).toEqual({ continue: true });
        expect(apply.with?.rule_id).toBe('{{ inputs.rule_uuid }}');
        expect(apply.with?.entries).toBe(
          '${{ steps.diagnose_rule.output.structured_output.exception_entries }}'
        );

        const applyResults = reviewSteps.find(({ name }) => name === 'record_apply_results')!;
        expect(String(applyResults.with?.exception_applied)).toContain(
          "steps.diagnose_rule.output.structured_output.change_type == 'exception'"
        );
        expect(String(applyResults.with?.exception_applied)).toContain(
          'steps.apply_exception_tuning.error == null'
        );
      });

      it('applies risk score changes via security.patchRule for approved risk score proposals', () => {
        const apply = reviewSteps.find(({ name }) => name === 'apply_risk_score_tuning')!;
        expect(apply.type).toBe('security.patchRule');
        expect(apply.if).toContain(
          "steps.diagnose_rule.output.structured_output.change_type == 'risk_score'"
        );
        expect(apply.if).toContain('steps.review_tuning.output.response.approved == true');
        expect(apply['on-failure']).toEqual({ continue: true });
        const patch = apply.with?.patch as Record<string, string>;
        expect(patch.id).toBe('{{ inputs.rule_uuid }}');
        expect(patch.risk_score).toBe(
          '${{ steps.diagnose_rule.output.structured_output.proposed_risk_score }}'
        );
        expect(patch.severity).toBe(
          '{{ steps.diagnose_rule.output.structured_output.proposed_severity }}'
        );

        const applyResults = reviewSteps.find(({ name }) => name === 'record_apply_results')!;
        expect(String(applyResults.with?.risk_score_applied)).toContain(
          "steps.diagnose_rule.output.structured_output.change_type == 'risk_score'"
        );
        expect(String(applyResults.with?.risk_score_applied)).toContain(
          'steps.apply_risk_score_tuning.error == null'
        );
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
          'propose_action',
          'propose_manual',
        ]);
        const [, previews] = children;
        expect(previews.with?.['workflow-id']).toBe(ALERTZERO_RULE_PREVIEW_WORKFLOW_ID);

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

      // The backtest informs the analyst but never decides whether the edit-rule
      // action is offered: an inconclusive preview is reported in the proposal text.
      it('reports an inconclusive backtest without withholding the action', () => {
        const action = reviewSteps.find(({ name }) => name === 'propose_action')!;
        const compose = reviewSteps.find(({ name }) => name === 'compose_proposal')!;
        const comment = String((compose.with as Record<string, string>).comment);

        expect(String(action.if)).not.toContain('record_preview_outcome');
        expect(comment).toContain('{% if steps.can_preview_query_change.output.supported %}');
        expect(comment).toContain('inconclusive');
        expect(comment).toContain('not previewed or applied automatically');
      });

      it.each([
        ['gate ran the action on a query change', true, 'query', true],
        ['gate dismissed', false, 'query', false],
        ['gate ran but the change was not a query', true, 'exception', false],
        ['no decision recorded', undefined, 'query', false],
      ])(
        'records query application only from the gate result: %s',
        (_scenario, applied, changeType, expected) => {
          const applyResults = reviewSteps.find(({ name }) => name === 'record_apply_results');
          const expression = String(applyResults?.with?.query_applied).slice(3, -2).trim();

          expect(
            createWorkflowLiquidEngine().evalValueSync(expression, {
              steps: {
                record_proposal_action_decision: { output: { applied } },
                diagnose_rule: { output: { structured_output: { change_type: changeType } } },
              },
            })
          ).toBe(expected);
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
      it('fans out one async review per rule without waiting on its gate', () => {
        const fanOut = tuningSteps.find(({ name }) => name === 'run_reviews')!;
        const launches = tuningSteps.filter(({ type }) => type === 'workflow.executeAsync');

        // A sync launch would park the sweep in WAITING_FOR_CHILD for up to 72h
        // per gate and block the space's scheduled sweeps behind it.
        expect(fanOut.type).toBe('foreach');
        expect(fanOut).not.toHaveProperty('timeout');
        expect(fanOut).not.toHaveProperty('branch-timeout');

        expect(launches.map(({ name }) => name)).toEqual(['run_review']);
        expect(launches[0].with?.['workflow-id']).toBe(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID);
        // A dropped or rejected start must not stop the remaining rules' reviews.
        expect(launches[0]['on-failure']).toEqual({ continue: true });
        expect(tuningSteps.map(({ type }) => type)).not.toContain('waitForApproval');
        expect(tuningSteps.map(({ type }) => type)).not.toContain('workflow.execute');

        const { concurrency } = (review as unknown as { settings: Record<string, unknown> })
          .settings as { concurrency: { key: string; strategy: string; max: number } };
        expect(concurrency.key).toContain('{{ inputs.rule_uuid }}');
        expect(concurrency.strategy).toBe('drop');
        expect(concurrency.max).toBe(1);
      });

      // The sweep finishes in seconds now that it does not join on gates, so two
      // sweeps in one space would only race each other for the same rules.
      it('runs one sweep per space at a time', () => {
        const { concurrency } = (tuning as unknown as { settings: Record<string, unknown> })
          .settings as { concurrency: { strategy: string; max: number } };

        expect(concurrency.strategy).toBe('drop');
        expect(concurrency.max).toBe(1);
      });

      // Reviews outlive their sweep, so without a ceiling every sweep would add up to
      // max_rules_per_sweep more while earlier gates are still pending.
      it('caps active reviews per space', () => {
        const consts = (tuning as unknown as { consts: Record<string, number> }).consts;
        const free = tuningSteps.find(({ name }) => name === 'resolve_free_slots')!;
        const rows = tuningSteps.find(({ name }) => name === 'resolve_fanout_rows')!;
        const trigger = (
          tuning.triggers as unknown as Array<{
            type: string;
            inputs: { properties: Record<string, Record<string, unknown>> };
          }>
        ).find(({ type }) => type === 'manual')!;

        // The active-review lookup returns at most 100, so a higher ceiling could
        // not be enforced.
        expect(consts.max_open_reviews).toBeLessThanOrEqual(100);
        expect(trigger.inputs.properties.max_open_reviews).toEqual(
          expect.objectContaining({ minimum: 1, maximum: 100 })
        );
        expect(String(free.with?.free)).toContain(
          'inputs.max_open_reviews | default: consts.max_open_reviews | minus: steps.collect_active_rules.output.expected | at_least: 0'
        );
        expect(String(rows.with?.rows)).toContain(
          '| slice: 0, steps.resolve_free_slots.output.free'
        );
      });

      // Decisions land in each review, not in the sweep: the sweep can only report
      // what it started and what was already in flight.
      it('reports launches and in-flight reviews instead of decisions', () => {
        const emit = tuningSteps.find(({ name }) => name === 'emit_result')!;
        const outputs = emit.with as Record<string, string>;

        expect(tuningSteps.map(({ name }) => name)).not.toContain('summarize_decisions');
        expect(Object.keys(outputs).sort()).toEqual([
          'harvest_failed',
          'lookup_failed',
          'reviews_in_flight',
          'reviews_requested',
        ]);
        expect(outputs.reviews_requested).toContain('steps.resolve_fanout_rows.output.rows');
        expect(outputs.reviews_in_flight).toContain('steps.collect_active_rules.output.expected');
        expect(outputs.harvest_failed).toContain('steps.harvest_fp_alerts_by_rule.error != null');
        expect(outputs.lookup_failed).toContain('steps.list_active_reviews.error != null');
      });
    });
  });
});
