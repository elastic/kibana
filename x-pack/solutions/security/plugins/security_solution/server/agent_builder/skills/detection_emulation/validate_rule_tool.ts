/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/core/server';
import { AgentExecutionMode, ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL,
} from '../../../../common/endpoint/service/response_actions/constants';
import type { RunEmulationCommandInput } from '../../../../common/detection_emulation/schemas';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import {
  getDetectionEmulationFeatureFlags,
  getRealExecutionDisableReason,
  REAL_EXECUTION_DISABLE_REASON_TEXT,
} from '../../../lib/detection_emulation/feature_flag';
import {
  generateScenario,
  type GenerateScenarioFailureReason,
} from '../../../lib/detection_emulation/scenario_generator';
import { generateDocs } from '../../../lib/detection_emulation/log_injection/generator';
import { executeLogInjection } from '../../../lib/detection_emulation/log_injection/executor';
import {
  collectTelemetry,
  type TelemetryResult,
} from '../../../lib/detection_emulation/telemetry_collector';
import { scoreConfidence } from '../../../lib/detection_emulation/confidence_scorer';
import { createEmulationHistory } from '../../../lib/detection_emulation/emulation_history';
import {
  emulationReportTypeName,
  type EmulationReportAttributes,
  type EmulationReportPhase,
} from '../../../lib/detection_emulation/emulation_report_type';
import { EmulationRunner } from '../../../lib/detection_emulation/execution/runner';
import {
  EmulationAllowlist,
  createAllowlistFromConfig,
} from '../../../lib/detection_emulation/execution/allowlist';
import {
  EmulationRateLimiter,
  createDefaultRateLimiterConfig,
} from '../../../lib/detection_emulation/execution/rate_limiter';
import {
  EmulationConcurrencyGate,
  createDefaultConcurrencyGateConfig,
} from '../../../lib/detection_emulation/execution/concurrency_gate';
import { buildAgentBuilderActor } from '../../../lib/detection_emulation/execution/audit_context';
import { resolveCurrentUsername } from './resolve_current_user';
import { validateRuleSchema } from './validate_rule_input';

// ─── Constants ────────────────────────────────────────────────────────────────

const WALL_BUDGET_DEFAULT_MS = 120_000;
/** Server-side ceiling: 5 minutes. */
const WALL_BUDGET_CEILING_MS = 300_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deterministic fingerprint for a (ruleId, payloadIds, agentType) triple.
 * Mirrors the equivalent helper in the validate_rule route.
 */
const computeScenarioFingerprint = (
  ruleId: string,
  payloadIds: string[],
  agentType: string
): string => {
  const serialized = JSON.stringify({ ruleId, payloadIds: [...payloadIds].sort(), agentType });
  return createHash('sha256').update(serialized).digest('hex');
};

const scenarioFailureData = (
  reason: GenerateScenarioFailureReason
): { error_type: string; message: string; status_code: number } => {
  switch (reason) {
    case 'rule_not_found':
      return {
        error_type: 'rule_not_found',
        message: 'The specified rule was not found.',
        status_code: 404,
      };
    case 'no_mitre_tags':
      return {
        error_type: 'no_mitre_tags',
        message: 'The rule has no MITRE ATT&CK technique tags.',
        status_code: 422,
      };
    case 'no_supported_techniques':
      return {
        error_type: 'no_supported_techniques',
        message: "None of the rule's techniques have emulation payloads in the library.",
        status_code: 422,
      };
    default: {
      const _exhaustive: never = reason;
      void _exhaustive;
      return {
        error_type: 'scenario_error',
        message: 'Failed to generate an emulation scenario for this rule.',
        status_code: 500,
      };
    }
  }
};

// ─── Tool ─────────────────────────────────────────────────────────────────────

export interface ValidateRuleToolDeps {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: Logger;
}

/**
 * Creates the validateRule tool for the detection emulation Agent Builder skill.
 *
 * Runs the full 8-step validation pipeline in-process (no HTTP hop):
 *   1. Feature flag gate
 *   2. Authenticated caller required
 *   3. RBAC check (real_execution only)
 *   4. Scenario generation from MITRE ATT&CK tags
 *   5. Dispatch — log_injection or real_execution
 *   6. Telemetry collection bounded by wallBudgetMs
 *   7. Confidence scoring
 *   8. History write + result
 */
export const createValidateRuleTool = (
  deps: ValidateRuleToolDeps
): BuiltinSkillBoundedTool<typeof validateRuleSchema> => {
  const { core, endpointService, config, logger } = deps;

  // Constructed once at registration so the rate-limit window and
  // allowlist set are shared across all invocations of the tool. Per-call
  // construction would defeat the per-space rate window. Mirrors the
  // pattern in the per-family run*Command tools and validate_rule/route.ts.
  //
  // PROD-1: the allowlist now defaults to deny when no operator config is
  // supplied — log a warning at registration so operators see immediately
  // that real_execution is locked out until they populate the allowlist.
  const operatorAllowlist = config.detectionEmulation?.allowlist;
  if (!operatorAllowlist) {
    logger.warn(
      '[detection-emulation] validateRule tool registered with NO operator allowlist (`xpack.securitySolution.detectionEmulation.allowlist`); default-deny is in effect — every real_execution call will be blocked until the allowlist is configured.'
    );
  }
  const allowlist = new EmulationAllowlist(createAllowlistFromConfig(operatorAllowlist), logger);
  const rateLimiter = new EmulationRateLimiter(createDefaultRateLimiterConfig(), logger);
  // PROD-5: per-space concurrency gate, shared across all invocations of
  // the tool — same singleton lifetime as the rate limiter so the limit
  // is enforced across requests, not within a single one.
  const concurrencyGate = new EmulationConcurrencyGate(
    createDefaultConcurrencyGateConfig(),
    logger
  );

  return {
    id: 'security.detection-emulation.validate-rule',
    type: ToolType.builtin,
    description: `Validate a detection rule by running an attack emulation scenario and measuring whether the rule fires.

Dispatches payloads mapped to the rule's MITRE ATT&CK technique tags, collects resulting Detection Engine alerts, and returns a composite confidence score.

**Modes:**
- \`log_injection\` (default, safe): Injects synthetic ECS documents into a dedicated emulation index. No real endpoints are touched. Use this for all exploratory validation.
- \`real_execution\` (requires privileges + feature flag): Dispatches live response actions to the target endpoints. Use only when \`log_injection\` confidence is insufficient and the operator has explicitly authorised live execution.

**Pipeline steps:**
1. Feature flag gate — respects \`detectionEmulationLogInjection\` / \`detectionEmulationRealExecution\` flags.
2. Auth check — emulation runs are always attributable to an operator.
3. RBAC check (\`real_execution\`) — verifies the caller holds the endpoint execute privilege.
4. Scenario generation — maps the rule's MITRE tags to the emulation payload library; fails with \`no_mitre_tags\` or \`no_supported_techniques\` if no match.
5. Dispatch — injects docs (\`log_injection\`) or fires response actions (\`real_execution\`).
6. Telemetry collection — polls Detection Engine alerts until \`wallBudgetMs\` elapses.
7. Confidence scoring — \`confidence = coverage × 0.6 + precision × 0.4\`, clamped [0, 1].
8. History write — persists a \`detection-emulation-report\` saved object for audit and trend analysis.

**Output fields:** \`confidence\`, \`coverage\`, \`precision\`, \`tp\`, \`fp\`, \`caveats\`, \`matched_signals\`, \`unmatched_signals\`, \`report_id\`.

**Confirmation (\`real_execution\` only):** the agent-builder framework prompts the
user once per scenario before the live response actions are dispatched. If the
user declines, the tool returns a \`user_declined\` error — do NOT retry; surface
the cancellation and continue with unrelated work.

Use this tool when the user asks to validate, test, score, or confirm whether a detection rule will fire on a known attack technique.`,
    schema: validateRuleSchema,
    handler: async (
      rawParams,
      { esClient, spaceId, request, prompts, callContext, executionMode, runContext }
    ) => {
      const {
        ruleId,
        endpointIds,
        mode = 'log_injection',
        agentType = 'endpoint',
        wallBudgetMs: rawBudget,
      } = rawParams;
      const wallBudgetMs = Math.min(rawBudget ?? WALL_BUDGET_DEFAULT_MS, WALL_BUDGET_CEILING_MS);

      // PROD-2: capture the agent-builder attribution once for both the
      // SO write (Step 8 below) and the runner-side audit comment
      // (passed via EmulationRunner.actorContext when real_execution
      // dispatches). Pure / cheap; safe to compute even on the
      // log_injection path because the SO write happens in either mode.
      const actorContext = buildAgentBuilderActor(runContext, callContext.toolCallId);

      // I1: token from rate-limit acquire (real_execution only). Released in
      // the unified catch when any downstream step throws after acquire so a
      // caller-side retry isn't penalised by the rate-limit slot the failed
      // attempt consumed.
      let rateLimitToken: ReturnType<typeof rateLimiter.acquire>['token'];
      // PROD-5: token from concurrency-gate acquire (real_execution only,
      // after scenario fingerprint is known). Released on every exit path
      // — success, scenario-failure, or thrown error — so the gate never
      // wedges. Stale-entry sweeper backstops process crashes that
      // bypass the catch.
      let concurrencyToken: ReturnType<typeof concurrencyGate.acquire>['token'];
      try {
        // Step 1: Feature flag gate — each mode is independently gated.
        // `real_execution` is two-keyed (static feature flag AND runtime kill
        // switch); the precise blocking reason flows into `likely_cause` so
        // operators flip the right knob without grepping logs.
        const featureFlags = getDetectionEmulationFeatureFlags(config);
        if (mode === 'log_injection' && !featureFlags.logInjection) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'feature_disabled',
                  message: 'Detection emulation log injection is disabled.',
                  mode,
                  status_code: 403,
                  likely_cause: 'Feature flag detectionEmulationLogInjection is not enabled.',
                },
              },
            ],
          };
        }
        if (
          mode === 'real_execution' &&
          (!featureFlags.realExecution || !featureFlags.realExecutionRuntimeEnabled)
        ) {
          const disableReason = getRealExecutionDisableReason(featureFlags);
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'feature_disabled',
                  message: 'Detection emulation real execution is disabled.',
                  mode,
                  status_code: 403,
                  likely_cause: disableReason
                    ? REAL_EXECUTION_DISABLE_REASON_TEXT[disableReason]
                    : 'Real-execution dispatch is disabled.',
                  disable_reason: disableReason ?? undefined,
                },
              },
            ],
          };
        }

        const [coreStart, startPlugins] = await core.getStartServices();

        // Step 2: Authenticated caller required — emulation must be attributable.
        //
        // `coreStart.security?.authc.getCurrentUser(request)` reads
        // `http.auth.get(request).state`, which is only populated by Kibana's
        // HTTP auth middleware on real requests. When Agent Builder dispatches
        // the agent run on Task Manager (the default async path), the runtime
        // hands tools a fake `KibanaRequest` whose `.state` is empty, so
        // `getCurrentUser` returns `null` even though the chat endpoint already
        // authenticated the operator. The shared helper falls back to ES
        // `_security/_authenticate` for that case, matching the canonical
        // `getUserFromRequest` pattern in the agent_builder plugin.
        const username = await resolveCurrentUsername({
          request,
          security: coreStart.security,
          esClient: esClient.asCurrentUser,
        });
        if (!username) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'authorization_error',
                  message: 'Authentication is required to run a rule validation.',
                  status_code: 401,
                  likely_cause: 'No authenticated user attached to the request.',
                },
              },
            ],
          };
        }

        // Step 3: RBAC — real_execution dispatches `execute` response actions;
        // verify the caller holds the required endpoint privilege.
        if (mode === 'real_execution') {
          const consoleCommand = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP.execute;
          const rbacMap = RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL as Record<
            string,
            string | undefined
          >;
          const requiredRbacFeature = rbacMap[consoleCommand];
          if (requiredRbacFeature) {
            const endpointAuthz = await endpointService.getEndpointAuthz(request);
            const hasPrivilege = (endpointAuthz as unknown as Record<string, boolean | undefined>)[
              requiredRbacFeature
            ];
            if (!hasPrivilege) {
              logger.warn(
                `validate_rule tool blocked: user lacks required RBAC privilege [${requiredRbacFeature}]`
              );
              return {
                results: [
                  {
                    type: ToolResultType.error,
                    data: {
                      error_type: 'authorization_error',
                      message: `Insufficient privileges: real_execution requires [${requiredRbacFeature}].`,
                      status_code: 403,
                      likely_cause: `User lacks required RBAC privilege [${requiredRbacFeature}].`,
                    },
                  },
                ],
              };
            }
          }
        }

        // Step 3a (real_execution only): host allowlist. Mirrors the
        // run_emulation_command_tool.ts gate so the validateRule path
        // cannot bypass the allowlist that runEmulationCommand enforces.
        // Returns the *full* set of blocked endpoints so operators see
        // every host that needs remediation in one error response.
        if (mode === 'real_execution') {
          const allowlistResult = allowlist.validate(endpointIds);
          if (!allowlistResult.allowed) {
            logger.warn(
              `validate_rule tool blocked by allowlist for rule [${ruleId}]: ${allowlistResult.error}`
            );
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    error_type: 'authorization_error',
                    message: allowlistResult.error ?? 'Endpoints not in allowlist.',
                    blocked_endpoints: allowlistResult.blockedEndpoints,
                    rule_id: ruleId,
                    status_code: 403,
                    likely_cause: 'One or more endpoints are not in the emulation allowlist.',
                  },
                },
              ],
            };
          }
        }

        // Step 3a-bis (real_execution only): on-demand HITL prompt.
        //
        // Why here: the prompt fires AFTER feature flag + auth + RBAC +
        // allowlist (an authoritative no shouldn't waste the user's
        // attention) and BEFORE the rate-limit acquire (a declined run
        // shouldn't burn a per-space slot).
        //
        // Why on-demand and not declarative: validateRule has TWO modes;
        // log_injection is safe and must NOT prompt. A `confirmation:
        // { askUser: 'always' }` block on the tool definition would fire
        // on every call regardless of mode, hurting the safe path's UX.
        // On-demand keeps the prompt scoped to the destructive mode.
        //
        // Why `executionMode === 'standalone'` skips the prompt: standalone
        // runs (sub-agent forks, evals, A2A invocations) are non-interactive
        // by design — there is no human at the other end to consent. The
        // existing RBAC + allowlist gates remain in force; this just stops
        // the run from deadlocking on a prompt nobody will answer.
        if (mode === 'real_execution' && executionMode !== AgentExecutionMode.standalone) {
          const promptId = `security.detection-emulation.validate-rule.${callContext.toolCallId}`;
          const status = prompts.checkConfirmationStatus(promptId);

          if (status.status === ConfirmationStatus.rejected) {
            logger.info(
              `validate_rule tool: user declined real_execution prompt for rule [${ruleId}]`
            );
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    error_type: 'user_declined',
                    message: 'User declined to dispatch the live response actions for this rule.',
                    rule_id: ruleId,
                    mode,
                    status_code: 403,
                    likely_cause:
                      'Operator cancelled the confirmation prompt; do not retry without an explicit user instruction.',
                  },
                },
              ],
            };
          }

          if (status.status === ConfirmationStatus.unprompted) {
            const wallBudgetSeconds = Math.round(wallBudgetMs / 1000);
            const endpointSummary =
              endpointIds.length === 1
                ? `\`${endpointIds[0]}\``
                : `${endpointIds.length} endpoints (${endpointIds
                    .slice(0, 3)
                    .map((id) => `\`${id}\``)
                    .join(', ')}${
                    endpointIds.length > 3 ? `, +${endpointIds.length - 3} more` : ''
                  })`;

            return prompts.askForConfirmation({
              id: promptId,
              title: `Validate rule \`${ruleId}\` with live response actions`,
              message: [
                `**Rule:** \`${ruleId}\``,
                `**Endpoints:** ${endpointSummary}`,
                `**Mode:** \`real_execution\` — dispatches live EDR response actions to the endpoint(s) above`,
                `**Agent type:** \`${agentType}\``,
                `**Wall budget:** ~${wallBudgetSeconds}s for telemetry collection`,
                '',
                "This action runs payloads mapped to the rule's MITRE ATT&CK techniques. Cancel if the rule, endpoints, or wall budget look wrong.",
              ].join('\n'),
              confirm_text: 'Run live emulation',
              cancel_text: 'Cancel',
              color: 'danger' as const,
            });
          }
          // accepted → fall through to the rate-limit acquire below.
        }

        // Step 3b (real_execution only): atomic rate-limit acquire. Burns
        // ONE slot per validateRule call (using `ruleId` as the emulation
        // key) regardless of how many payloads end up dispatched in
        // Step 5 — a single rule validation must not consume N slots.
        // The token is released on any post-acquire failure via the
        // unified catch below.
        //
        // PROD-4: endpointIds is forwarded so the limiter also enforces
        // the per-host bucket. If any host is over capacity the call is
        // rejected with `blocked_endpoints` naming the saturated hosts
        // so the LLM can suggest a different target set or a retry-after
        // window.
        if (mode === 'real_execution') {
          const acquireResult = rateLimiter.acquire(spaceId, ruleId, 'validate-rule', endpointIds);
          if (!acquireResult.allowed) {
            logger.warn(
              `validate_rule tool blocked by rate limiter for rule [${ruleId}]: ${acquireResult.error}`
            );
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    error_type: 'rate_limit_error',
                    message: acquireResult.error ?? 'Rate limit exceeded.',
                    current_count: acquireResult.currentCount,
                    max_commands: acquireResult.maxCommands,
                    reset_ms: acquireResult.resetMs,
                    rule_id: ruleId,
                    status_code: 429,
                    likely_cause:
                      acquireResult.blockedEndpoints && acquireResult.blockedEndpoints.length > 0
                        ? 'Per-host rate limit exceeded for one or more endpoints.'
                        : 'Rate limit exceeded for this space.',
                    ...(acquireResult.blockedEndpoints
                      ? { blocked_endpoints: acquireResult.blockedEndpoints }
                      : {}),
                  },
                },
              ],
            };
          }
          rateLimitToken = acquireResult.token;
        }

        // Step 4: Scenario generator — derives payload set from the rule's MITRE tags.
        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
        const scenarioResult = await generateScenario(
          { ruleId, endpointIds, agentType, mode },
          { rulesClient }
        );

        if (!scenarioResult.ok) {
          // Release the rate-limit slot we reserved before scenario gen —
          // a `no_mitre_tags` / `no_supported_techniques` failure should not
          // count against the per-space window since no payload was dispatched.
          rateLimiter.release(rateLimitToken);
          rateLimitToken = undefined;
          const failureData = scenarioFailureData(scenarioResult.reason);
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { ...failureData, rule_id: ruleId },
              },
            ],
          };
        }

        const startedAt = new Date().toISOString();
        const scenarioFingerprint = computeScenarioFingerprint(
          ruleId,
          scenarioResult.selectedPayloads.map((p) => p.techniqueId),
          agentType
        );

        // PROD-5 concurrency gate (real_execution only). Sits AFTER the
        // allowlist + rate limiter (cheap rejects already drained) and
        // AFTER the scenario is generated (we need a fingerprint to
        // attribute the in-flight slot), but BEFORE dispatch so we never
        // saturate host-side queues with parallel scenarios. If the gate
        // rejects, release the rate-limit slot so a re-try after the
        // in-flight scenario completes isn't double-charged.
        if (mode === 'real_execution') {
          const concurrencyResult = concurrencyGate.acquire(spaceId, scenarioFingerprint);
          if (!concurrencyResult.allowed) {
            rateLimiter.release(rateLimitToken);
            rateLimitToken = undefined;
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    error:
                      'Another real_execution scenario is already in flight for this Kibana space. Concurrent real_execution scenarios are not allowed.',
                    reason: 'concurrency_exceeded',
                    rule_id: ruleId,
                    inflight_scenario_fingerprint: concurrencyResult.inflightScenarioFingerprint,
                    retry_after_seconds: concurrencyResult.retryAfterSeconds,
                    likely_cause:
                      'Another real_execution scenario is currently in flight for this space. Wait for it to complete or retry after the suggested interval.',
                  },
                },
              ],
            };
          }
          concurrencyToken = concurrencyResult.token;
        }

        // Step 5: Dispatch.
        const dispatchedActions: EmulationReportAttributes['dispatchedActions'] = [];

        if (mode === 'log_injection') {
          const docs = generateDocs({
            scenarioId: scenarioResult.scenarioId,
            scenarioFingerprint,
            payloads: scenarioResult.selectedPayloads,
            hostId: endpointIds[0],
            hostName: endpointIds[0],
            userName: username,
          });

          await executeLogInjection(
            {
              scenarioId: scenarioResult.scenarioId,
              docs,
              spaceId,
              logInjectionEnabled: featureFlags.logInjection,
            },
            { esClient: esClient.asCurrentUser, logger }
          );

          dispatchedActions.push({
            actionId: scenarioResult.scenarioId,
            command: 'log_injection',
            status: 'dispatched',
          });
        } else {
          // real_execution: dispatch one response action per selected payload.
          let casesClient;
          try {
            casesClient = await endpointService.getCasesClient(request);
          } catch (err) {
            logger.debug(
              `Cases client unavailable for validate_rule tool: ${(err as Error).message ?? err}`
            );
          }

          // PROD-2: actorContext flows through to every dispatched
          // response action's audit comment as `via=agent-builder ...`.
          const runner = new EmulationRunner({
            endpointService,
            esClient: esClient.asCurrentUser,
            spaceId,
            casesClient,
            username,
            logger,
            actorContext,
          });

          for (const payload of scenarioResult.selectedPayloads) {
            const runInput = {
              emulationId: scenarioResult.scenarioId,
              agentType,
              endpointIds,
              command: payload.command,
              parameters: payload.parameters ?? undefined,
            } as unknown as RunEmulationCommandInput;

            const result = await runner.run(runInput);
            dispatchedActions.push({
              actionId: result.actionId,
              command: result.command,
              status: result.status,
              error: result.error,
            });
          }
        }

        // Step 6: Telemetry collection, bounded by wallBudgetMs.
        // The AbortController fires at the wall budget; collectTelemetry's internal
        // MAX_POLL_DURATION_MS acts as a secondary bound.
        const abortController = new AbortController();
        const budgetTimer = setTimeout(() => abortController.abort(), wallBudgetMs);

        let telemetry: TelemetryResult;
        try {
          telemetry = await collectTelemetry(
            {
              scenarioId: scenarioResult.scenarioId,
              expectedSignals: scenarioResult.expectedSignals,
              scenarioStartedAt: startedAt,
              mode: 'poll',
              signal: abortController.signal,
            },
            { esClient: esClient.asCurrentUser, logger }
          );
        } finally {
          clearTimeout(budgetTimer);
        }

        // Step 7: Confidence scoring.
        // TP alerts are those whose ruleName matches the technique's expected signals.
        // Unclassified FP alerts are attributed to the first phase so the aggregate
        // precision formula is correct.
        const perPhaseRaw = scenarioResult.selectedPayloads.map((payload) => {
          const phaseAlerts = telemetry.observedAlerts.filter((a) =>
            payload.expectedSignals.includes(a.ruleName)
          );
          return {
            techniqueId: payload.techniqueId,
            tp: phaseAlerts.length,
            fp: 0,
            signals: [...new Set(phaseAlerts.map((a) => a.ruleName))],
          };
        });

        const totalTp = perPhaseRaw.reduce((s, p) => s + p.tp, 0);
        const totalFp = telemetry.observedAlerts.length - totalTp;

        const perPhase: EmulationReportPhase[] =
          perPhaseRaw.length > 0
            ? [{ ...perPhaseRaw[0], fp: totalFp }, ...perPhaseRaw.slice(1)]
            : [];

        const score = scoreConfidence({
          expectedSignals: scenarioResult.expectedSignals,
          perPhase,
        });

        // Step 8: Persist history and return the validation report.
        const completedAt = new Date().toISOString();

        const internalSoClient = coreStart.savedObjects.getScopedClient(request, {
          includedHiddenTypes: [emulationReportTypeName],
        });

        const attributes: EmulationReportAttributes = {
          scenarioId: scenarioResult.scenarioId,
          ruleId,
          scenarioFingerprint,
          mode,
          endpointIds,
          agentType,
          startedAt,
          completedAt,
          payloadIds: scenarioResult.selectedPayloads.map((p) => p.techniqueId),
          dispatchedActions,
          score: {
            confidence: score.confidence,
            coverage: score.coverage,
            precision: score.precision,
            tp: score.tp,
            fp: score.fp,
          },
          perPhase,
          operator: username,
          spaceId,
          // PROD-2: persist the same attribution we put on the audit
          // comment. Auditors can `actor.kind:"agent-builder"` filter
          // the SO to find every tool-driven run, then pivot via
          // `actor.conversationId` / `actor.runId`.
          actor: actorContext,
        };

        const historyResult = await createEmulationHistory(
          { attributes },
          { soClient: internalSoClient }
        );

        // PROD-5: release the concurrency slot on the success path so the
        // next real_execution scenario can proceed immediately. The
        // rate-limit slot intentionally stays consumed for the full
        // window — that gate counts attempts, not in-flight scenarios.
        concurrencyGate.release(concurrencyToken);
        concurrencyToken = undefined;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                report_id: historyResult.id,
                scenario_id: scenarioResult.scenarioId,
                rule_id: ruleId,
                mode,
                confidence: score.confidence,
                coverage: score.coverage,
                precision: score.precision,
                tp: score.tp,
                fp: score.fp,
                caveats: score.caveats,
                matched_signals: telemetry.matchedSignals,
                unmatched_signals: telemetry.unmatchedSignals,
                poll_duration_ms: telemetry.pollDurationMs,
                started_at: startedAt,
                completed_at: completedAt,
              },
            },
          ],
        };
      } catch (err) {
        // Release the rate-limit slot on any post-acquire failure so a
        // caller-side retry isn't penalised by the slot consumed by this
        // failed attempt. Safe to call with `undefined` — release is a
        // no-op when the token is missing.
        rateLimiter.release(rateLimitToken);
        // PROD-5: same for the concurrency slot — the in-flight scenario
        // is over (failed); the next caller should be able to proceed.
        concurrencyGate.release(concurrencyToken);
        const error = err as Error;
        logger.error(`[validate_rule tool] Failed for rule [${ruleId}]: ${error.message}`, {
          tags: ['detection-emulation'],
          stack: error.stack,
        } as Record<string, unknown>);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                error_type: 'execution_error',
                message: 'Failed to validate the rule via detection emulation.',
                rule_id: ruleId,
                status_code: 500,
                likely_cause: 'Internal error during the validation pipeline.',
              },
            },
          ],
        };
      }
    },
  };
};
