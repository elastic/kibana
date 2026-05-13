/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DETECTION_ENGINE_EMULATION_VALIDATE_RULE_URL } from '../../../../../common/constants';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
} from '../../../../../common/endpoint/service/response_actions/constants';
import type { RunEmulationCommandInput } from '../../../../../common/detection_emulation/schemas';
import { ValidateRuleInputSchema } from '../../../../../common/detection_emulation/schemas';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { ConfigType } from '../../../../config';
import { buildSiemResponse } from '../../../detection_engine/routes/utils';
import { getDetectionEmulationFeatureFlags } from '../../feature_flag';
import { generateScenario } from '../../scenario_generator';
import type { GenerateScenarioFailureReason } from '../../scenario_generator';
import { generateDocs } from '../../log_injection/generator';
import { executeLogInjection } from '../../log_injection/executor';
import { collectTelemetry } from '../../telemetry_collector';
import type { TelemetryResult } from '../../telemetry_collector';
import { scoreConfidence } from '../../confidence_scorer';
import { createEmulationHistory } from '../../emulation_history';
import {
  emulationReportTypeName,
  type EmulationReportAttributes,
  type EmulationReportPhase,
} from '../../emulation_report_type';
import { EmulationRunner } from '../../execution/runner';
import { EmulationAllowlist, createAllowlistFromConfig } from '../../execution/allowlist';
import { EmulationRateLimiter, createDefaultRateLimiterConfig } from '../../execution/rate_limiter';
import {
  EmulationConcurrencyGate,
  createDefaultConcurrencyGateConfig,
} from '../../execution/concurrency_gate';

// ─── Constants ────────────────────────────────────────────────────────────────

const WALL_BUDGET_DEFAULT_MS = 120_000;
/** Server-side ceiling: 5 minutes. */
const WALL_BUDGET_CEILING_MS = 300_000;

const I18N_PREFIX = 'xpack.securitySolution.detectionEmulation.validateRule' as const;

const MESSAGES = {
  featureDisabled: i18n.translate(`${I18N_PREFIX}.featureDisabled`, {
    defaultMessage: 'Detection emulation is disabled for the requested mode.',
  }),
  authRequired: i18n.translate(`${I18N_PREFIX}.authRequired`, {
    defaultMessage: 'Authentication is required to run a rule validation.',
  }),
  insufficientPrivileges: (privilege: string) =>
    i18n.translate(`${I18N_PREFIX}.insufficientPrivileges`, {
      defaultMessage: 'Insufficient privileges: the command requires [{privilege}].',
      values: { privilege },
    }),
  ruleNotFound: i18n.translate(`${I18N_PREFIX}.ruleNotFound`, {
    defaultMessage: 'The specified rule was not found.',
  }),
  noMitreTags: i18n.translate(`${I18N_PREFIX}.noMitreTags`, {
    defaultMessage: 'The rule has no MITRE ATT&CK technique tags.',
  }),
  noSupportedTechniques: i18n.translate(`${I18N_PREFIX}.noSupportedTechniques`, {
    defaultMessage: "None of the rule's techniques have emulation payloads in the library.",
  }),
  endpointsNotInAllowlist: i18n.translate(`${I18N_PREFIX}.endpointsNotInAllowlist`, {
    defaultMessage: 'Endpoints not in allowlist.',
  }),
  rateLimitExceeded: i18n.translate(`${I18N_PREFIX}.rateLimitExceeded`, {
    defaultMessage: 'Rate limit exceeded.',
  }),
  concurrencyExceeded: i18n.translate(`${I18N_PREFIX}.concurrencyExceeded`, {
    defaultMessage:
      'Another real-execution emulation scenario is already in flight in this space. Wait for it to complete or retry after the suggested interval.',
  }),
  internalError: i18n.translate(`${I18N_PREFIX}.internalError`, {
    defaultMessage: 'Failed to validate the rule via detection emulation.',
  }),
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deterministic fingerprint for a (ruleId, payloadIds, agentType) triple.
 * Used by the history layer to deduplicate identical re-runs.
 */
const computeScenarioFingerprint = (
  ruleId: string,
  payloadIds: string[],
  agentType: string
): string => {
  const serialized = JSON.stringify({ ruleId, payloadIds: [...payloadIds].sort(), agentType });
  return createHash('sha256').update(serialized).digest('hex');
};

const mapScenarioFailure = (
  reason: GenerateScenarioFailureReason,
  siemResponse: ReturnType<typeof buildSiemResponse>,
  logger: Logger
): IKibanaResponse => {
  switch (reason) {
    case 'rule_not_found':
      return siemResponse.error({ statusCode: 404, body: MESSAGES.ruleNotFound });
    case 'no_mitre_tags':
      return siemResponse.error({ statusCode: 422, body: MESSAGES.noMitreTags });
    case 'no_supported_techniques':
      return siemResponse.error({ statusCode: 422, body: MESSAGES.noSupportedTechniques });
    default: {
      const _exhaustive: never = reason;
      void _exhaustive;
      logger.error(`Unhandled scenario failure reason: ${reason}`);
      return siemResponse.error({ statusCode: 500, body: MESSAGES.internalError });
    }
  }
};

// ─── Route ────────────────────────────────────────────────────────────────────

export const validateRuleRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger,
  {
    allowlist: allowlistOverride,
    rateLimiter: rateLimiterOverride,
    concurrencyGate: concurrencyGateOverride,
  }: {
    allowlist?: EmulationAllowlist;
    rateLimiter?: EmulationRateLimiter;
    concurrencyGate?: EmulationConcurrencyGate;
  } = {}
): void => {
  // Constructed once per route registration so the per-space rate window
  // is shared across requests. Test injection (`*Override`) lets the suite
  // exercise the blocking branches without standing up the full
  // config-loading pipeline. Mirrors run_command/route.ts wiring.
  const emulationConfig = config.detectionEmulation;

  // PROD-1: route now defaults to deny when no operator config is supplied.
  // The wiring is delegated to `createAllowlistFromConfig` so the route, the
  // run_command route, and the five Agent Builder tools all interpret the
  // operator config the same way — drift between them would mean some
  // surfaces default-allow while others default-deny.
  if (!allowlistOverride && !emulationConfig?.allowlist) {
    logger.warn(
      '[detection-emulation] validateRule route registered with NO operator allowlist (`xpack.securitySolution.detectionEmulation.allowlist`); default-deny is in effect — every real_execution request will be blocked until the allowlist is configured.'
    );
  }
  const allowlist =
    allowlistOverride ??
    new EmulationAllowlist(createAllowlistFromConfig(emulationConfig?.allowlist), logger);

  const rateLimiter =
    rateLimiterOverride ??
    new EmulationRateLimiter(
      emulationConfig?.rateLimiter ?? createDefaultRateLimiterConfig(),
      logger
    );

  // PROD-5: per-space concurrency gate. Limits real_execution validateRule
  // scenarios to one in-flight per space so a second multi-payload run
  // can't pile on top of the first and N-multiply host-side queue
  // pressure. Stale-entry sweeper auto-recovers from process crashes.
  const concurrencyGate =
    concurrencyGateOverride ??
    new EmulationConcurrencyGate(createDefaultConcurrencyGateConfig(), logger);

  router.versioned
    .post({
      path: DETECTION_ENGINE_EMULATION_VALIDATE_RULE_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        tags: ['oas-tag:emulation'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(ValidateRuleInputSchema),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        // I1: token from rate-limit acquire (real_execution only). Released
        // in the unified catch when any downstream step throws after acquire.
        let rateLimitToken: ReturnType<typeof rateLimiter.acquire>['token'];
        // PROD-5: token from concurrency-gate acquire (real_execution only,
        // after scenario fingerprint is known). Released on every exit
        // path — success, scenario-failure, or thrown error — so the gate
        // never wedges.
        let concurrencyToken: ReturnType<typeof concurrencyGate.acquire>['token'];
        try {
          const {
            ruleId,
            endpointIds,
            mode = 'log_injection',
            agentType = 'endpoint',
            wallBudgetMs: rawBudget,
          } = request.body;

          const wallBudgetMs = Math.min(
            rawBudget ?? WALL_BUDGET_DEFAULT_MS,
            WALL_BUDGET_CEILING_MS
          );

          // Step 1: Flag gate — each mode is independently gated.
          const featureFlags = getDetectionEmulationFeatureFlags(config.experimentalFeatures);
          if (mode === 'log_injection' && !featureFlags.logInjection) {
            return siemResponse.error({ statusCode: 403, body: MESSAGES.featureDisabled });
          }
          if (mode === 'real_execution' && !featureFlags.realExecution) {
            return siemResponse.error({ statusCode: 403, body: MESSAGES.featureDisabled });
          }

          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
          const coreContext = ctx.core;
          const securitySolution = ctx.securitySolution;

          // Step 2: Authenticated caller required — emulation must be attributable.
          const currentUser = coreContext.security?.authc.getCurrentUser();
          if (!currentUser?.username) {
            return siemResponse.error({ statusCode: 401, body: MESSAGES.authRequired });
          }

          const spaceId = securitySolution.getSpaceId();
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          // Step 3: RBAC — real_execution dispatches `execute` response actions;
          // verify the caller holds the required endpoint privilege.
          if (mode === 'real_execution') {
            const consoleCommand = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP.execute;
            const requiredAuthzKey =
              RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ[consoleCommand];
            if (requiredAuthzKey) {
              const endpointAuthz = await securitySolution.getEndpointAuthz();
              if (!endpointAuthz[requiredAuthzKey]) {
                return siemResponse.error({
                  statusCode: 403,
                  body: MESSAGES.insufficientPrivileges(requiredAuthzKey),
                });
              }
            }
          }

          // Step 3a (real_execution only): host allowlist. Mirrors the
          // run_command/route.ts gate so the validateRule REST path cannot
          // bypass the allowlist that runEmulationCommand enforces.
          // Returns the *full* set of blocked endpoints so operators see
          // every host that needs remediation in one error response.
          if (mode === 'real_execution') {
            const allowlistResult = allowlist.validate(endpointIds);
            if (!allowlistResult.allowed) {
              logger.warn(
                `[validate_rule] blocked by allowlist for rule [${ruleId}]: ${allowlistResult.error}`
              );
              return siemResponse.error({
                statusCode: 403,
                body: {
                  message: MESSAGES.endpointsNotInAllowlist,
                  blocked_endpoints: allowlistResult.blockedEndpoints,
                },
              });
            }
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
          // rejected before any reservation lands and `blocked_endpoints`
          // tells the operator which hosts are saturated.
          if (mode === 'real_execution') {
            const acquireResult = rateLimiter.acquire(
              spaceId,
              ruleId,
              'validate-rule',
              endpointIds
            );
            if (!acquireResult.allowed) {
              logger.warn(
                `[validate_rule] blocked by rate limiter for rule [${ruleId}]: ${acquireResult.error}`
              );
              return siemResponse.error({
                statusCode: 429,
                body: {
                  message: MESSAGES.rateLimitExceeded,
                  current_count: acquireResult.currentCount,
                  max_commands: acquireResult.maxCommands,
                  reset_ms: acquireResult.resetMs,
                  ...(acquireResult.blockedEndpoints
                    ? { blocked_endpoints: acquireResult.blockedEndpoints }
                    : {}),
                },
              });
            }
            rateLimitToken = acquireResult.token;
          }

          // Step 4: Scenario generator — derives payload set from the rule's MITRE tags.
          const rulesClient = await ctx.alerting.getRulesClient();
          const scenarioResult = await generateScenario(
            { ruleId, endpointIds, agentType, mode },
            { rulesClient }
          );

          if (!scenarioResult.ok) {
            // Release the rate-limit slot we reserved before scenario gen —
            // a `no_mitre_tags` / `no_supported_techniques` failure should
            // not count against the per-space window since no payload was
            // dispatched.
            rateLimiter.release(rateLimitToken);
            rateLimitToken = undefined;
            return mapScenarioFailure(scenarioResult.reason, siemResponse, logger);
          }

          const startedAt = new Date().toISOString();
          const scenarioFingerprint = computeScenarioFingerprint(
            ruleId,
            scenarioResult.selectedPayloads.map((p) => p.techniqueId),
            agentType
          );

          // Step 4b (real_execution only, PROD-5): concurrency gate.
          // Reserve the per-space slot now that we know the scenario
          // fingerprint, so a parallel call's rejection can name the
          // scenario it's contending with. Released on every exit path
          // below (success, telemetry-fail, thrown error) — try/finally
          // semantics via `concurrencyToken` + the unified catch.
          if (mode === 'real_execution') {
            const concurrencyResult = concurrencyGate.acquire(spaceId, scenarioFingerprint);
            if (!concurrencyResult.allowed) {
              // Release the rate-limit slot we reserved a few lines back —
              // a concurrency rejection should not penalise the per-space
              // window since no payload was dispatched.
              rateLimiter.release(rateLimitToken);
              rateLimitToken = undefined;
              logger.warn(
                `[validate_rule] blocked by concurrency gate for rule [${ruleId}]: ${concurrencyResult.error}`
              );
              return siemResponse.error({
                statusCode: 429,
                headers: concurrencyResult.retryAfterSeconds
                  ? { 'Retry-After': String(concurrencyResult.retryAfterSeconds) }
                  : undefined,
                body: {
                  message: MESSAGES.concurrencyExceeded,
                  reason: concurrencyResult.reason,
                  inflight_scenario_fingerprint: concurrencyResult.inflightScenarioFingerprint,
                  retry_after_seconds: concurrencyResult.retryAfterSeconds,
                },
              });
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
              userName: currentUser.username,
            });

            await executeLogInjection(
              {
                scenarioId: scenarioResult.scenarioId,
                docs,
                spaceId,
                logInjectionEnabled: featureFlags.logInjection,
              },
              { esClient, logger }
            );

            dispatchedActions.push({
              actionId: scenarioResult.scenarioId,
              command: 'log_injection',
              status: 'dispatched',
            });
          } else {
            // real_execution: dispatch one response action per selected payload.
            const endpointService = securitySolution.getEndpointService();

            let casesClient;
            try {
              casesClient = await endpointService.getCasesClient(request);
            } catch (err) {
              logger.debug(
                `Cases client unavailable for validate_rule: ${(err as Error).message ?? err}`
              );
            }

            // PROD-2: REST callers are direct human invocations
            // (Kibana UI, curl with personal API key, etc.). Tag the
            // audit comment with `kind: 'user'` so the SO + audit trail
            // distinguish them from agent-driven dispatches that go
            // through the Agent Builder tool.
            const runner = new EmulationRunner({
              endpointService,
              esClient,
              spaceId,
              casesClient,
              username: currentUser.username,
              logger,
              actorContext: { kind: 'user' },
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
          // 60 s MAX_POLL_DURATION_MS acts as a secondary bound.
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
              { esClient, logger }
            );
          } finally {
            clearTimeout(budgetTimer);
          }

          // Step 7: Confidence scoring.
          // Build perPhase: one EmulationReportPhase per selected payload technique.
          // TP alerts are those whose ruleName matches the technique's expected signals.
          // Unclassified FP alerts (none of the techniques claim them) are attributed
          // to the first phase so the aggregate precision formula is correct.
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

          // Step 8: Persist history and return ValidationReport.
          const completedAt = new Date().toISOString();

          const internalSoClient = coreContext.savedObjects.getClient({
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
            operator: currentUser.username,
            spaceId,
            // PROD-2: REST writes always carry actor.kind: 'user'.
            actor: { kind: 'user' },
          };

          const historyResult = await createEmulationHistory(
            { attributes },
            { soClient: internalSoClient }
          );

          // PROD-5: release the concurrency slot on the success path.
          // The catch block below covers every thrown failure path; this
          // explicit release covers the final, healthy return.
          concurrencyGate.release(concurrencyToken);
          concurrencyToken = undefined;

          return response.ok({
            body: {
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
          });
        } catch (err) {
          // Release the rate-limit slot on any post-acquire failure so a
          // caller-side retry isn't penalised by the slot consumed by this
          // failed attempt. Safe to call with `undefined` — release is a
          // no-op when the token is missing.
          rateLimiter.release(rateLimitToken);
          // PROD-5: release the concurrency slot on every error path so
          // a thrown scenario doesn't wedge the gate. The stale sweeper
          // is a fallback for process crashes that bypass this catch
          // (the in-process catch will always fire for thrown errors).
          concurrencyGate.release(concurrencyToken);
          const error = transformError(err);
          logger.error(`[validate_rule] ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: MESSAGES.internalError,
          });
        }
      }
    );
};
