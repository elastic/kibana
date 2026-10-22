/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { createAnalytics } from '@elastic/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowStep } from '@kbn/workflows';
import { createWorkflowLiquidEngine, getNestedStepGroups } from '@kbn/workflows';
import {
  ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  getManagedWorkflowDefinition,
  getManagedWorkflowDefinitions,
} from '@kbn/workflows/managed';
import type { ManagedWorkflowTemplateValuesById } from '@kbn/workflows/managed';
import { ALERTZERO_MANAGED_WORKFLOW_OWNER_ID } from '../../../common/constants';
import type { REPORT_WORKER_OUTCOME_EVENTS } from '../../../common/step_types';
import {
  ReportWorkerOutcomeStepId,
  reportWorkerOutcomeStepInputSchema,
} from '../../../common/step_types';
import type { AlertZeroEnvelope } from '../../telemetry';
import {
  createAlertZeroTelemetryReporter,
  registerAlertZeroTelemetryEvents,
  resolveWorkerCatalogFields,
} from '../../telemetry';
import { isEventFromItsWorker } from './event_worker_ids';
import { reportOutcome } from './report_outcome';

/**
 * Shared by the tests of the contract between the shipped Worker YAML and the report step's input
 * schema: `shipped_yaml_contract.test.ts`, and each Worker's
 * `shipped_yaml_contract.<worker>.test.ts`. `@kbn/workflows` cannot import this plugin, so this is
 * where each shipped `with` block is rendered the way the engine renders it and validated against
 * the real schema.
 */

export interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  cases?: Array<{ steps: YamlStep[] }>;
  default?: YamlStep[];
  'on-failure'?: { fallback?: YamlStep[] };
}

/**
 * The step lists nested directly in `step`, as the engine nests them. `YamlStep` is a loose view
 * of shipped YAML, so it is handed to the engine's walker as the engine's step type.
 */
const nestedStepLists = (step: YamlStep): YamlStep[][] =>
  getNestedStepGroups(step as WorkflowStep).map(({ steps }) => steps as YamlStep[]);

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...nestedStepLists(step).flatMap(flatten)]);

/** Representative values for the Worker definitions rendered from a YAML template. */
const TEMPLATE_VALUES: Partial<ManagedWorkflowTemplateValuesById> = {
  [ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    extras: {
      autoCloseConfidenceScoreMinThreshold: 0.85,
      budgetPerHour: 1300,
      lookbackHours: 24,
      minSeverity: 'low',
      excludeBuildingBlocks: false,
      excludedRuleTags: [],
    },
    scheduleInterval: '15m',
    settingsVersion: 1,
  },
  [ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    scheduleInterval: '4h',
    settingsVersion: 1,
  },
  [ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    settingsVersion: 1,
  },
  [ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    scheduleInterval: '24h',
    settingsVersion: 1,
  },
  [ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    extras: { analysisWindowDays: 7, fpCountThreshold: 10, fpRateThresholdPct: 50 },
    scheduleInterval: '2h',
    settingsVersion: 1,
  },
  [ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    extras: { lookbackDays: 14, maxGapsPerRun: 5 },
    scheduleInterval: '1h',
    settingsVersion: 1,
  },
};

/** A managed workflow's YAML, rendered with representative values when it is a template. */
export const getManagedYaml = (workflowId: string): string => {
  const definition = getManagedWorkflowDefinition(workflowId);
  if (definition && 'yaml' in definition && definition.yaml) {
    return definition.yaml;
  }
  const values = (TEMPLATE_VALUES as Record<string, unknown>)[workflowId];
  if (!definition || !definition.yamlTemplate || !values) {
    throw new Error(`Managed workflow "${workflowId}" has no YAML to render`);
  }
  return definition.yamlTemplate(values as never);
};

/** Every report step of a workflow's YAML, at any depth. */
export const reportStepsIn = (yaml: string): YamlStep[] =>
  flatten((parse(yaml) as { steps: YamlStep[] }).steps).filter(
    ({ type }) => type === ReportWorkerOutcomeStepId
  );

/** Every report step of a managed workflow, at any depth. */
export const reportStepsOf = (workflowId: string): YamlStep[] =>
  reportStepsIn(getManagedYaml(workflowId));

/** Every AlertZero managed workflow whose YAML has a report step, at any depth. */
export const getWorkflowsWithReportSteps = (): string[] =>
  getManagedWorkflowDefinitions()
    .filter(({ pluginId }) => pluginId === ALERTZERO_MANAGED_WORKFLOW_OWNER_ID)
    .map(({ id }) => id)
    .filter((workflowId) => reportStepsOf(workflowId).length > 0);

// Configured like the engine's templating engine.
const liquid = createWorkflowLiquidEngine({ strictFilters: true, strictVariables: false });

// A whole-value `${{ }}` keeps its type; anything else renders as a string template.
const renderValue = (value: unknown, context: Record<string, unknown>): unknown => {
  if (typeof value === 'string' && value.startsWith('${{') && value.endsWith('}}')) {
    return liquid.evalValueSync(value.slice(3, -2).trim(), context);
  }
  return typeof value === 'string' ? liquid.parseAndRenderSync(value, context) : value;
};

const renderWith = (
  step: YamlStep | undefined,
  context: Record<string, unknown>
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(step?.with ?? {}).map(([key, value]) => [key, renderValue(value, context)])
  );

export const reportNamed = (steps: YamlStep[], name: string): YamlStep | undefined =>
  steps.find((step) => step.name === name);

/**
 * An Investigation id as the Attack Discovery Worker derives it. The Worker report tests in
 * `@kbn/workflows/managed` use the same value.
 */
export const INVESTIGATION_ID = '50e2f8ae-f562-86bd-853f-8e0e1f72b9dd';

/** The output of a close that changed `status`, which every close report's guard requires. */
export const CHANGED_STATUS = {
  changed_fields: ['status'],
  metadata: { close_reason: 'resolved' },
};

/** The output of the step that opened the run's Investigation. */
export const OPENED_INVESTIGATION = { output: { conversation_id: INVESTIGATION_ID } };

/** The envelope fields `reportOnDevModeClient` reports on top of the Worker's catalog fields. */
export const ENVELOPE_FIELDS = {
  autonomy_level: 'manual',
  autonomy_mode: 'gated',
  execution_id: 'c5d0e2a9-3b7e-4c61-8f2d-6a9b0e4d7f21',
  is_default_space: true,
  run_id: '0b6a1f4e-8c43-4a39-9a4e-1f7f5f3f9c10',
  trigger_type: 'scheduled',
} as const;

export const parseRendered = (step: YamlStep | undefined, context: Record<string, unknown>) =>
  reportWorkerOutcomeStepInputSchema.safeParse(renderWith(step, context));

/**
 * Reports a rendered `with` block the way the step does, on top of an envelope for `workerId`,
 * through an analytics client in dev mode, which rejects any payload its registered schema does
 * not allow. Returns the reported event, or `undefined` when the input or the payload was rejected.
 */
export const reportOnDevModeClient = (
  step: YamlStep | undefined,
  context: Record<string, unknown>,
  workerId: string
): { eventType: string; payload: Record<string, unknown> } | undefined => {
  const parsed = parseRendered(step, context);
  if (!parsed.success) {
    return undefined;
  }
  const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
  registerAlertZeroTelemetryEvents(analytics);
  const reportEvent = jest.spyOn(analytics, 'reportEvent');
  const envelope: AlertZeroEnvelope = {
    ...resolveWorkerCatalogFields(workerId),
    ...ENVELOPE_FIELDS,
  };
  const reported = reportOutcome({
    envelope,
    input: parsed.data,
    report: createAlertZeroTelemetryReporter({ analytics, logger: loggerMock.create() }),
  });
  const [call] = reportEvent.mock.calls;
  return reported && call
    ? { eventType: call[0], payload: call[1] as Record<string, unknown> }
    : undefined;
};

/**
 * One Worker workflow with report steps: the Worker that owns it, and runs that exercise its
 * reports. A Worker declares its workflows as `SHIPPED_YAML_CONTRACTS` in its own
 * `shipped_yaml_contract.<worker>.fixture.ts` module.
 */
export interface WorkerWorkflowContract {
  contexts: ReadonlyArray<Record<string, unknown>>;
  workerId: string;
  workflowId: string;
}

const guardPasses = (step: YamlStep, context: Record<string, unknown>): boolean =>
  !step.if || liquid.evalValueSync(step.if.trim().slice(3, -2).trim(), context) === true;

/**
 * Asserts every report step of each workflow sends an event its own Worker may send, and renders
 * an input the step accepts and a payload the registered schema accepts in every run where it
 * reports.
 */
export const describeWorkerWorkflowContracts = (
  contracts: readonly WorkerWorkflowContract[]
): void => {
  describe.each(contracts)('$workflowId', ({ contexts, workerId, workflowId }) => {
    const reports = reportStepsOf(workflowId);

    it('has report steps', () => {
      expect(reports.length).toBeGreaterThan(0);
    });

    it.each(reports.map((step) => [step.name, step] as const))(
      '%s reports an event its own Worker may send',
      (_name, step) => {
        expect(
          isEventFromItsWorker(
            step.with?.event as (typeof REPORT_WORKER_OUTCOME_EVENTS)[number],
            workerId
          )
        ).toBe(true);
      }
    );

    it.each(reports.map((step) => [step.name, step] as const))(
      '%s renders a valid input in every run where it reports, and reports in at least one',
      (_name, step) => {
        const results = contexts
          .filter((context) => guardPasses(step, context))
          .map((context) => {
            const result = parseRendered(step, context);
            return result.success ? result.data.event : result.error.issues;
          });

        expect({ events: results, reported: results.length > 0 }).toEqual({
          events: results.map(() => step.with?.event),
          reported: true,
        });
      }
    );

    it.each(reports.map((step) => [step.name, step] as const))(
      '%s reports a payload the registered schema accepts in every run where it reports',
      (_name, step) => {
        const reported = contexts
          .filter((context) => guardPasses(step, context))
          .map((context) => reportOnDevModeClient(step, context, workerId)?.eventType);

        expect(reported).toEqual(reported.map(() => `alertzero_${step.with?.event}`));
      }
    );
  });
};

/** A Worker's contract module: `shipped_yaml_contract.<worker>.fixture.ts`, next to its test. */
const CONTRACT_MODULE_FILE = /^shipped_yaml_contract\.[a-z_]+\.fixture\.ts$/;

const isWorkerWorkflowContract = (value: unknown): value is WorkerWorkflowContract =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as Partial<WorkerWorkflowContract>).contexts) &&
  typeof (value as Partial<WorkerWorkflowContract>).workerId === 'string' &&
  typeof (value as Partial<WorkerWorkflowContract>).workflowId === 'string';

/**
 * Loads every Worker's contracts from the `shipped_yaml_contract.<worker>.fixture.ts` modules in
 * `directory`. Each Worker adds its own module, so no shared list has to change when a Worker
 * starts reporting.
 */
export const loadWorkerWorkflowContracts = async (
  directory: string
): Promise<Array<{ contracts: WorkerWorkflowContract[]; file: string }>> =>
  Promise.all(
    readdirSync(directory)
      .filter((file) => CONTRACT_MODULE_FILE.test(file))
      .sort()
      .map(async (file) => {
        const { SHIPPED_YAML_CONTRACTS: contracts } = (await import(join(directory, file))) as {
          SHIPPED_YAML_CONTRACTS?: unknown;
        };
        if (!Array.isArray(contracts) || !contracts.every(isWorkerWorkflowContract)) {
          throw new Error(`${file} must export SHIPPED_YAML_CONTRACTS`);
        }
        return { contracts, file };
      })
  );
