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
import type { RunEmulationCommandInput } from '../../../../common/detection_emulation/schemas';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import {
  generateScenario,
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
import type { DetectionEmulationGuardrails } from '../../../lib/detection_emulation/execution/shared_guardrails';
import { buildAgentBuilderActor } from '../../../lib/detection_emulation/execution/audit_context';
import { createTracedLogger } from '../../../lib/detection_emulation/execution/traced_logger';
import { PipelineStepError, runStep } from '../../../lib/detection_emulation/execution/pipeline_step_error';
import type { ToolFactoryDeps } from '../../../lib/detection_emulation/execution/tool_factory_deps';
import {
  checkModeFeatureFlags,
  checkAuth,
  checkRbac,
  checkAllowlist,
  acquireRateLimit,
  resolveEffectiveConfig,
} from '../../../lib/detection_emulation/execution/gate_checks';
import { resolveCurrentUsername } from '../../../lib/detection_emulation/resolve_current_user';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
} from '../../../../common/endpoint/service/response_actions/constants';
import { validateRuleSchema } from './validate_rule_input';
import { toolError, type EmulationErrorContext } from './emulation_tool_errors';

// ─── Constants ────────────────────────────────────────────────────────────────

const WALL_BUDGET_DEFAULT_MS = 120_000;
/** Server-side ceiling: 5 minutes. */
const WALL_BUDGET_CEILING_MS = 300_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const computeScenarioFingerprint = (
  ruleId: string,
  payloadIds: string[],
  agentType: string
): string => {
  const serialized = JSON.stringify({ ruleId, payloadIds: [...payloadIds].sort(), agentType });
  return createHash('sha256').update(serialized).digest('hex');
};

// ─── Tool ─────────────────────────────────────────────────────────────────────



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
  deps: ToolFactoryDeps
): BuiltinSkillBoundedTool<typeof validateRuleSchema> => {
  const { core, endpointService, config, logger, guardrails } = deps;
  const { allowlist, rateLimiter, concurrencyGate } = guardrails;

  return {
    id: 'security.detection-emulation.validate-rule',
    type: ToolType.builtin,
    description: `Validate a detection rule by dispatching MITRE ATT&CK payloads and scoring whether it fires.

Modes: \`log_injection\` (default, safe — synthetic ECS docs, no real endpoints touched) or \`real_execution\` (live response actions, requires RBAC + feature flag + user confirmation).

Returns: \`confidence\` (0–1), \`coverage\`, \`precision\`, \`tp\`, \`fp\`, \`matched_signals\`, \`unmatched_signals\`, \`report_id\`, \`caveats\`.

Fails with \`no_mitre_tags\` or \`no_supported_techniques\` if the rule has no emulable techniques. On \`user_declined\`, do NOT retry.`,
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

      // ── Execution-scoped traced logger (PR #260793 pattern) ─────────
      const log = createTracedLogger(logger, {
        tool: 'validate-rule',
        entityId: ruleId,
        mode,
      });

      const actorContext = buildAgentBuilderActor(runContext, callContext.toolCallId);
      const errCtx: EmulationErrorContext = { rule_id: ruleId, mode };

      let rateLimitToken: ReturnType<typeof rateLimiter.acquire>['token'];
      let concurrencyToken: ReturnType<typeof concurrencyGate.acquire>['token'];
      try {
        // Step 1: Feature flag gate (uses shared gate_checks)
        const ffResult = checkModeFeatureFlags(config, mode);
        if (!ffResult.ok) {
          return toolError.featureDisabled(errCtx, {
            message: ffResult.message,
            likelyCause: (ffResult.extra?.likely_cause as string) ?? 'Feature disabled',
            disableReason: ffResult.extra?.disable_reason as string | undefined,
          });
        }

        const [coreStart, startPlugins] = await core.getStartServices();

        // Step 2: Authenticated caller required (uses shared gate_checks)
        const authResult = await checkAuth(resolveCurrentUsername, {
          request,
          security: coreStart.security,
          esClient: esClient.asCurrentUser,
        });
        if (!authResult.ok) {
          return toolError.authenticationRequired(errCtx);
        }
        const username = authResult.value.username;

        // Step 3: RBAC — real_execution dispatches `execute` response actions.
        if (mode === 'real_execution') {
          const rbacResult = await checkRbac(
            endpointService,
            request,
            esClient.asCurrentUser,
            RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP.execute
          );
          if (!rbacResult.ok) {
            log.warn(`RBAC blocked: ${rbacResult.message}`);
            return toolError.authorizationError(errCtx, {
              message: rbacResult.message,
              likelyCause: (rbacResult.extra?.likely_cause as string) ?? 'RBAC check failed',
            });
          }
        }

        // Per-request resolution of operator-tunable guardrails.
        let effectiveAllowlist: Awaited<ReturnType<typeof resolveEffectiveConfig>>['effectiveAllowlist'] | undefined;
        let effectiveRateLimiter: Awaited<ReturnType<typeof resolveEffectiveConfig>>['effectiveRateLimiter'] | undefined;
        if (mode === 'real_execution') {
          const soClient = coreStart.savedObjects.getScopedClient(request);
          const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
          const resolved = await resolveEffectiveConfig({
            uiSettingsClient,
            config,
            logger,
            rateLimiterConfig: rateLimiter.getConfig(),
          });
          effectiveAllowlist = resolved.effectiveAllowlist;
          effectiveRateLimiter = resolved.effectiveRateLimiter;
        }

        // Step 3a (real_execution only): host allowlist (uses shared gate_checks).
        if (mode === 'real_execution') {
          const allowlistResult = checkAllowlist(allowlist, endpointIds, effectiveAllowlist!);
          if (!allowlistResult.ok) {
            log.warn(`Allowlist blocked: ${allowlistResult.message}`);
            return toolError.authorizationError(errCtx, {
              message: allowlistResult.message,
              likelyCause: (allowlistResult.extra?.likely_cause as string) ?? 'Allowlist check failed',
              blockedEndpoints: allowlistResult.extra?.blocked_endpoints as string[] | undefined,
            });
          }
        }

        // Step 3a-bis (real_execution only): on-demand HITL prompt.
        if (mode === 'real_execution' && executionMode !== AgentExecutionMode.standalone) {
          const promptId = `security.detection-emulation.validate-rule.${callContext.toolCallId}`;
          const status = prompts.checkConfirmationStatus(promptId);

          if (status.status === ConfirmationStatus.rejected) {
            log.info('User declined real_execution prompt');
            return toolError.userDeclined(errCtx);
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

        // Step 3b (real_execution only): atomic rate-limit acquire (uses shared gate_checks).
        if (mode === 'real_execution') {
          const rlResult = acquireRateLimit(
            rateLimiter,
            spaceId,
            ruleId,
            'validate-rule',
            endpointIds,
            effectiveRateLimiter
          );
          if (!rlResult.ok) {
            log.warn(`Rate limiter blocked: ${rlResult.message}`);
            return toolError.rateLimitExceeded(errCtx, {
              error: rlResult.message,
              currentCount: rlResult.extra?.current_count as number | undefined,
              maxCommands: rlResult.extra?.max_commands as number | undefined,
              resetMs: rlResult.extra?.reset_ms as number | undefined,
              blockedEndpoints: rlResult.extra?.blocked_endpoints as string[] | undefined,
            });
          }
          rateLimitToken = rlResult.value.token;
        }

        // ── Pipeline steps 4–8 wrapped with runStep (PR #260793 pattern) ──

        // Step 4: Scenario generation from MITRE ATT&CK tags.
        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
        const scenarioResult = await runStep('scenario_generation', 4, async () => {
          const result = await generateScenario(
            { ruleId, endpointIds, agentType, mode },
            { rulesClient }
          );
          return result;
        });

        if (!scenarioResult.ok) {
          rateLimiter.release(rateLimitToken);
          rateLimitToken = undefined;
          return toolError.scenarioFailure(errCtx, scenarioResult.reason);
        }

        const startedAt = new Date().toISOString();
        const scenarioFingerprint = computeScenarioFingerprint(
          ruleId,
          scenarioResult.selectedPayloads.map((p) => p.techniqueId),
          agentType
        );

        // PROD-5 concurrency gate (real_execution only).
        if (mode === 'real_execution') {
          const concurrencyResult = concurrencyGate.acquire(spaceId, scenarioFingerprint);
          if (!concurrencyResult.allowed) {
            rateLimiter.release(rateLimitToken);
            rateLimitToken = undefined;
            return toolError.concurrencyExceeded(errCtx, {
              inflightScenarioFingerprint: concurrencyResult.inflightScenarioFingerprint,
              retryAfterSeconds: concurrencyResult.retryAfterSeconds,
            });
          }
          concurrencyToken = concurrencyResult.token;
        }

        // Step 5: Dispatch.
        const dispatchedActions: EmulationReportAttributes['dispatchedActions'] = [];

        await runStep('dispatch', 5, async () => {
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
                // Step 1 already verified logInjection is enabled via checkModeFeatureFlags.
                logInjectionEnabled: true,
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
              log.debug(
                `Cases client unavailable: ${(err as Error).message ?? err}`
              );
            }

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
        });

        // Step 6: Telemetry collection, bounded by wallBudgetMs.
        const telemetry = await runStep('telemetry_collection', 6, async () => {
          const abortController = new AbortController();
          const budgetTimer = setTimeout(() => abortController.abort(), wallBudgetMs);

          try {
            return await collectTelemetry(
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
        });

        // Step 7: Confidence scoring.
        const { score, perPhase } = await runStep('confidence_scoring', 7, async () => {
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

          const phases: EmulationReportPhase[] =
            perPhaseRaw.length > 0
              ? [{ ...perPhaseRaw[0], fp: totalFp }, ...perPhaseRaw.slice(1)]
              : [];

          const scoreResult = scoreConfidence({
            expectedSignals: scenarioResult.expectedSignals,
            perPhase: phases,
          });

          return { score: scoreResult, perPhase: phases };
        });

        // Step 8: Persist history and return the validation report.
        const completedAt = new Date().toISOString();

        const historyResult = await runStep('history_write', 8, async () => {
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
            actor: actorContext,
          };

          return createEmulationHistory(
            { attributes },
            { soClient: internalSoClient }
          );
        });

        // PROD-5: release the concurrency slot on the success path.
        concurrencyGate.release(concurrencyToken);
        concurrencyToken = undefined;

        log.info(
          `Pipeline complete — confidence=${score.confidence}, tp=${score.tp}, fp=${score.fp}, report=${historyResult.id}`
        );

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
        rateLimiter.release(rateLimitToken);
        concurrencyGate.release(concurrencyToken);

        // PipelineStepError carries structured metadata — log it so
        // operators can correlate failures to specific steps and see
        // wall-clock duration at the point of failure (PR #260793).
        if (err instanceof PipelineStepError) {
          const meta = err.toMeta();
          log.error(
            `Step [${meta.step}] failed after ${meta.durationMs}ms: ${(err.cause as Error)?.message ?? err.message}`,
            { tags: ['detection-emulation', 'pipeline-step-error'], ...meta } as Record<string, unknown>
          );
        } else {
          const error = err as Error;
          log.error(`Pipeline failed: ${error.message}`, {
            tags: ['detection-emulation'],
            stack: error.stack,
          } as Record<string, unknown>);
        }

        return toolError.executionError(errCtx, {
          message: 'Failed to validate the rule via detection emulation.',
          likelyCause: 'Internal error during the validation pipeline.',
        });
      }
    },
  };
};
