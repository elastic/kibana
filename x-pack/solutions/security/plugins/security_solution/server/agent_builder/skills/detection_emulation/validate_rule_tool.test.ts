/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AgentExecutionMode, ToolType } from '@kbn/agent-builder-common';
import {
  AgentPromptType,
  ConfirmationStatus,
  type ConfirmPromptDefinition,
} from '@kbn/agent-builder-common/agents/prompts';
import type {
  ToolHandlerPromptReturn,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { createValidateRuleTool } from './validate_rule_tool';
import { generateScenario } from '../../../lib/detection_emulation/scenario_generator';
import { createDetectionEmulationGuardrails } from '../../../lib/detection_emulation/execution/shared_guardrails';

// Stub scenario generation so the only path that proceeds past HITL
// (standalone-mode real_execution) short-circuits BEFORE the runner is
// touched. Lets us verify "HITL was skipped" without needing the full
// rules-client + payload-library + runner mocks.
jest.mock('../../../lib/detection_emulation/scenario_generator', () => ({
  generateScenario: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

// `detectionEmulation.allowlist` opts every test endpoint into the host
// allowlist explicitly. PROD-1 flipped the default to deny when no
// operator config is supplied, so a test that wants to exercise paths
// past the allowlist gate must populate this.
const FEATURE_ENABLED_CONFIG = {
  experimentalFeatures: {
    detectionEmulationRealExecution: true,
    detectionEmulationLogInjection: true,
  },
  detectionEmulation: {
    allowlist: {
      allowAll: false,
      endpointIds: ['agent-1', 'agent-2'],
    },
  },
} as unknown as ConfigType;

interface MockContextOptions {
  promptStatus?: ConfirmationStatus;
  executionMode?: AgentExecutionMode;
  toolCallId?: string;
  runId?: string;
  conversationId?: string;
  executionId?: string;
  /**
   * When true, simulates the Task Manager dispatch path: the request
   * carries `isFakeRequest: true` so `resolveCurrentUsername` skips
   * `security.authc.getCurrentUser` and falls back to ES
   * `_security/_authenticate` for the API key owner.
   */
  isFakeRequest?: boolean;
  /**
   * Username returned by the ES `_security/_authenticate` fallback. Use
   * `null` to simulate an authenticate failure.
   */
  esAuthenticateUsername?: string | null;
}

const createMockContext = (options: MockContextOptions = {}) => {
  const askForConfirmation = jest.fn(
    (def: ConfirmPromptDefinition): ToolHandlerPromptReturn => ({
      prompt: { type: AgentPromptType.confirmation, ...def },
    })
  );
  const checkConfirmationStatus = jest.fn().mockReturnValue({
    status: options.promptStatus ?? ConfirmationStatus.unprompted,
  });

  const authenticateUsername =
    options.esAuthenticateUsername === undefined
      ? 'task-manager-user'
      : options.esAuthenticateUsername;
  const authenticate =
    authenticateUsername === null
      ? jest.fn().mockRejectedValue(new Error('authenticate failed'))
      : jest.fn().mockResolvedValue({ username: authenticateUsername });

  return {
    spaceId: 'default',
    request: { headers: {}, isFakeRequest: options.isFakeRequest ?? false },
    esClient: {
      asCurrentUser: { security: { authenticate } },
    },
    executionMode: options.executionMode,
    callContext: {
      toolId: 'security.detection-emulation.validate-rule',
      toolCallId: options.toolCallId ?? 'tc_default',
      callSource: 'agent' as const,
    },
    // PROD-2: validate_rule_tool now destructures `runContext` to build
    // the agent-builder actor block on the SO write and audit comment.
    // The test mock provides realistic IDs so any future assertion on
    // the propagated actor object can read them back.
    runContext: {
      runId: options.runId ?? 'run-test',
      stack: [
        {
          type: 'agent' as const,
          agentId: 'agent-test',
          conversationId: options.conversationId ?? 'conv-test',
          executionId: options.executionId ?? 'exec-test',
        },
      ],
    },
    prompts: {
      checkConfirmationStatus,
      askForConfirmation,
    },
  };
};

// Kibana's `security.authc.getCurrentUser` is synchronous (returns
// `AuthenticatedUser | null` directly). The mock matches that contract so
// `resolveCurrentUsername` reads the real-request branch correctly.
const createMockCore = (username: string | null = 'test-user') =>
  ({
    getStartServices: jest.fn().mockResolvedValue([
      {
        security: {
          authc: {
            getCurrentUser: jest.fn().mockReturnValue(username ? { username } : null),
          },
        },
        savedObjects: { getScopedClient: jest.fn() },
        uiSettings: {
          // The runtime config resolver reads four keys from a scoped
          // uiSettings client. Returning the registered defaults
          // (`[]` for the allowlist, `0` for numeric knobs) makes the
          // resolver fall through to its "no override" branch and
          // return `undefined`, so the call sites pass nothing to
          // `validate()` / `acquire()` and the constructor binding
          // wins — matching production behavior when an operator
          // hasn't touched Advanced Settings.
          asScopedToClient: jest.fn().mockReturnValue({
            get: jest.fn(async (key: string) => {
              if (key.includes('allowlist')) return [];
              return 0;
            }),
          }),
        },
      },
      {
        alerting: {
          getRulesClientWithRequest: jest.fn().mockResolvedValue({}),
        },
      },
    ]),
  } as unknown as SecuritySolutionPluginCoreSetupDependencies);

const createMockEndpointService = (canExecute = true) =>
  ({
    // `EndpointAuthz` exposes booleans as `canXxx` (e.g.
    // `canWriteExecuteOperations`), not the bare Kibana feature-privilege
    // string. Earlier `writeExecuteOperations` here masked the gate-bug:
    // both code and test agreed on the wrong key, so the test passed and
    // production 403'd. See
    // `RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ` in
    // `common/endpoint/service/response_actions/constants.ts`.
    getEndpointAuthz: jest.fn().mockResolvedValue({
      canWriteExecuteOperations: canExecute,
    }),
  } as unknown as EndpointAppContextService);

const createTool = (
  overrides: {
    core?: SecuritySolutionPluginCoreSetupDependencies;
    endpointService?: EndpointAppContextService;
    config?: ConfigType;
  } = {}
) => {
  const config = overrides.config ?? FEATURE_ENABLED_CONFIG;
  const logger = loggingSystemMock.createLogger();
  return createValidateRuleTool({
    core: overrides.core ?? createMockCore(),
    endpointService: overrides.endpointService ?? createMockEndpointService(),
    config,
    logger,
    // Build a real (test-isolated) guardrail bundle so the tool factory
    // gets a coherent allowlist + rate-limiter + concurrency-gate trio.
    // Each `createTool()` call gets its own bundle, mirroring the
    // pre-singleton-hoist behaviour these tests were written against.
    guardrails: createDetectionEmulationGuardrails(config, logger),
  });
};

const REAL_EXECUTION_INPUT = {
  ruleId: 'rule-under-test',
  endpointIds: ['agent-1'],
  mode: 'real_execution' as const,
};

const LOG_INJECTION_INPUT = {
  ruleId: 'rule-under-test',
  endpointIds: ['agent-1'],
  mode: 'log_injection' as const,
};

// `as never` casts let us call the typed handler with our minimal mocks
// without recreating the entire ToolHandlerContext interface in the test.
const invokeHandler = async (
  tool: ReturnType<typeof createTool>,
  input: unknown,
  context: unknown
) =>
  (await tool.handler(input as never, context as never)) as
    | ToolHandlerStandardReturn
    | ToolHandlerPromptReturn;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createValidateRuleTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tool descriptor', () => {
    it('registers with the canonical tool id and builtin type', () => {
      const tool = createTool();
      expect(tool.id).toBe('security.detection-emulation.validate-rule');
      expect(tool.type).toBe(ToolType.builtin);
    });
  });

  describe('HITL — real_execution prompt', () => {
    it('returns a confirmation prompt when status is unprompted', async () => {
      const tool = createTool();
      const context = createMockContext({
        promptStatus: ConfirmationStatus.unprompted,
        toolCallId: 'tc_unprompted',
      });

      const result = await invokeHandler(tool, REAL_EXECUTION_INPUT, context);

      // Prompt return shape: { prompt: { type, id, title, message, color, ... } }.
      expect('prompt' in result).toBe(true);
      if (!('prompt' in result)) return;

      expect(context.prompts.checkConfirmationStatus).toHaveBeenCalledWith(
        'security.detection-emulation.validate-rule.tc_unprompted'
      );
      expect(context.prompts.askForConfirmation).toHaveBeenCalledTimes(1);
      expect(result.prompt).toMatchObject({
        type: AgentPromptType.confirmation,
        id: 'security.detection-emulation.validate-rule.tc_unprompted',
        color: 'danger',
      });
      expect(result.prompt.title).toContain('rule-under-test');
      expect(result.prompt.message).toContain('agent-1');
      expect(result.prompt.message).toContain('real_execution');

      // The prompt must short-circuit the pipeline BEFORE scenario gen so
      // a deferred run doesn't waste rules-client / payload-library work.
      expect(generateScenario as jest.Mock).not.toHaveBeenCalled();
    });

    it('returns a user_declined error when status is rejected and never proceeds to scenario gen', async () => {
      const tool = createTool();
      const context = createMockContext({
        promptStatus: ConfirmationStatus.rejected,
      });

      const result = await invokeHandler(tool, REAL_EXECUTION_INPUT, context);

      expect('results' in result).toBe(true);
      if (!('results' in result)) return;

      const data = result.results[0].data as Record<string, unknown>;
      expect(data.error_type).toBe('user_declined');
      expect(data.rule_id).toBe('rule-under-test');
      expect(data.mode).toBe('real_execution');
      expect(data.status_code).toBe(403);

      // A declined run must NOT re-prompt and must NOT fall through to
      // payload selection — the user has explicitly cancelled.
      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(generateScenario as jest.Mock).not.toHaveBeenCalled();
    });

    it('skips the HITL prompt entirely in standalone execution mode', async () => {
      // Standalone runs are non-interactive (sub-agent forks, evals, A2A).
      // The prompt would deadlock since no human is on the other end. The
      // existing RBAC + allowlist gates remain in force; only the prompt
      // is bypassed.
      (generateScenario as jest.Mock).mockResolvedValueOnce({
        ok: false,
        reason: 'no_mitre_tags',
      });

      const tool = createTool();
      const context = createMockContext({
        executionMode: AgentExecutionMode.standalone,
      });

      const result = await invokeHandler(tool, REAL_EXECUTION_INPUT, context);

      // No HITL primitive was touched.
      expect(context.prompts.checkConfirmationStatus).not.toHaveBeenCalled();
      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();

      // The pipeline proceeded past HITL and reached scenario generation
      // (which we stubbed to return a deterministic failure) — proving the
      // prompt was bypassed, not silently swallowed.
      expect(generateScenario as jest.Mock).toHaveBeenCalledTimes(1);
      expect('results' in result).toBe(true);
      if (!('results' in result)) return;
      expect(result.results[0].data).toMatchObject({
        error_type: 'no_mitre_tags',
        rule_id: 'rule-under-test',
      });
    });
  });

  describe('HITL — log_injection mode', () => {
    it('never invokes the HITL primitives in log_injection mode', async () => {
      // log_injection has its own (non-destructive) path; declarative
      // `askUser: 'always'` would have hurt the safe path's UX, which is
      // why HITL is on-demand and gated on `mode === 'real_execution'`.
      (generateScenario as jest.Mock).mockResolvedValueOnce({
        ok: false,
        reason: 'no_mitre_tags',
      });

      const tool = createTool();
      const context = createMockContext();

      const result = await invokeHandler(tool, LOG_INJECTION_INPUT, context);

      expect(context.prompts.checkConfirmationStatus).not.toHaveBeenCalled();
      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();

      // Pipeline proceeded normally past where HITL would have lived.
      expect(generateScenario as jest.Mock).toHaveBeenCalledTimes(1);
      expect('results' in result).toBe(true);
    });
  });

  describe('Step 2 — operator resolution (fakeRequest fallback)', () => {
    it('falls back to ES _security/_authenticate when the request is a fake KibanaRequest (TM dispatch)', async () => {
      // Reproduces the failure surfaced by Agent Builder dispatch on Task
      // Manager: the runtime hands the tool a synthetic KibanaRequest whose
      // `http.auth.get(request).state` is empty, so `getCurrentUser` returns
      // null. The skill must fall back to the API key owner reported by
      // ES `_security/_authenticate`. Without the fallback, every
      // chat-driven validate_rule call returned 401.
      (generateScenario as jest.Mock).mockResolvedValueOnce({
        ok: false,
        reason: 'no_mitre_tags',
      });

      const tool = createTool();
      const context = createMockContext({
        executionMode: AgentExecutionMode.standalone,
        isFakeRequest: true,
        esAuthenticateUsername: 'tm-key-owner',
      });

      const result = await invokeHandler(tool, REAL_EXECUTION_INPUT, context);

      // Must have probed ES exactly once for the API key owner.
      expect(context.esClient.asCurrentUser.security.authenticate).toHaveBeenCalledTimes(1);

      // Pipeline proceeded past Step 2 and reached scenario generation
      // (which we stubbed) — proving the auth gate accepted the fallback
      // username and did not return 401.
      expect(generateScenario as jest.Mock).toHaveBeenCalledTimes(1);
      expect('results' in result).toBe(true);
      if (!('results' in result)) return;
      expect(result.results[0].data).toMatchObject({
        error_type: 'no_mitre_tags',
        rule_id: 'rule-under-test',
      });
    });

    it('returns 401 only when both getCurrentUser and ES authenticate fail', async () => {
      const tool = createTool({ core: createMockCore(null) });
      const context = createMockContext({
        // Real-request shape, but getCurrentUser returns null AND ES
        // authenticate rejects — there is genuinely no operator to attribute.
        esAuthenticateUsername: null,
      });

      const result = await invokeHandler(tool, LOG_INJECTION_INPUT, context);

      expect('results' in result).toBe(true);
      if (!('results' in result)) return;
      expect(result.results[0].data).toMatchObject({
        error_type: 'authorization_error',
        message: 'Authentication is required to run an emulation command.',
        status_code: 401,
      });

      // Must not have proceeded to scenario generation when no operator
      // could be resolved.
      expect(generateScenario as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('HITL — gate ordering', () => {
    it('does not prompt when RBAC blocks (gate fires AFTER auth/RBAC, BEFORE rate limiter)', async () => {
      // The user lacks canWriteExecuteOperations — RBAC must short-circuit
      // before HITL so a forbidden caller doesn't see a prompt they can
      // never satisfy. Defends the gate-ordering invariant from regressing.
      const tool = createTool({ endpointService: createMockEndpointService(false) });
      const context = createMockContext();

      const result = await invokeHandler(tool, REAL_EXECUTION_INPUT, context);

      expect(context.prompts.checkConfirmationStatus).not.toHaveBeenCalled();
      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(generateScenario as jest.Mock).not.toHaveBeenCalled();

      expect('results' in result).toBe(true);
      if (!('results' in result)) return;
      expect(result.results[0].data).toMatchObject({
        error_type: 'authorization_error',
        status_code: 403,
      });
    });
  });
});
