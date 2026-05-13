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

// Stub scenario generation so the only path that proceeds past HITL
// (standalone-mode real_execution) short-circuits BEFORE the runner is
// touched. Lets us verify "HITL was skipped" without needing the full
// rules-client + payload-library + runner mocks.
jest.mock('../../../lib/detection_emulation/scenario_generator', () => ({
  generateScenario: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FEATURE_ENABLED_CONFIG = {
  experimentalFeatures: {
    detectionEmulationRealExecution: true,
    detectionEmulationLogInjection: true,
  },
} as unknown as ConfigType;

interface MockContextOptions {
  promptStatus?: ConfirmationStatus;
  executionMode?: AgentExecutionMode;
  toolCallId?: string;
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

  return {
    spaceId: 'default',
    request: { headers: {} },
    esClient: { asCurrentUser: {} },
    executionMode: options.executionMode,
    callContext: {
      toolId: 'security.detection-emulation.validate-rule',
      toolCallId: options.toolCallId ?? 'tc_default',
      callSource: 'agent' as const,
    },
    prompts: {
      checkConfirmationStatus,
      askForConfirmation,
    },
  };
};

const createMockCore = (username: string | null = 'test-user') =>
  ({
    getStartServices: jest.fn().mockResolvedValue([
      {
        security: {
          authc: {
            getCurrentUser: jest.fn().mockResolvedValue(username ? { username } : null),
          },
        },
        savedObjects: { getScopedClient: jest.fn() },
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
    getEndpointAuthz: jest.fn().mockResolvedValue({
      writeExecuteOperations: canExecute,
    }),
  } as unknown as EndpointAppContextService);

const createTool = (
  overrides: {
    core?: SecuritySolutionPluginCoreSetupDependencies;
    endpointService?: EndpointAppContextService;
    config?: ConfigType;
  } = {}
) =>
  createValidateRuleTool({
    core: overrides.core ?? createMockCore(),
    endpointService: overrides.endpointService ?? createMockEndpointService(),
    config: overrides.config ?? FEATURE_ENABLED_CONFIG,
    logger: loggingSystemMock.createLogger(),
  });

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

  describe('HITL — gate ordering', () => {
    it('does not prompt when RBAC blocks (gate fires AFTER auth/RBAC, BEFORE rate limiter)', async () => {
      // The user lacks writeExecuteOperations — RBAC must short-circuit
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
