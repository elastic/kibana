/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  INVESTIGATION_CLOSE_REASONS,
  WORKER_DEGRADED_REASONS,
  WORKER_RUN_OUTCOMES,
} from '../telemetry/constants';
import {
  ANY_CATALOG_WORKER,
  countInput,
  defineReportableEvents,
  flagInput,
  oneOfInput,
  oneOfOrDefaultInput,
  toAbsent,
} from '../telemetry/report_step_input_fields';
import { ALERT_TRIAGE_REPORTABLE_EVENTS } from '../telemetry/workers/alert_triage';
import { ATTACK_DISCOVERY_REPORTABLE_EVENTS } from '../telemetry/workers/attack_discovery';
import { ENDPOINT_ANALYSIS_REPORTABLE_EVENTS } from '../telemetry/workers/endpoint_analysis';
import { RULE_COVERAGE_REPORTABLE_EVENTS } from '../telemetry/workers/rule_coverage';
import { RULE_TUNING_REPORTABLE_EVENTS } from '../telemetry/workers/rule_tuning';
import { CONTINUOUS_THREAT_HUNT_REPORTABLE_EVENTS } from '../telemetry/workers/continuous_threat_hunt';

export { MAX_REPORTED_COUNT } from '../telemetry/report_step_input_fields';

export const ReportWorkerOutcomeStepId = 'alertzero.reportWorkerOutcome' as const;

const workerInvestigationClosedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('worker_investigation_closed'),
    close_reason: z
      .enum(INVESTIGATION_CLOSE_REASONS)
      .describe('Investigation template close reason the Worker wrote'),
    investigation_id: z.preprocess(toAbsent, z.uuid()).describe('Investigation the Worker closed'),
  })
);

const workerRunCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('worker_run_completed'),
    candidates_found: countInput('Work items the run found to work on'),
    degraded_reason: oneOfOrDefaultInput(
      WORKER_DEGRADED_REASONS,
      'none',
      'Main reason the run did less than the work it found; none when it did all of it'
    ),
    items_dispatched: countInput('Work items the run started or handed on'),
    items_failed: countInput('Work items that failed or could not be started'),
    items_in_flight: countInput('Work items still in progress that the run did not wait for'),
    lookup_failed: flagInput('Whether a secondary lookup failed and the run carried on without it'),
    run_outcome: oneOfInput(WORKER_RUN_OUTCOMES, 'How the run ended'),
    source_read_failed: flagInput('Whether reading the source of work items failed'),
  })
);

export const ANY_WORKER_REPORTABLE_EVENTS = defineReportableEvents(ANY_CATALOG_WORKER, {
  worker_investigation_closed: workerInvestigationClosedInputSchema,
  worker_run_completed: workerRunCompletedInputSchema,
});

/** Every event the report step accepts, keyed by `event`; each reports `alertzero_<event>`. */
export const REPORTABLE_WORKER_EVENTS = {
  ...ATTACK_DISCOVERY_REPORTABLE_EVENTS,
  ...ANY_WORKER_REPORTABLE_EVENTS,
  ...ALERT_TRIAGE_REPORTABLE_EVENTS,
  ...RULE_TUNING_REPORTABLE_EVENTS,
  ...RULE_COVERAGE_REPORTABLE_EVENTS,
  ...CONTINUOUS_THREAT_HUNT_REPORTABLE_EVENTS,
  ...ENDPOINT_ANALYSIS_REPORTABLE_EVENTS,
};

export type ReportWorkerOutcomeEvent = keyof typeof REPORTABLE_WORKER_EVENTS;

// `Object.keys` types its result as `string[]`; the keys of a literal object are exactly its events.
export const REPORT_WORKER_OUTCOME_EVENTS = Object.keys(
  REPORTABLE_WORKER_EVENTS
) as readonly ReportWorkerOutcomeEvent[];

type WorkerOutcomeInputSchema =
  (typeof REPORTABLE_WORKER_EVENTS)[ReportWorkerOutcomeEvent]['inputSchema'];

/**
 * A closed union of the Worker outcomes: enums, bounded counts and flags only, so a Worker YAML
 * cannot ship free text or ids other than its own Investigation id.
 */
export const reportWorkerOutcomeStepInputSchema = lazySchema(() =>
  z.discriminatedUnion(
    'event',
    // `Array#map` drops the non-empty tuple type `discriminatedUnion` asks for.
    Object.values(REPORTABLE_WORKER_EVENTS).map(({ inputSchema }) => inputSchema) as [
      WorkerOutcomeInputSchema,
      ...WorkerOutcomeInputSchema[]
    ]
  )
);

export type ReportWorkerOutcomeStepInput = z.output<typeof reportWorkerOutcomeStepInputSchema>;

export const reportWorkerOutcomeStepOutputSchema = lazySchema(() =>
  z.object({
    reported: z.boolean().describe('Whether the outcome event was reported'),
  })
);

export const reportWorkerOutcomeStepCommonDefinition: CommonStepDefinition<
  typeof reportWorkerOutcomeStepInputSchema,
  typeof reportWorkerOutcomeStepOutputSchema
> = {
  id: ReportWorkerOutcomeStepId,
  label: i18n.translate('xpack.alertzero.workflows.steps.reportWorkerOutcome.label', {
    defaultMessage: 'Report AlertZero Worker outcome',
  }),
  description: i18n.translate('xpack.alertzero.workflows.steps.reportWorkerOutcome.description', {
    defaultMessage:
      'Reports an allowlisted AlertZero Worker outcome as product telemetry. Only a managed AlertZero Worker run reports; any other caller is skipped.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: reportWorkerOutcomeStepInputSchema,
  outputSchema: reportWorkerOutcomeStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.alertzero.workflows.steps.reportWorkerOutcome.documentation.details',
      {
        defaultMessage:
          'The step never fails the workflow. It returns reported: false when the run is a test run, is not part of a managed AlertZero Worker run, the input does not match the event schema, or telemetry could not be reported. Run with on-failure continue and no timeout: the step stops itself after 20 seconds.',
      }
    ),
    examples: [
      `## Report an Attack Discovery Worker run
\`\`\`yaml
# Telemetry: once every batch has dispatched, before \`emit_result\` ends the run.
- name: report_run_completed
  type: ${ReportWorkerOutcomeStepId}
  on-failure:
    continue: true
  with:
    event: ad_worker_run_completed
    alerts_analyzed: "\${{ steps.run_generation.output.alerts_analyzed | default: 0 }}"
    batches_total: "\${{ steps.run_generation.output.batches_total | default: 0 }}"
    batches_failed: "\${{ steps.run_generation.output.batches_failed | default: 0 }}"
    attacks_generated: "\${{ steps.run_generation.output.discoveries_generated | default: 0 }}"
    attacks_persisted: "\${{ steps.resolve_fanout.output.attack_count | default: 0 }}"
    run_outcome: |-
      {%- assign batches_total = steps.run_generation.output.batches_total | default: 0 -%}
      {%- assign batches_failed = steps.run_generation.output.batches_failed | default: 0 -%}
      {%- assign generated = steps.run_generation.output.discoveries_generated | default: 0 -%}
      {%- assign persisted = steps.resolve_fanout.output.attack_count | default: 0 -%}
      {%- if batches_total == 0 -%}
      empty_no_alerts
      {%- elsif batches_failed >= batches_total -%}
      failed_all_batches
      {%- elsif batches_failed > 0 -%}
      degraded_partial
      {%- elsif persisted > 0 -%}
      produced
      {%- elsif generated > 0 -%}
      empty_all_duplicates
      {%- else -%}
      empty_no_attacks
      {%- endif -%}
\`\`\``,
      `## Report the same run with the event every Worker shares
\`\`\`yaml
# The same run in the vocabulary every Worker shares. The items are generation batches, which the
# run waits for, so none is in flight; alerts and attacks are on its own event.
- name: report_worker_run_completed
  type: ${ReportWorkerOutcomeStepId}
  on-failure:
    continue: true
  with:
    event: worker_run_completed
    candidates_found: "\${{ steps.run_generation.output.batches_total | default: 0 }}"
    items_dispatched: "\${{ steps.run_generation.output.batches_total | default: 0 }}"
    items_failed: "\${{ steps.run_generation.output.batches_failed | default: 0 }}"
    items_in_flight: 0
    degraded_reason: "{% if steps.run_generation.output.batches_failed > 0 %}dependency_unavailable{% else %}none{% endif %}"
    run_outcome: |-
      {%- assign batches_total = steps.run_generation.output.batches_total | default: 0 -%}
      {%- assign batches_failed = steps.run_generation.output.batches_failed | default: 0 -%}
      {%- assign persisted = steps.resolve_fanout.output.attack_count | default: 0 -%}
      {%- if batches_total == 0 -%}
      empty_nothing_pending
      {%- elsif batches_failed >= batches_total -%}
      failed_all_items
      {%- elsif batches_failed > 0 -%}
      degraded_partial
      {%- elsif persisted > 0 -%}
      produced
      {%- else -%}
      empty_nothing_found
      {%- endif -%}
\`\`\``,
    ],
  },
};
