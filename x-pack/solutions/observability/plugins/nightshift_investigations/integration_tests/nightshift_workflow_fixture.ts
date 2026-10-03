/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Harness that runs the two managed Nightshift workflows through the REAL execution engine.
 *
 * Three layers are real, which is the point: the managed YAML as shipped (read from
 * `@kbn/workflows/managed`, not a hand-written copy), the engine that compiles and drives
 * it, and every `nightshift.*` step handler with its real input/output Zod schemas. Only
 * the outermost boundary is faked — the ES/sandbox work behind `hydrateCortexWorkspace` /
 * `hydrateMemoryWorkspace` / `hydrateDecisionTreeWorkspace`, the optimizer and
 * reinforcement-turn builders, and the agent run itself. A YAML-shape assertion cannot tell
 * whether a `${{ }}` array survives rendering, whether a settled parallel really lets the
 * round finish, or whether a skipped `prepare_turn` really suppresses the `ai.agent` tail;
 * those are engine semantics, so they are executed here.
 *
 * `ai.agent` is contributed by Agent Builder rather than by this plugin, and its real
 * handler needs a whole agent runtime, so it is registered here as a recording fake. The
 * fake keeps the real step id and the real config keys the YAML sets (`agent-id`,
 * `create-conversation`, attribution ids), which is what the assertions read.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { resolveNightshiftModelForRequest } from '@kbn/nightshift-ai';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus, StepCategory } from '@kbn/workflows';
import {
  getManagedWorkflowDefinition,
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  createPollServerStepDefinition,
  createServerStepDefinition,
  type ServerStepDefinition,
} from '@kbn/workflows-extensions/server';
import {
  WorkflowRunFixture,
  type WorkflowRunFixture as WorkflowRunFixtureType,
} from '@kbn/workflows-execution-engine/test_helpers';
import { z } from '@kbn/zod/v4';
import type { AnalyticsServiceSetup, ElasticsearchClient } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import type { NightshiftTelemetryClient } from '../server/telemetry';

import { hydrateCortexWorkspace, runCortexOptimize } from '../server/cortex/register_cortex';
import { hydrateMemoryWorkspace, runMemoryOptimize } from '../server/memory/register_memory';
import {
  hydrateDecisionTreeWorkspace,
  prepareReinforcementTurn,
} from '../server/decision_trees/register_decision_trees';
import { composeHydrateNotificationsStepDefinition } from '../server/step_definitions/compose_hydrate_notifications';
import { cortexHydrateStepDefinition } from '../server/step_definitions/cortex_hydrate';
import { cortexOptimizeStepDefinition } from '../server/step_definitions/cortex_optimize';
import { decisionTreeHydrateStepDefinition } from '../server/step_definitions/decision_tree_hydrate';
import { decisionTreePrepareStepDefinition } from '../server/step_definitions/decision_tree_prepare';
import { ensureInvestigationAgentStepDefinition } from '../server/step_definitions/ensure_investigation_agent';
import { memoryMaterializeToSandboxStepDefinition } from '../server/step_definitions/memory_materialize_to_sandbox';
import { memoryOptimizeStepDefinition } from '../server/step_definitions/memory_optimize';
import { obtainSandboxStepDefinition } from '../server/step_definitions/obtain_sandbox';
import { resolveModelStepDefinition } from '../server/step_definitions/resolve_model';

jest.mock('../server/cortex/register_cortex', () => ({
  hydrateCortexWorkspace: jest.fn(),
  runCortexOptimize: jest.fn(),
}));

jest.mock('../server/memory/register_memory', () => ({
  hydrateMemoryWorkspace: jest.fn(),
  runMemoryOptimize: jest.fn(),
}));

jest.mock('../server/decision_trees/register_decision_trees', () => ({
  hydrateDecisionTreeWorkspace: jest.fn(),
  prepareReinforcementTurn: jest.fn(),
}));

// The real resolver needs a live inference service and saved objects. Standing in for it keeps
// the resolve step itself real — its schema, its output, its eligibility gate — while the test
// asserts which connector the reinforcement agent was handed.
jest.mock('@kbn/nightshift-ai', () => ({
  ...jest.requireActual('@kbn/nightshift-ai'),
  resolveNightshiftModelForRequest: jest.fn(
    async ({ requestedId, roundConnectorId }: { requestedId?: string; roundConnectorId?: string }) =>
      // Liquid renders an absent optional input as '', which the real resolver also treats
      // as "not requested".
      requestedId || roundConnectorId || 'default-nightshift-connector'
  ),
}));

// Re-exported so a test asserts on the same mocked bindings the handlers call. Importing them
// from the source module in the test file would resolve the real ones instead: the `jest.mock`
// calls above only register when this module is first loaded.
export {
  hydrateCortexWorkspace,
  runCortexOptimize,
  hydrateMemoryWorkspace,
  runMemoryOptimize,
  hydrateDecisionTreeWorkspace,
  prepareReinforcementTurn,
  resolveNightshiftModelForRequest,
};

/** The managed YAML as installed, so a test cannot drift from what ships. */
const managedYaml = (id: string): string => {
  const definition = getManagedWorkflowDefinition(id);
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error(`Managed definition ${id} has no yaml`);
  }
  return definition.yaml;
};

export interface NightshiftWorkflowFixtureOptions {
  cortexEnabled?: boolean;
  memoryEnabled?: boolean;
  decisionTreesEnabled?: boolean;
}

/** One `ai.agent` invocation as the fake recorded it. */
export interface AgentRun {
  stepId: string;
  message: string;
  config: Record<string, unknown>;
}

export interface NightshiftWorkflowFixture {
  engine: WorkflowRunFixtureType;
  sandboxStart: jest.Mocked<SandboxPluginStart>;
  agentBuilder: { ensure: jest.Mock };
  agentRuns: AgentRun[];
  /** Makes the next `ai.agent` run throw, as a broken reinforcement round would. */
  failAgentRun: (error: Error) => void;
  /** Swaps `nightshift.obtainSandbox` for a stand-in that returns no `sandbox_id`. */
  stubSandboxUnavailable: () => void;
  /** Swaps one writer for a poll step that never finishes, so only `branch-timeout` ends it. */
  stubNeverEndingWriter: (stepType: string) => void;
  runMaterialize: (inputs?: Record<string, unknown>) => Promise<void>;
  runOptimize: (inputs?: Record<string, unknown>) => Promise<void>;
  executionStatus: () => ExecutionStatus | undefined;
  stepExecutions: (stepId: string) => Array<Record<string, unknown>>;
  /** The timeout the engine froze on a step's timeout zone, e.g. `'900s'` for the agent. */
  resolvedStepTimeout: (stepId: string) => string | undefined;
  stepOutput: <T>(stepId: string) => T | undefined;
  /** Re-drives a parked execution (poll/timeout branches) until it reaches a terminal state. */
  driveToTerminal: () => Promise<void>;
}

const MEMORY_SUMMARY = {
  retrievalMode: 'browse' as const,
  searchFallback: false,
  candidateCount: 3,
  recalledCount: 2,
  newPageCount: 2,
  catalogSize: 2,
  catalogEvictedCount: 0,
  podReset: false,
  notificationChars: 12,
};

export const memoryOptimizeSummary = {
  recalledCount: 2,
  loadedCount: 2,
  usefulCount: 1,
  harmfulCount: 0,
  extractionProposedCount: 0,
  standaloneUpsertCount: 0,
  safetySkipCount: 0,
  mergeAttemptCount: 0,
  mergeSuccessCount: 0,
  harmfulArchiveCount: 0,
  mergedSourceArchiveCount: 0,
  writeFailureCount: 0,
};

/** Defaults for the faked ES/sandbox boundary: a healthy round every test starts from. */
const setHealthyBoundary = (): void => {
  jest.mocked(hydrateCortexWorkspace).mockResolvedValue(undefined);
  jest.mocked(runCortexOptimize).mockResolvedValue(undefined);
  jest.mocked(hydrateDecisionTreeWorkspace).mockResolvedValue(3);
  jest.mocked(hydrateMemoryWorkspace).mockResolvedValue({
    summary: MEMORY_SUMMARY,
    recalledIds: ['mem-1', 'mem-2'],
    notification: 'Semantic Memory pages new this turn:\n- `/workspace/memories/checkout.md`',
  });
  jest.mocked(runMemoryOptimize).mockResolvedValue(memoryOptimizeSummary);
  jest.mocked(prepareReinforcementTurn).mockResolvedValue({
    message: 'reinforcement turn prompt',
    treeCount: 3,
  });
};

export const createNightshiftWorkflowFixture = ({
  cortexEnabled = true,
  memoryEnabled = true,
  decisionTreesEnabled = true,
}: NightshiftWorkflowFixtureOptions = {}): NightshiftWorkflowFixture => {
  setHealthyBoundary();

  const engine = new WorkflowRunFixture();
  const logger = loggerMock.create();
  const analytics: AnalyticsServiceSetup = coreMock.createSetup().analytics;
  const esClient = { search: jest.fn() } as unknown as ElasticsearchClient;

  // A 200 from the agents route is what `nightshift.ensureInvestigationAgent` polls for, so the
  // real handler runs end to end (install, then poll) instead of retrying a 404 nine times.
  const selfFetch = jest.fn(async () => ({
    request: { url: 'http://localhost:5601/api/agent_builder/agents/reinforcement' },
    response: new Response(JSON.stringify({ id: 'reinforcement-agent' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  }));
  Object.assign(engine.fakeKibanaRequest, {
    headers: { authorization: 'ApiKey workflow-execution-test' },
    isFakeRequest: true,
  });
  (engine.dependencies.coreStart.http.basePath.prepend as unknown as jest.Mock).mockImplementation(
    (path: string) => path
  );
  (
    engine.dependencies.coreStart.http.selfClient as unknown as { asScoped: jest.Mock }
  ).asScoped.mockReturnValue({ fetch: selfFetch });

  const sandboxSession = {
    statFiles: jest.fn().mockResolvedValue([]),
    writeFiles: jest.fn().mockResolvedValue(undefined),
    mkdirs: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(''),
  } as unknown as jest.Mocked<SandboxSession>;
  const sandboxStart = {
    getSession: jest.fn(),
    getSessionForSpace: jest.fn().mockReturnValue(sandboxSession),
  } as unknown as jest.Mocked<SandboxPluginStart>;

  const ensureAgent = jest.fn().mockResolvedValue(undefined);
  const agentBuilder = { agents: { ensure: ensureAgent } };
  const telemetry = {
    reportSemanticMemoryMaterialized: jest.fn(),
    reportSemanticMemoryOptimized: jest.fn(),
  } as unknown as NightshiftTelemetryClient;

  const agentRuns: AgentRun[] = [];
  let agentFailure: Error | undefined;
  const agentStep = createServerStepDefinition({
    id: 'ai.agent',
    label: 'Run Agent (fake)',
    category: StepCategory.Ai,
    description: 'Records the reinforcement round instead of running a real agent.',
    configSchema: z.object({
      'agent-id': z.string().optional(),
      'connector-id': z.string().optional(),
      'create-conversation': z.boolean().optional(),
      'plugin-id': z.string().optional(),
      'aggregate-by': z.string().optional(),
      'product-solution': z.string().optional(),
      'product-feature': z.string().optional(),
    }),
    inputSchema: z.object({ message: z.string() }),
    outputSchema: z.object({ message: z.string().optional() }),
    handler: async (context) => {
      agentRuns.push({
        stepId: context.stepId,
        message: context.input.message,
        config: context.config as Record<string, unknown>,
      });
      if (agentFailure) {
        throw agentFailure;
      }
      return { output: { message: 'reinforced' } };
    },
  });

  // Mirrors the registration list in `plugin.ts`: every writer and both reinforcement steps are
  // registered whatever the feature flags say, which is what lets a trees-off install still run
  // the combined workflows.
  const definitions: ServerStepDefinition[] = [
    obtainSandboxStepDefinition({ getSandboxStart: () => sandboxStart, logger }),
    cortexHydrateStepDefinition({
      getSandboxStart: () => sandboxStart,
      analytics,
      logger,
      isEnabled: () => cortexEnabled,
    }),
    memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => sandboxStart,
      getMemoryEsClient: async () => esClient,
      logger,
      isEnabled: () => memoryEnabled,
      telemetry,
    }),
    decisionTreeHydrateStepDefinition({
      getSandboxStart: () => sandboxStart,
      logger,
      isEnabled: () => decisionTreesEnabled,
    }),
    composeHydrateNotificationsStepDefinition(),
    cortexOptimizeStepDefinition({
      getAgentBuilder: () => undefined,
      getInference: () => undefined,
      getSavedObjects: () => undefined,
      getUiSettings: () => undefined,
      analytics,
      logger,
      isEnabled: () => cortexEnabled,
    }),
    memoryOptimizeStepDefinition({
      getAgentBuilder: () => undefined,
      getInference: () => undefined,
      getSavedObjects: () => undefined,
      getUiSettings: () => undefined,
      getMemoryEsClient: async () => esClient,
      logger,
      isEnabled: () => memoryEnabled,
      telemetry,
    }),
    decisionTreePrepareStepDefinition({
      getTelemetryConnectorId: () => undefined,
      logger,
      isEnabled: () => decisionTreesEnabled,
    }),
    resolveModelStepDefinition({
      getInference: () => ({}) as never,
      getSavedObjects: () => ({} as never),
      getUiSettings: () => ({} as never),
      logger,
    }),
    ensureInvestigationAgentStepDefinition({
      getAgentBuilder: () => agentBuilder as unknown as AgentBuilderPluginStart,
      getAgentAvailability: () => ({} as AgentAvailabilityConfig),
    }),
    agentStep,
  ];
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  engine.dependencies.workflowsExtensions.hasStepDefinition = jest.fn((stepType: string) =>
    byId.has(stepType)
  ) as never;
  engine.dependencies.workflowsExtensions.getStepDefinition = jest.fn((stepType: string) =>
    byId.get(stepType)
  ) as never;

  // `nightshift.obtainSandbox` is fail-fast by design: it returns a sandbox_id or it throws. The
  // case this stands in for is the other one the workflow guards against — obtain completing with
  // nothing in its output — so every step gated on that id is skipped rather than run blind.
  const stubSandboxUnavailable = (): void => {
    byId.set(
      'nightshift.obtainSandbox',
      createServerStepDefinition({
        id: 'nightshift.obtainSandbox',
        label: 'Obtain Nightshift Sandbox (unavailable stand-in)',
        category: StepCategory.Ai,
        description: 'Returns no sandbox_id, as a sandbox-less deployment would.',
        inputSchema: z.object({ conversation_id: z.string(), required: z.boolean().optional() }),
        outputSchema: z.object({ sandbox_id: z.string().optional(), skipped: z.boolean() }),
        handler: async () => ({ output: { skipped: true } }),
      })
    );
  };

  // A one-shot handler that never settles would hang the whole run; a poll step that keeps asking
  // to be polled parks the branch instead, which is how a real stuck writer behaves and what lets
  // `branch-timeout` end it.
  const stubNeverEndingWriter = (stepType: string): void => {
    byId.set(
      stepType,
      createPollServerStepDefinition({
        id: stepType,
        label: 'Never-completing writer (test stand-in)',
        category: StepCategory.Ai,
        description: 'Always asks to poll again; only branch-timeout ends it.',
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        poll: async () => undefined,
        policy: { strategy: 'fixed', intervalMs: 6_000 },
        ceilings: { maxAttempts: 100, maxWaitMs: 600_000 },
      })
    );
  };

  const getExecution = () =>
    engine.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  // A step the engine wrapped in a timeout zone records a second `step_level_timeout` execution
  // under the same step id; callers here mean the atomic step itself.
  const stepExecutions = (stepId: string) =>
    [...engine.stepExecutionRepositoryMock.stepExecutions.values()].filter(
      (stepExecution) =>
        stepExecution.stepId === stepId && stepExecution.stepType !== 'step_level_timeout'
    ) as unknown as Array<Record<string, unknown>>;

  return {
    engine,
    sandboxStart,
    agentBuilder: { ensure: ensureAgent },
    agentRuns,
    failAgentRun: (error: Error) => {
      agentFailure = error;
    },
    stubSandboxUnavailable,
    stubNeverEndingWriter,
    runMaterialize: async (inputs = {}) => {
      await engine.runWorkflow({
        workflowYaml: managedYaml(NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID),
        inputs,
      });
    },
    runOptimize: async (inputs = {}) => {
      await engine.runWorkflow({
        workflowYaml: managedYaml(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID),
        inputs,
      });
    },
    executionStatus: () => getExecution()?.status,
    stepExecutions,
    resolvedStepTimeout: (stepId: string) => {
      const zone = [...engine.stepExecutionRepositoryMock.stepExecutions.values()].find(
        (stepExecution) =>
          stepExecution.stepId === stepId && stepExecution.stepType === 'step_level_timeout'
      );
      const resolved = (zone?.state as { resolvedTimeout?: unknown } | undefined)?.resolvedTimeout;
      return typeof resolved === 'string' ? resolved : undefined;
    },
    stepOutput: <T>(stepId: string) => stepExecutions(stepId)[0]?.output as T | undefined,
    driveToTerminal: async () => {
      let guard = 0;
      while (getExecution()?.status === ExecutionStatus.WAITING && guard < 40) {
        // Each still-polling branch has a wake-up scheduled; jumping to it re-enters the engine,
        // which is what lets a `branch-timeout` be evaluated against the elapsed time.
        const resumeTask = engine.taskManagerMock.schedule.mock.calls.at(-1)?.[0];
        jest.useFakeTimers({ now: new Date(resumeTask?.runAt ?? Date.now() + 60_000) });
        try {
          await engine.resumeWorkflow();
        } finally {
          jest.useRealTimers();
        }
        guard += 1;
      }
    },
  };
};
