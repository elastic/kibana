/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAnalytics } from '@elastic/ebt/client';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { ManagedWorkflowStateApi } from '@kbn/workflows/server/types';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { ReportWorkerOutcomeStepId } from '../../../common/step_types';
import { ALERTZERO_TELEMETRY_EVENTS, registerAlertZeroTelemetryEvents } from '../../telemetry';
import type { ReportWorkerOutcomeStepDeps } from './report_worker_outcome_step';
import {
  HOP_TIMEOUT_MS,
  STEP_DEADLINE_MS,
  getReportWorkerOutcomeStepDefinition,
} from './report_worker_outcome_step';
import type { ReportWorkerOutcomeSkipReason } from './skip_reasons';
import type { WorkerChainExecution } from './verify_worker_chain';
import {
  REVIEW_EXECUTION_ID,
  ROOT_EXECUTION_ID,
  RUNNER_EXECUTION_ID,
  SPACE_ID,
  createAttackDiscoveryChain,
} from './worker_chain.mock';

const FAKE_REQUEST = { fake: true } as never;
const REVIEW_WORKFLOW_ID = 'system-alertzero-attack-discovery-review';
const INVESTIGATION_ID = '0b9f4a3e-1c2d-8e3f-8a4b-5c6d7e8f9a0b';

const RUN_COMPLETED_INPUT = {
  alerts_analyzed: 120,
  attacks_generated: 4,
  attacks_persisted: 3,
  batches_failed: 0,
  batches_total: 6,
  event: 'ad_worker_run_completed',
  run_outcome: 'produced',
};

const INVESTIGATION_CLOSED_INPUT = {
  close_reason: 'false_positive',
  event: 'worker_investigation_closed',
  investigation_id: INVESTIGATION_ID,
};

const EXPECTED_ENVELOPE = {
  autonomy_level: 'assisted',
  autonomy_mode: 'gated',
  execution_id: REVIEW_EXECUTION_ID,
  is_default_space: true,
  run_id: ROOT_EXECUTION_ID,
  trigger_type: 'scheduled',
  watch_tag: 'watch-floor',
  worker_id: 'system-security-floor-attack-discovery',
};

const INSTALLED_STATE = {
  definitionId: REVIEW_WORKFLOW_ID,
  documentVersion: 1,
  spaceId: '*',
  templateValues: null,
  workflowId: REVIEW_WORKFLOW_ID,
};

const NOT_REPORTED = { output: { reported: false } };
const REPORTED = { output: { reported: true } };

interface ContextOptions {
  abortSignal?: AbortSignal;
  isTestRun?: boolean;
}

const createContext = (
  input: unknown,
  { abortSignal = new AbortController().signal, isTestRun = false }: ContextOptions = {}
) =>
  ({
    abortSignal,
    config: {},
    contextManager: {
      callKibanaApi: jest.fn(),
      getContext: jest.fn().mockReturnValue({
        execution: { id: REVIEW_EXECUTION_ID, isTestRun },
        workflow: { id: REVIEW_WORKFLOW_ID, spaceId: SPACE_ID },
      }),
      getFakeRequest: jest.fn().mockReturnValue(FAKE_REQUEST),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn((value) => value),
    },
    input,
    logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
    rawInput: input,
    stepId: 'report_run_completed',
    stepType: ReportWorkerOutcomeStepId,
  } as unknown as StepHandlerContext<never, never>);

const createManagedWorkflowState = (): jest.Mocked<ManagedWorkflowStateApi> => ({
  getInstalledWorkflowState: jest.fn(async (_workflowId: string, spaceId: string) =>
    spaceId === '*' ? INSTALLED_STATE : null
  ),
  listInstalledWorkflowStates: jest.fn(),
});

const createWorkflowsManagement = (
  executions: Record<string, WorkerChainExecution> = createAttackDiscoveryChain()
) => ({
  getWorkflowExecution: jest.fn(async (executionId: string) => executions[executionId] ?? null),
});

const createDeps = (overrides: Partial<ReportWorkerOutcomeStepDeps> = {}) => {
  const analytics = coreMock.createSetup().analytics;
  const logger = loggingSystemMock.createLogger();
  const managedWorkflowState = createManagedWorkflowState();
  const workflowsManagement = createWorkflowsManagement();
  const deps: ReportWorkerOutcomeStepDeps = {
    analytics,
    areServiceAccountsEnabled: () => true,
    getManagedWorkflowState: async () => managedWorkflowState,
    getWorkflowsManagement: () => workflowsManagement as never,
    isTelemetryOptedIn: async () => true,
    logger,
    ...overrides,
  };
  return { analytics, deps, logger, managedWorkflowState, workflowsManagement };
};

const run = async (deps: ReportWorkerOutcomeStepDeps, context: StepHandlerContext<never, never>) =>
  getReportWorkerOutcomeStepDefinition(deps).handler(context);

/** The Attack Discovery chain, with one execution's fields overridden. */
const chainWith = (
  executionId: string,
  overrides: Partial<WorkerChainExecution>
): Record<string, WorkerChainExecution> => {
  const chain = createAttackDiscoveryChain();
  return { ...chain, [executionId]: { ...chain[executionId], ...overrides } };
};

/** Dependency overrides that read the chain's executions from `executions`. */
const readingFrom = (
  executions: Record<string, WorkerChainExecution>
): Partial<ReportWorkerOutcomeStepDeps> => {
  const workflowsManagement = createWorkflowsManagement(executions);
  return { getWorkflowsManagement: () => workflowsManagement as never };
};

/** Dependency overrides for the Attack Discovery chain, re-rooted at another catalogued Worker. */
const rootedAt = (workerId: string): Partial<ReportWorkerOutcomeStepDeps> =>
  readingFrom(chainWith(ROOT_EXECUTION_ID, { originManagedWorkflowId: workerId }));

/** A dev-mode EBT client, whose `reportEvent` throws on a payload its registered schema rejects. */
const createSchemaCheckingAnalytics = () => {
  const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
  registerAlertZeroTelemetryEvents(analytics);
  return { analytics, reportEvent: jest.spyOn(analytics, 'reportEvent') };
};

type SkipLogLevel = 'debug' | 'warn';

/** What a run left in the plugin logger (lazy debug and eager warn messages), the reports, and the output. */
const skipFootprint = ({
  analytics,
  logger,
  result,
}: {
  analytics: ReturnType<typeof createDeps>['analytics'];
  logger: ReturnType<typeof loggingSystemMock.createLogger>;
  result: unknown;
}) => ({
  debug: logger.debug.mock.calls.map(([message]) => (message as () => string)()),
  reportEvent: analytics.reportEvent.mock.calls.length,
  result,
  warn: logger.warn.mock.calls.map(([message]) => message),
});

/**
 * The footprint of a run that skipped as `reason`, logging only that at `level`, after any
 * `debugBefore` lines saying why a read failed.
 */
const expectedSkip = (
  reason: ReportWorkerOutcomeSkipReason,
  level: SkipLogLevel,
  debugBefore: readonly string[] = []
) => ({
  debug: [...debugBefore, ...(level === 'debug' ? [expect.stringContaining(`(${reason})`)] : [])],
  reportEvent: 0,
  result: NOT_REPORTED,
  warn: level === 'warn' ? [expect.stringContaining(`(${reason})`)] : [],
});

type SkipRead = 'getInstalledWorkflowState' | 'getWorkflowExecution';

interface SkipCase {
  /** Builds the run's abort signal and dependency overrides. */
  arrange?: () => {
    abortSignal?: AbortSignal;
    overrides?: Partial<ReportWorkerOutcomeStepDeps>;
  };
  /** Debug lines a failed read logs before the skip itself. */
  debugBefore?: readonly string[];
  input?: unknown;
  isTestRun?: boolean;
  level: SkipLogLevel;
  reason: ReportWorkerOutcomeSkipReason;
  title: string;
  /** The default dependencies' reads the skip must happen before. */
  unread?: readonly SkipRead[];
}

/** Runs a skip case, and asserts its footprint and that none of its `unread` reads happened. */
const expectSkip = async ({
  arrange = () => ({}),
  debugBefore,
  input = RUN_COMPLETED_INPUT,
  isTestRun = false,
  level,
  reason,
  unread = [],
}: SkipCase) => {
  const { abortSignal, overrides } = arrange();
  const { analytics, deps, logger, managedWorkflowState, workflowsManagement } =
    createDeps(overrides);
  const readCounts: Record<SkipRead, () => number> = {
    getInstalledWorkflowState: () =>
      managedWorkflowState.getInstalledWorkflowState.mock.calls.length,
    getWorkflowExecution: () => workflowsManagement.getWorkflowExecution.mock.calls.length,
  };

  const result = await run(deps, createContext(input, { abortSignal, isTestRun }));

  expect({
    ...skipFootprint({ analytics, logger, result }),
    reads: Object.fromEntries(unread.map((read) => [read, readCounts[read]()])),
  }).toEqual({
    ...expectedSkip(reason, level, debugBefore),
    reads: Object.fromEntries(unread.map((read) => [read, 0])),
  });
};

/** A run whose opt-in read aborts it. */
const abortingDuringOptIn = () => {
  const controller = new AbortController();
  return {
    abortSignal: controller.signal,
    overrides: {
      isTelemetryOptedIn: async () => {
        controller.abort();
        return true;
      },
    },
  };
};

/** A run aborted before the step starts. */
const alreadyAborted = () => {
  const controller = new AbortController();
  controller.abort();
  return { abortSignal: controller.signal };
};

/** A run aborted once the walk reads the root, so after the walk and immediately before reporting. */
const abortingAfterWalk = () => {
  const controller = new AbortController();
  const chain = createAttackDiscoveryChain();
  const workflowsManagement = {
    getWorkflowExecution: jest.fn(async (executionId: string) => {
      if (executionId === ROOT_EXECUTION_ID) {
        controller.abort();
      }
      return chain[executionId] ?? null;
    }),
  };
  return {
    abortSignal: controller.signal,
    overrides: { getWorkflowsManagement: () => workflowsManagement as never },
  };
};

/** Dependency overrides with a managed workflows client that `configure` set up. */
const withManagedWorkflowState = (
  configure: (state: jest.Mocked<ManagedWorkflowStateApi>) => void
): Partial<ReportWorkerOutcomeStepDeps> => {
  const managedWorkflowState = createManagedWorkflowState();
  configure(managedWorkflowState);
  return { getManagedWorkflowState: async () => managedWorkflowState };
};

describe('alertzero.reportWorkerOutcome step', () => {
  it('registers under the common step id', () => {
    const { deps } = createDeps();

    expect(getReportWorkerOutcomeStepDefinition(deps).id).toBe(ReportWorkerOutcomeStepId);
  });

  describe('a managed Worker chain', () => {
    it('reports the outcome once, with the envelope built from the root, and returns only `reported: true`', async () => {
      const { analytics, deps } = createDeps();

      const result = await run(deps, createContext(RUN_COMPLETED_INPUT));

      expect({ calls: analytics.reportEvent.mock.calls, result }).toEqual({
        calls: [
          [
            ALERTZERO_TELEMETRY_EVENTS.AdWorkerRunCompleted,
            {
              ...EXPECTED_ENVELOPE,
              alerts_analyzed: 120,
              attacks_generated: 4,
              attacks_persisted: 3,
              batches_failed: 0,
              batches_total: 6,
              run_outcome: 'produced',
            },
          ],
        ],
        result: REPORTED,
      });
    });

    it('reads the reporting execution, then the ancestors its chain lists, without step executions, as the workflow', async () => {
      const { deps, workflowsManagement } = createDeps();

      await run(deps, createContext(RUN_COMPLETED_INPUT));

      expect(workflowsManagement.getWorkflowExecution.mock.calls).toEqual(
        [REVIEW_EXECUTION_ID, ROOT_EXECUTION_ID, RUNNER_EXECUTION_ID].map((id) => [
          id,
          SPACE_ID,
          { omitStepExecutions: true, request: FAKE_REQUEST },
        ])
      );
    });

    it('checks the global space when the workflow is not installed in the execution space', async () => {
      const { deps, managedWorkflowState } = createDeps();

      await run(deps, createContext(RUN_COMPLETED_INPUT));

      expect(managedWorkflowState.getInstalledWorkflowState.mock.calls).toEqual([
        [REVIEW_WORKFLOW_ID, SPACE_ID],
        [REVIEW_WORKFLOW_ID, '*'],
      ]);
    });

    it('reports a Worker installed in the execution space without the global lookup', async () => {
      const managedWorkflowState = createManagedWorkflowState();
      managedWorkflowState.getInstalledWorkflowState.mockResolvedValue(INSTALLED_STATE);
      const { deps } = createDeps({ getManagedWorkflowState: async () => managedWorkflowState });

      await run(deps, createContext(RUN_COMPLETED_INPUT));

      expect(managedWorkflowState.getInstalledWorkflowState).toHaveBeenCalledTimes(1);
    });

    it('omits an optional field Liquid rendered as the empty string', async () => {
      const { analytics, deps } = createDeps(
        rootedAt(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID)
      );

      await run(
        deps,
        createContext({
          event: 'hunt_report_completed',
          hunt_status: 'success',
          investigation_id: INVESTIGATION_ID,
          package_status: 'success',
          tier2_invoked: '',
        })
      );

      expect(analytics.reportEvent.mock.calls[0][1]).not.toHaveProperty('tier2_invoked');
    });

    it('skips, at warn level, a review start Liquid rendered without its Investigation id', async () => {
      const { analytics, deps, logger } = createDeps();

      const result = await run(
        deps,
        createContext({
          event: 'ad_worker_review_started',
          investigation_id: '',
          is_rereview: false,
        })
      );

      expect(skipFootprint({ analytics, logger, result })).toEqual(
        expectedSkip('invalid_input', 'warn')
      );
    });

    it('coerces a count Liquid rendered as the empty string to 0', async () => {
      const { analytics, deps } = createDeps();

      await run(deps, createContext({ ...RUN_COMPLETED_INPUT, batches_failed: '' }));

      expect(analytics.reportEvent.mock.calls[0][1]).toEqual(
        expect.objectContaining({ batches_failed: 0 })
      );
    });

    it('never writes to the workflow event log', async () => {
      const { deps } = createDeps();
      const context = createContext(RUN_COMPLETED_INPUT);

      await run(deps, context);

      expect(Object.values(context.logger).flatMap((fn) => (fn as jest.Mock).mock.calls)).toEqual(
        []
      );
    });
  });

  describe('an Investigation close', () => {
    it.each([
      {
        closeReason: 'false_positive',
        envelope: EXPECTED_ENVELOPE,
        title: 'reports once, with the envelope built from the root',
        workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      },
      {
        closeReason: 'resolved',
        envelope: {
          ...EXPECTED_ENVELOPE,
          watch_tag: 'watch-detection',
          worker_id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
        },
        title: 'reports the close of any catalogued Worker, with that Worker in the envelope',
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
      },
    ])('$title', async ({ closeReason, envelope, workerId }) => {
      const { analytics, deps } = createDeps(rootedAt(workerId));

      const result = await run(
        deps,
        createContext({ ...INVESTIGATION_CLOSED_INPUT, close_reason: closeReason })
      );

      expect({ calls: analytics.reportEvent.mock.calls, result }).toEqual({
        calls: [
          [
            ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed,
            { ...envelope, close_reason: closeReason, investigation_id: INVESTIGATION_ID },
          ],
        ],
        result: REPORTED,
      });
    });

    it.each<SkipCase>([
      {
        isTestRun: true,
        level: 'debug',
        reason: 'test_run',
        title: 'reports nothing for a test run',
      },
      {
        arrange: () => ({
          overrides: readingFrom(chainWith(ROOT_EXECUTION_ID, { isTestRun: true })),
        }),
        level: 'debug',
        reason: 'test_run',
        title: 'reports nothing for a chain with a persisted test-run hop',
      },
      {
        input: { ...INVESTIGATION_CLOSED_INPUT, close_reason: 'declined' },
        level: 'warn',
        reason: 'invalid_input',
        title:
          'reports nothing, at warn level, when the close reason is not in the template vocabulary',
      },
    ])('$title', (skipCase) => expectSkip({ input: INVESTIGATION_CLOSED_INPUT, ...skipCase }));
  });

  describe('a Worker run event or item event', () => {
    const AD_EVENTS: Array<[string, string, Record<string, unknown>]> = [
      [
        ALERTZERO_TELEMETRY_EVENTS.AdWorkerRunCompleted,
        SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        RUN_COMPLETED_INPUT,
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.AdWorkerReviewStarted,
        SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        {
          event: 'ad_worker_review_started',
          investigation_id: INVESTIGATION_ID,
          is_rereview: 'false',
        },
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.AdWorkerAnalysisCompleted,
        SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        { analysis_error: '', event: 'ad_worker_analysis_completed', verdict: 'false_positive' },
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.AdWorkerHandoffResolved,
        SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        {
          auto_approve_requested: 'false',
          event: 'ad_worker_handoff_resolved',
          outcome: 'approved',
          verdict: 'true_positive',
        },
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed,
        SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        INVESTIGATION_CLOSED_INPUT,
      ],
    ];

    const ITEM_EVENTS: Array<[string, string, Record<string, unknown>]> = [
      [
        ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchClassified,
        SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
        {
          alerts_total: '40',
          alerts_without_verdict: '',
          event: 'alert_triage_batch_classified',
          fp_below_floor: 3,
          fp_candidates: 20,
          investigation_id: INVESTIGATION_ID,
          verdicts_false_positive: 23,
          verdicts_inconclusive: 5,
          verdicts_true_positive: 10,
        },
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchGrouped,
        SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
        {
          alerts_with_strict_key: '36',
          conversation_created: 'false',
          event: 'alert_triage_batch_grouped',
          fp_candidates_on_fallback: '',
          grouping: 'on',
          strict_keys: 12,
          wide_keys: 8,
        },
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.AlertTriageClosureResolved,
        SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
        {
          alerts_proposed: 20,
          auto_approve_requested: 'false',
          event: 'alert_triage_closure_resolved',
          investigation_id: INVESTIGATION_ID,
          outcome: 'approved',
        },
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted,
        SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
        {
          applied: true,
          backtest_ran: true,
          backtest_reduced_alerts: true,
          change_type: 'query',
          confidence: 'high',
          decision: 'approved',
          entry_gate: 'skipped',
          event: 'rule_tuning_review_completed',
          investigation_id: INVESTIGATION_ID,
          rule_unavailable: false,
        },
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted,
        SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
        {
          check_failed: 'true',
          decision: 'dismissed',
          entry_gate: 'skipped',
          event: 'rule_coverage_review_completed',
          investigation_id: '',
          proposal_kind: 'install_prebuilt_rule',
          verdict: 'prebuilt_available',
        },
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted,
        SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
        {
          event: 'hunt_report_completed',
          has_confirmed_hit: true,
          hunt_status: 'partial',
          package_status: 'run_incomplete',
          proposals_prepared: 2,
          tier2_invoked: '',
        },
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.EndpointAnalysisCompleted,
        SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
        {
          actions_recommended: 1,
          analysis_outcome: 'proposals_lost',
          auto_approve_requested: 'false',
          event: 'endpoint_analysis_completed',
          findings_attached: true,
          host_resolved: true,
          proposals_dispatch_failed: 1,
        },
      ],
    ];

    it.each([...AD_EVENTS, ...ITEM_EVENTS])(
      'reports a %s payload from its own Worker that the registered schema accepts',
      async (eventType, workerId, input) => {
        const { analytics, reportEvent } = createSchemaCheckingAnalytics();
        const { deps } = createDeps({ analytics, ...rootedAt(workerId) });

        const result = await run(deps, createContext(input));

        expect({
          eventType: reportEvent.mock.calls[0]?.[0],
          result,
          workerId: (reportEvent.mock.calls[0]?.[1] as { worker_id?: string } | undefined)
            ?.worker_id,
        }).toEqual({ eventType, result: REPORTED, workerId });
      }
    );

    it.each<SkipCase>([
      ...ITEM_EVENTS.map(
        ([eventType, , input]): SkipCase => ({
          input,
          level: 'warn',
          reason: 'wrong_worker',
          title: `reports nothing, at warn level, for a ${eventType} payload from the Attack Discovery Worker`,
        })
      ),
      {
        arrange: () => ({
          overrides: rootedAt(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID),
        }),
        level: 'warn',
        reason: 'wrong_worker',
        title: 'reports nothing for an Attack Discovery event from another Worker',
      },
    ])('$title', (skipCase) => expectSkip(skipCase));

    it.each([
      [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID],
      [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID],
    ])(
      'reports the generic run event from %s with that Worker in the envelope',
      async (workerId) => {
        const { analytics, reportEvent } = createSchemaCheckingAnalytics();
        const { deps } = createDeps({ analytics, ...rootedAt(workerId) });

        await run(
          deps,
          createContext({
            candidates_found: '2',
            degraded_reason: '',
            event: 'worker_run_completed',
            items_dispatched: 2,
            run_outcome: 'produced',
          })
        );

        expect(reportEvent.mock.calls).toEqual([
          [
            ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted,
            expect.objectContaining({
              candidates_found: 2,
              degraded: false,
              degraded_reason: 'none',
              items_dispatched: 2,
              run_outcome: 'produced',
              worker_id: workerId,
            }),
          ],
        ]);
      }
    );
  });

  describe('skips', () => {
    it.each<SkipCase>([
      {
        isTestRun: true,
        level: 'debug',
        reason: 'test_run',
        title: 'a test run, before any lookup',
        unread: ['getInstalledWorkflowState'],
      },
      {
        arrange: () => ({ overrides: { isTelemetryOptedIn: async () => false } }),
        level: 'debug',
        reason: 'opted_out',
        title: 'an opted-out cluster, before any Elasticsearch read',
        unread: ['getInstalledWorkflowState', 'getWorkflowExecution'],
      },
      {
        arrange: abortingDuringOptIn,
        level: 'debug',
        reason: 'aborted',
        title: 'a run aborted during the opt-in read, before any Elasticsearch read',
        unread: ['getInstalledWorkflowState'],
      },
      {
        arrange: () => ({
          overrides: {
            isTelemetryOptedIn: async () => {
              throw new Error('telemetry unavailable');
            },
          },
        }),
        level: 'warn',
        reason: 'report_error',
        title: 'cleanly when the opt-in read throws',
      },
      {
        arrange: () => ({
          overrides: readingFrom(chainWith(RUNNER_EXECUTION_ID, { isTestRun: true })),
        }),
        level: 'debug',
        reason: 'test_run',
        title: 'a chain with a persisted test-run hop',
      },
      {
        arrange: () => ({
          overrides: withManagedWorkflowState(({ getInstalledWorkflowState }) =>
            getInstalledWorkflowState.mockResolvedValue(null)
          ),
        }),
        level: 'debug',
        reason: 'not_managed',
        title: 'a workflow AlertZero does not manage',
        unread: ['getWorkflowExecution'],
      },
      {
        arrange: () => ({
          overrides: readingFrom(
            chainWith(RUNNER_EXECUTION_ID, { managed: false, managedBy: null })
          ),
        }),
        level: 'debug',
        reason: 'not_managed',
        title: 'a chain with an unmanaged hop',
      },
      {
        arrange: () => ({
          overrides: readingFrom(chainWith(RUNNER_EXECUTION_ID, { spaceId: 'space-b' })),
        }),
        level: 'debug',
        reason: 'lineage_unavailable',
        title: 'a chain with a parent in another space',
      },
      {
        arrange: () => ({
          overrides: readingFrom(
            chainWith(ROOT_EXECUTION_ID, { originManagedWorkflowId: 'custom' })
          ),
        }),
        level: 'debug',
        reason: 'not_catalog_root',
        title: 'a chain whose root is not a catalog Worker',
      },
      {
        arrange: () => {
          const { [RUNNER_EXECUTION_ID]: _missing, ...chain } = createAttackDiscoveryChain();
          return { overrides: readingFrom(chain) };
        },
        level: 'debug',
        reason: 'lineage_unavailable',
        title: 'a chain with a missing ancestor, as lineage_unavailable at debug level',
      },
      {
        arrange: () => ({ overrides: { getManagedWorkflowState: async () => undefined } }),
        level: 'debug',
        reason: 'lineage_unavailable',
        title: 'when the managed workflows client is unavailable',
      },
      {
        arrange: () => ({
          overrides: withManagedWorkflowState(({ getInstalledWorkflowState }) =>
            getInstalledWorkflowState.mockRejectedValue(
              new Error('Workflows is not available in this environment')
            )
          ),
        }),
        debugBefore: [
          'Could not check that system-alertzero-attack-discovery-review is managed: Error: Workflows is not available in this environment',
        ],
        level: 'debug',
        reason: 'lineage_unavailable',
        title: 'when the managed state lookup throws',
      },
      {
        arrange: () => ({
          overrides: {
            areServiceAccountsEnabled: () => false,
            getManagedWorkflowState: async () => undefined,
          },
        }),
        level: 'debug',
        reason: 'service_accounts_disabled',
        title: 'with service accounts off, at debug level, as service_accounts_disabled',
      },
      {
        arrange: () => ({ overrides: { getWorkflowsManagement: () => undefined } }),
        level: 'debug',
        reason: 'lineage_unavailable',
        title: 'when the Workflows management API is unavailable',
      },
      {
        input: { ...RUN_COMPLETED_INPUT, run_outcome: 'skipped_space_disabled' },
        level: 'warn',
        reason: 'invalid_input',
        title: 'an invalid input from a verified Worker chain, at warn level',
      },
      {
        input: { event: 'worker_run_completed', run_outcome: 'degraded_partial' },
        level: 'warn',
        reason: 'invalid_input',
        title:
          'a degraded_partial run event without a degraded reason from a verified Worker chain, at warn level',
      },
      {
        arrange: () => ({
          overrides: withManagedWorkflowState(({ getInstalledWorkflowState }) =>
            getInstalledWorkflowState.mockResolvedValue(null)
          ),
        }),
        input: { ...RUN_COMPLETED_INPUT, run_outcome: 'skipped_space_disabled' },
        level: 'debug',
        reason: 'not_managed',
        title: 'an invalid input from a workflow AlertZero does not manage, at debug level',
        unread: ['getWorkflowExecution'],
      },
      {
        arrange: () => ({
          overrides: readingFrom(
            chainWith(RUNNER_EXECUTION_ID, { managed: false, managedBy: null })
          ),
        }),
        input: { event: 'worker_run_completed', run_outcome: 'degraded_partial' },
        level: 'debug',
        reason: 'not_managed',
        title: 'a contradictory input from a chain with an unmanaged hop, at debug level',
      },
      {
        input: { ...RUN_COMPLETED_INPUT, run_outcome: 'skipped_space_disabled' },
        isTestRun: true,
        level: 'debug',
        reason: 'test_run',
        title: 'an invalid input from a test run, at debug level, before any lookup',
        unread: ['getInstalledWorkflowState'],
      },
      {
        arrange: alreadyAborted,
        level: 'debug',
        reason: 'aborted',
        title: 'an already aborted run, before any lookup',
        unread: ['getInstalledWorkflowState'],
      },
      {
        arrange: abortingAfterWalk,
        level: 'debug',
        reason: 'aborted',
        title: 'a run aborted after the walk, immediately before reporting',
      },
      {
        arrange: () => ({
          overrides: {
            getWorkflowsManagement: () => {
              throw new Error('unexpected');
            },
          },
        }),
        level: 'warn',
        reason: 'report_error',
        title: 'as report_error, never throwing, even when a dependency getter throws',
      },
    ])('$title', (skipCase) => expectSkip(skipCase));

    it('a test run without reading the opt-in', async () => {
      const isTelemetryOptedIn = jest.fn(async () => true);
      const { deps } = createDeps({ isTelemetryOptedIn });

      await run(deps, createContext(RUN_COMPLETED_INPUT, { isTestRun: true }));

      expect(isTelemetryOptedIn).not.toHaveBeenCalled();
    });

    it('a failure at warn level by its error type, not its message, which may echo rendered input', async () => {
      const { deps, logger } = createDeps({
        isTelemetryOptedIn: async () => {
          throw new Error('index [secret-index] not found');
        },
      });

      await run(deps, createContext(RUN_COMPLETED_INPUT));

      expect(logger.warn.mock.calls).toEqual([
        ['Skipped alertzero.reportWorkerOutcome (report_error): Error'],
      ]);
    });

    it('an invalid input without echoing the rendered values', async () => {
      const { deps, logger } = createDeps();

      await run(
        deps,
        createContext({ ...RUN_COMPLETED_INPUT, run_outcome: 'Lateral movement on fin-dc-01' })
      );

      expect(String(logger.warn.mock.calls[0][0])).not.toContain('fin-dc-01');
    });
  });

  describe('the deadline', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const after = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });

    /** An opt-in read that answers `true` only after `ms`. */
    const optInAfter = (ms: number) => async () => {
      await after(ms);
      return true;
    };

    it('stays well under the 30s timeout every report step sets', () => {
      expect(STEP_DEADLINE_MS).toBeLessThanOrEqual(20_000);
    });

    it('returns `reported: false` as deadline_exceeded when the checks outlast it', async () => {
      const { analytics, deps, logger } = createDeps({
        isTelemetryOptedIn: optInAfter(STEP_DEADLINE_MS + 5000),
      });

      const pending = run(deps, createContext(RUN_COMPLETED_INPUT));
      await jest.advanceTimersByTimeAsync(STEP_DEADLINE_MS);
      const result = await pending;

      expect(skipFootprint({ analytics, logger, result })).toEqual(
        expectedSkip('deadline_exceeded', 'debug')
      );
    });

    it('stops the checks still in flight, so they read nothing more and never report', async () => {
      const { analytics, deps, managedWorkflowState, workflowsManagement } = createDeps({
        isTelemetryOptedIn: optInAfter(STEP_DEADLINE_MS + 5000),
      });

      const pending = run(deps, createContext(RUN_COMPLETED_INPUT));
      await jest.advanceTimersByTimeAsync(STEP_DEADLINE_MS + 10_000);
      await pending;

      expect({
        getInstalledWorkflowState: managedWorkflowState.getInstalledWorkflowState.mock.calls.length,
        getWorkflowExecution: workflowsManagement.getWorkflowExecution.mock.calls.length,
        reportEvent: analytics.reportEvent.mock.calls.length,
      }).toEqual({ getInstalledWorkflowState: 0, getWorkflowExecution: 0, reportEvent: 0 });
    });

    it('reports a chain whose reads each take almost their whole timeout, because the ancestors are read together', async () => {
      const slowRead = <T>(value: T) => after(HOP_TIMEOUT_MS - 100).then(() => value);
      const managedWorkflowState = createManagedWorkflowState();
      managedWorkflowState.getInstalledWorkflowState.mockImplementation(
        (_workflowId: string, spaceId: string) => slowRead(spaceId === '*' ? INSTALLED_STATE : null)
      );
      const chain = createAttackDiscoveryChain();
      const workflowsManagement = {
        getWorkflowExecution: jest.fn((executionId: string) =>
          slowRead(chain[executionId] ?? null)
        ),
      };
      const { analytics, deps, logger } = createDeps({
        getManagedWorkflowState: async () => managedWorkflowState,
        getWorkflowsManagement: () => workflowsManagement as never,
      });

      const pending = run(deps, createContext(RUN_COMPLETED_INPUT));
      await jest.advanceTimersByTimeAsync(STEP_DEADLINE_MS);
      const result = await pending;

      expect({
        debug: logger.debug.mock.calls.length,
        reportEvent: analytics.reportEvent.mock.calls.length,
        result,
      }).toEqual({ debug: 0, reportEvent: 1, result: REPORTED });
    });

    it('reports a run whose checks finish just inside it', async () => {
      const { analytics, deps } = createDeps({
        isTelemetryOptedIn: optInAfter(STEP_DEADLINE_MS - 1000),
      });

      const pending = run(deps, createContext(RUN_COMPLETED_INPUT));
      await jest.advanceTimersByTimeAsync(STEP_DEADLINE_MS - 1000);
      const result = await pending;

      expect({ reportEvent: analytics.reportEvent.mock.calls.length, result }).toEqual({
        reportEvent: 1,
        result: REPORTED,
      });
    });
  });

  describe('a failing analytics client', () => {
    const createThrowingDeps = () => {
      const created = createDeps();
      created.analytics.reportEvent.mockImplementation(() => {
        throw new Error('Attempted to report event type before registering it');
      });
      return created;
    };

    it('still returns cleanly with `reported: false`', async () => {
      const { deps } = createThrowingDeps();

      const result = await run(deps, createContext(RUN_COMPLETED_INPUT));

      expect(result).toEqual(NOT_REPORTED);
    });

    it('logs report_error at warn level', async () => {
      const { deps, logger } = createThrowingDeps();

      await run(deps, createContext(RUN_COMPLETED_INPUT));

      expect(logger.warn.mock.calls.map(([message]) => message)).toEqual([
        expect.stringContaining('(report_error)'),
      ]);
    });
  });
});
