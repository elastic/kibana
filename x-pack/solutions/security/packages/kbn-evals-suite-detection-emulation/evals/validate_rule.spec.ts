/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Eval spec for the detection-emulation skill's validateRule tool.
 *
 * Per-example evaluators:
 *  - skillActivation       : verifies the detection-emulation skill was
 *                            activated (APM trace contains the SKILL.md
 *                            filestore.read span). Renamed from
 *                            `toolSelection` (N6) — the underlying check is
 *                            skill firing, not which tool was chosen.
 *  - schemaCompliance      : verifies that any validateRule tool call in the
 *                            trace includes `ruleId` and `endpointIds` in
 *                            its parameters; vacuously passes when the tool
 *                            is correctly NOT called.
 *  - trajectory            : verifies the actual tool-call sequence aligns
 *                            with each example's `output.tool_sequence`
 *                            golden path (LCS-based, code evaluator,
 *                            zero LLM cost).
 *  - criteria              : per-example LLM criteria scoring from
 *                            `output.criteria`.
 *  - traceBasedEvaluators  : the @kbn/evals stock five (toolCalls, latency,
 *                            inputTokens, outputTokens, cachedTokens) —
 *                            pre-instantiated on the worker fixture, zero
 *                            additional cost per example.
 *
 * NOT a Jest test — run via the @kbn/evals Playwright eval runner.
 * Lives in `@kbn/evals-suite-detection-emulation` (devOnly functional-tests
 * package) so the production `security_solution` plugin doesn't need to
 * pull in the devOnly `@kbn/evals` package as a kbn_reference.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  evaluate as base,
  createSkillInvocationEvaluator,
  createTraceBasedEvaluator,
  createTrajectoryEvaluator,
  tags,
  withRetry,
} from '@kbn/evals';
import type {
  DefaultEvaluators,
  EvaluationDataset,
  EvalsExecutorClient,
  Evaluator,
  Example,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core-http-browser';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { validateRuleDataset } from './validate_rule_dataset';

// ─── Chat client ──────────────────────────────────────────────────────────────

interface ConverseResponse {
  conversationId?: string;
  messages: Array<{ message: string }>;
  steps?: unknown[];
  errors: unknown[];
  traceId?: string;
}

/** Pending prompt as emitted by the converse API when a tool calls
 * `prompts.askForConfirmation` (or via declarative `confirmation:`).
 * The shape mirrors `ConfirmPromptDefinition` from
 * @kbn/agent-builder-common/agents/prompts. */
interface PendingPrompt {
  id: string;
  type?: string;
  title?: string;
  message?: string;
}

interface ConverseApiResponseShape {
  conversation_id: string;
  trace_id?: string;
  steps: unknown[];
  response: { message: string; prompts?: PendingPrompt[] };
}

/**
 * Auto-confirmation policy for HITL prompts emitted by the agent
 * during a converse turn.
 *
 *  - `'allow'`  — accept every prompt (default; mirrors the prior
 *                 always-proceed behaviour for examples that don't
 *                 exercise rejection)
 *  - `'reject'` — decline every prompt (used by the `userDeclines`
 *                 example so the agent must honour the cancellation)
 */
export type AutoConfirmPolicy = 'allow' | 'reject';

/** Bounded loop ceiling so a malformed agent loop can't run forever
 * inside a single eval example. 5 is generous — validateRule only
 * needs a single confirmation today; the per-family `run*Command`
 * tools share a `once`-scoped policy so they prompt once at most. */
const MAX_PROMPT_ROUNDS = 5;

class DetectionEmulationChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  async converse({
    message,
    conversationId,
    autoConfirm = 'allow',
  }: {
    message: string;
    conversationId?: string;
    autoConfirm?: AutoConfirmPolicy;
  }): Promise<ConverseResponse> {
    const agentId = process.env.AGENT_BUILDER_AGENT_ID ?? agentBuilderDefaultAgentId;

    this.log.info('Calling converse');

    /**
     * Calls the converse endpoint once. May return either a final
     * response or a turn that ends in pending prompts. Returns the
     * raw API shape so the outer loop can decide whether to continue.
     */
    const callConverseApi = async (turnInput: {
      input?: string;
      promptResponses?: Record<string, { allow: boolean }>;
      currentConversationId?: string;
    }): Promise<ConverseApiResponseShape> => {
      const body: Record<string, unknown> = {
        agent_id: agentId,
        connector_id: this.connectorId,
      };
      if (turnInput.currentConversationId) {
        body.conversation_id = turnInput.currentConversationId;
      }
      if (turnInput.input !== undefined) {
        body.input = turnInput.input;
      }
      if (turnInput.promptResponses && Object.keys(turnInput.promptResponses).length > 0) {
        body.prompts = turnInput.promptResponses;
      }

      const response = await this.fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify(body),
      });

      return response as ConverseApiResponseShape;
    };

    /** Retry policy is identical to the pre-HITL implementation
     * (N5 — `withRetry` over transient 5xx / network errors). It now
     * wraps each individual converse turn rather than the single
     * round-trip, so a 503 on the auto-confirmation turn retries
     * the same way an initial 503 would. */
    const callWithRetry = async (turnInput: {
      input?: string;
      promptResponses?: Record<string, { allow: boolean }>;
      currentConversationId?: string;
    }): Promise<ConverseApiResponseShape> =>
      withRetry(() => callConverseApi(turnInput), {
        maxAttempts: 3,
        minDelayMs: 2000,
        label: 'converse',
        onRetry: ({ attempt, maxAttempts, error }) => {
          this.log.warning(
            new Error(`converse: attempt ${attempt}/${maxAttempts} failed; retrying`, {
              cause: error instanceof Error ? error : new Error(String(error)),
            })
          );
        },
      });

    try {
      // Initial turn.
      let apiResponse = await callWithRetry({
        input: message,
        currentConversationId: conversationId,
      });
      const aggregatedSteps: unknown[] = Array.isArray(apiResponse.steps)
        ? [...apiResponse.steps]
        : [];
      let turn = 0;

      // HITL auto-resume loop: if the agent emitted pending prompts,
      // respond with the configured policy and continue the same
      // conversation. Loop until the agent returns a turn with no
      // pending prompts (or the safety ceiling is hit).
      while (apiResponse.response?.prompts && apiResponse.response.prompts.length > 0) {
        if (turn >= MAX_PROMPT_ROUNDS) {
          this.log.warning(
            `converse: hit MAX_PROMPT_ROUNDS=${MAX_PROMPT_ROUNDS} for conversation [${apiResponse.conversation_id}] — likely a malformed agent loop`
          );
          break;
        }
        const allow = autoConfirm === 'allow';
        const promptResponses: Record<string, { allow: boolean }> = {};
        for (const prompt of apiResponse.response.prompts) {
          promptResponses[prompt.id] = { allow };
        }
        this.log.info(
          `converse: auto-${allow ? 'accepting' : 'rejecting'} ${
            apiResponse.response.prompts.length
          } pending prompt(s)`
        );

        apiResponse = await callWithRetry({
          promptResponses,
          currentConversationId: apiResponse.conversation_id,
        });
        if (Array.isArray(apiResponse.steps)) {
          aggregatedSteps.push(...apiResponse.steps);
        }
        turn += 1;
      }

      return {
        conversationId: apiResponse.conversation_id,
        messages: [{ message }, apiResponse.response],
        steps: aggregatedSteps,
        errors: [],
        traceId: apiResponse.trace_id,
      };
    } catch (error) {
      this.log.error('converse: fatal error');
      return {
        conversationId,
        steps: [],
        messages: [{ message }, { message: 'Internal error — please try again.' }],
        errors: [{ message: error instanceof Error ? error.message : String(error) }],
      };
    }
  }
}

// ─── Evaluate fixture extension ───────────────────────────────────────────────

const evaluate = base.extend<{}, { chatClient: DetectionEmulationChatClient }>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      await use(new DetectionEmulationChatClient(fetch, log, connector.id));
    },
    { scope: 'worker' },
  ],
});

// ─── Evaluator factories ──────────────────────────────────────────────────────

/**
 * skillActivation — verifies the detection-emulation skill was activated by
 * checking for the SKILL.md `filestore.read` span in the APM trace.
 * For distractor examples the skill should NOT appear; the evaluator scores
 * based on presence (success/failure examples) or absence (distractors).
 *
 * Renamed from `createToolSelectionEvaluator` (N6) — `createSkillInvocationEvaluator`
 * checks whether the skill's content blob was loaded, not which tool the LLM
 * subsequently picked. Tool selection is now covered by the trajectory
 * evaluator below, which scores against `output.tool_sequence`.
 */
function createSkillActivationEvaluator({
  traceEsClient,
  log,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
}): Evaluator {
  return createSkillInvocationEvaluator({
    traceEsClient,
    log,
    skillName: 'detection-emulation',
  });
}

/**
 * schemaCompliance — verifies that any `security.detection-emulation.validate-rule`
 * tool call found in the trace includes the required `ruleId` and `endpointIds`
 * parameters in its serialised JSON body.
 *
 * Returns 1 when:
 *   - No validateRule calls found (distractor / history short-circuit — correct)
 *   - All calls included both `ruleId` and `endpointIds`
 * Returns 0 when any call is missing the required fields.
 */
function createSchemaComplianceEvaluator({
  traceEsClient,
  log,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
}): Evaluator {
  return createTraceBasedEvaluator({
    traceEsClient,
    log,
    config: {
      name: 'Schema Compliance',
      buildQuery: (traceId) => `FROM traces-*
| WHERE trace.id == "${traceId}"
  AND attributes.elastic.inference.span.kind == "TOOL"
  AND attributes.gen_ai.tool.name == "security.detection-emulation.validate-rule"
| STATS
  total_calls = COUNT(*),
  calls_with_rule_id = COUNT(
    CASE(
      attributes.elastic.tool.parameters LIKE "*\\"ruleId\\"*",
      1,
      NULL
    )
  ),
  calls_with_endpoint_ids = COUNT(
    CASE(
      attributes.elastic.tool.parameters LIKE "*\\"endpointIds\\"*",
      1,
      NULL
    )
  )`,
      extractResult: (response) => {
        const row = response.values[0];
        const cols = response.columns;
        const totalIdx = cols.findIndex((c) => c.name === 'total_calls');
        const ruleIdIdx = cols.findIndex((c) => c.name === 'calls_with_rule_id');
        const endpointIdsIdx = cols.findIndex((c) => c.name === 'calls_with_endpoint_ids');

        if (totalIdx === -1 || ruleIdIdx === -1 || endpointIdsIdx === -1) {
          log.warning('Schema compliance: expected columns absent from trace response');
          return null;
        }

        const total = (row?.[totalIdx] as number | undefined) ?? 0;
        if (total === 0) {
          // No validateRule calls — distractor or history short-circuit; compliant by definition.
          return 1;
        }

        const withRuleId = (row?.[ruleIdIdx] as number | undefined) ?? 0;
        const withEndpointIds = (row?.[endpointIdsIdx] as number | undefined) ?? 0;

        return withRuleId === total && withEndpointIds === total ? 1 : 0;
      },
      isResultValid: (result) => result !== null,
    },
  });
}

/**
 * criteriaEvaluator — LLM judge that scores the agent response against the
 * per-example `criteria` strings defined in `output.criteria`.
 */
function createCriteriaEvaluator({ evaluators }: { evaluators: DefaultEvaluators }): Evaluator {
  return {
    name: 'Criteria',
    kind: 'LLM' as const,
    evaluate: async ({ expected, ...rest }) => {
      const criteria = (expected as { criteria?: string[] })?.criteria ?? [];
      return evaluators.criteria(criteria).evaluate({ expected, ...rest });
    },
  };
}

/**
 * trajectory — code evaluator (zero LLM cost) that compares the actual
 * tool-call sequence against the example's `output.tool_sequence` golden
 * path using LCS for order + set intersection for coverage.
 *
 * - `extractToolCalls` reads `steps[].tool_id` from the live agent task
 *   output (each `tool_call` step carries the canonical tool id, e.g.
 *   `security.detection-emulation.validate-rule`).
 * - `goldenPathExtractor` reads `tool_sequence` from the dataset
 *   example's `output` field. Distractor examples set
 *   `tool_sequence: []` so the evaluator returns 1.0 when no tools were
 *   called and 0.0 if any tool fired.
 *
 * Order weight 0.7 reflects that for this skill the BEFORE-relationship
 * (history before validate) carries most of the signal; coverage is still
 * 0.3 so missing the validate tool entirely is penalised.
 */
function createValidateRuleTrajectoryEvaluator(): Evaluator {
  return createTrajectoryEvaluator({
    extractToolCalls: (output: unknown) => {
      const steps = (output as { steps?: Array<{ type?: string; tool_id?: string }> })?.steps ?? [];
      return steps.filter((step) => step.type === 'tool_call').map((step) => step.tool_id ?? '');
    },
    goldenPathExtractor: (expected: unknown) =>
      (expected as { tool_sequence?: string[] })?.tool_sequence ?? [],
    orderWeight: 0.7,
    coverageWeight: 0.3,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DatasetExample = (typeof validateRuleDataset.examples)[number];

function runScenario({
  name,
  example,
  chatClient,
  evaluators,
  executorClient,
  traceEsClient,
  log,
}: {
  name: string;
  example: DatasetExample;
  chatClient: DetectionEmulationChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}) {
  const dataset = {
    name: `${validateRuleDataset.name}: ${name}`,
    description: validateRuleDataset.description,
    examples: [example as Example],
  } satisfies EvaluationDataset;

  // Per-example HITL policy. Examples may opt into rejection by setting
  // `input.autoConfirm: 'reject'`; everything else accepts (preserves
  // pre-HITL behaviour for the existing positive examples).
  const autoConfirm: AutoConfirmPolicy =
    (example.input as { autoConfirm?: AutoConfirmPolicy } | undefined)?.autoConfirm ?? 'allow';

  return executorClient.runExperiment(
    {
      dataset,
      task: async ({ input }) => {
        const response = await chatClient.converse({
          message: (input as { question: string }).question,
          autoConfirm,
        });
        return {
          messages: response.messages,
          steps: response.steps,
          errors: response.errors,
          traceId: response.traceId,
        };
      },
    },
    [
      createSkillActivationEvaluator({ traceEsClient, log }),
      createSchemaComplianceEvaluator({ traceEsClient, log }),
      createCriteriaEvaluator({ evaluators }),
      createValidateRuleTrajectoryEvaluator(),
      // Stock @kbn/evals trace-based metrics — pre-instantiated on the
      // worker fixture so adding them here costs nothing per example. They
      // surface tool-call counts, span latency, and token usage in the
      // evaluator output for trend tracking.
      evaluators.traceBasedEvaluators.toolCalls,
      evaluators.traceBasedEvaluators.latency,
      evaluators.traceBasedEvaluators.inputTokens,
      evaluators.traceBasedEvaluators.outputTokens,
      evaluators.traceBasedEvaluators.cachedTokens,
    ]
  );
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

evaluate.describe(
  'detection-emulation skill — validateRule',
  { tag: tags.stateful.classic },
  () => {
    const [
      powershell,
      mshta,
      defaultMode,
      historyFirst,
      noMitreTags,
      noSupportedTechniques,
      realExecBlocked,
      userDeclines,
      alertInvestigation,
      ruleCreation,
      esqlQuestion,
      threatHunting,
      dashboardCreation,
    ] = validateRuleDataset.examples;

    evaluate(
      'success — PowerShell rule (T1059.001)',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'success: T1059.001',
          example: powershell,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'success — mshta/regsvr32 rule (T1218.005)',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'success: T1218.005',
          example: mshta,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'default mode — no explicit mode uses log_injection',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'default mode',
          example: defaultMode,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'history-first flow — checks history before re-running',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'history-first',
          example: historyFirst,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'failure — rule with no MITRE ATT&CK tags',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'failure: no_mitre_tags',
          example: noMitreTags,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'failure — technique not in payload library',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'failure: no_supported_techniques',
          example: noSupportedTechniques,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'failure — real_execution blocked by authorization_error',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'failure: real_execution blocked',
          example: realExecBlocked,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'HITL — user declines real_execution prompt',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'HITL: user declines',
          example: userDeclines,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'distractor — alert investigation (skill must not fire)',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'distractor: alert investigation',
          example: alertInvestigation,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'distractor — rule creation request (skill must not fire)',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'distractor: rule creation',
          example: ruleCreation,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'distractor — ES|QL question (skill must not fire)',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'distractor: ES|QL question',
          example: esqlQuestion,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'distractor — threat hunting request (skill must not fire)',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'distractor: threat hunting',
          example: threatHunting,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );

    evaluate(
      'distractor — dashboard creation (skill must not fire)',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        await runScenario({
          name: 'distractor: dashboard creation',
          example: dashboardCreation,
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        });
      }
    );
  }
);
