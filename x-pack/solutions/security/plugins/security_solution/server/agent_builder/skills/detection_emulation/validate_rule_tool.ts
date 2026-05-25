/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/core/server';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getDetectionEmulationFeatureFlags } from '../../../lib/detection_emulation/feature_flag';
import { generateScenario } from '../../../lib/detection_emulation/scenario_generator';
import { generateDocs } from '../../../lib/detection_emulation/log_injection/generator';
import { executeLogInjection } from '../../../lib/detection_emulation/log_injection/executor';
import {
  collectTelemetry,
  type TelemetryResult,
} from '../../../lib/detection_emulation/telemetry_collector';
import { validateRuleSchema } from './validate_rule_input';
import { toolError, type EmulationErrorContext } from './emulation_tool_errors';

const WALL_BUDGET_DEFAULT_MS = 120_000;
const WALL_BUDGET_CEILING_MS = 300_000;

const computeScenarioFingerprint = (
  ruleId: string,
  payloadIds: string[],
  agentType: string
): string => {
  const serialized = JSON.stringify({ ruleId, payloadIds: [...payloadIds].sort(), agentType });
  return createHash('sha256').update(serialized).digest('hex');
};

export interface ValidateRuleToolDeps {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: Logger;
}

export const createValidateRuleTool = (
  deps: ValidateRuleToolDeps
): BuiltinSkillBoundedTool<typeof validateRuleSchema> => {
  const { core, config, logger } = deps;

  return {
    id: 'security.detection-emulation.validate-rule',
    type: ToolType.builtin,
    description: `Validate a detection rule by dispatching MITRE ATT&CK payloads via log injection and scoring whether it fires.

Mode: \`log_injection\` — synthesises ECS documents, no real endpoints touched.

Returns: \`tp\`, \`fp\`, \`matched_signals\`, \`unmatched_signals\`, \`poll_duration_ms\`.

Fails with \`no_mitre_tags\` or \`no_supported_techniques\` if the rule has no emulable techniques.`,
    schema: validateRuleSchema,
    handler: async (rawParams, { esClient, spaceId, request }) => {
      const {
        ruleId,
        endpointIds,
        mode = 'log_injection',
        agentType = 'endpoint',
        wallBudgetMs: rawBudget,
      } = rawParams;
      const wallBudgetMs = Math.min(rawBudget ?? WALL_BUDGET_DEFAULT_MS, WALL_BUDGET_CEILING_MS);

      const errCtx: EmulationErrorContext = { rule_id: ruleId, mode };

      try {
        const featureFlags = getDetectionEmulationFeatureFlags(config);
        if (mode === 'log_injection' && !featureFlags.logInjection) {
          return toolError.featureDisabled(errCtx, {
            message: 'Detection emulation log injection is disabled.',
            likelyCause: 'Feature flag detectionEmulationLogInjection is not enabled.',
          });
        }
        if (mode === 'real_execution') {
          return toolError.featureDisabled(errCtx, {
            message: 'Real execution mode is not available in this version.',
            likelyCause: 'Real execution support has not been enabled yet.',
          });
        }

        const [coreStart, startPlugins] = await core.getStartServices();

        const currentUser = coreStart.security?.authc.getCurrentUser(request);
        const username = currentUser?.username ?? 'unknown';

        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
        const scenarioResult = await generateScenario(
          { ruleId, endpointIds, agentType, mode },
          { rulesClient }
        );

        if (!scenarioResult.ok) {
          return toolError.scenarioFailure(errCtx, scenarioResult.reason);
        }

        const startedAt = new Date().toISOString();
        const scenarioFingerprint = computeScenarioFingerprint(
          ruleId,
          scenarioResult.selectedPayloads.map((p) => p.techniqueId),
          agentType
        );

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

        const perPhaseRaw = scenarioResult.selectedPayloads.map((payload) => {
          const phaseAlerts = telemetry.observedAlerts.filter((a) =>
            payload.expectedSignals.includes(a.ruleName)
          );
          return {
            techniqueId: payload.techniqueId,
            tp: phaseAlerts.length,
            fp: 0,
          };
        });

        const totalTp = perPhaseRaw.reduce((s, p) => s + p.tp, 0);
        const totalFp = telemetry.observedAlerts.length - totalTp;
        const completedAt = new Date().toISOString();

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                scenario_id: scenarioResult.scenarioId,
                rule_id: ruleId,
                mode,
                tp: totalTp,
                fp: totalFp,
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
        const error = err as Error;
        logger.error(`[validate_rule tool] Failed for rule [${ruleId}]: ${error.message}`, {
          tags: ['detection-emulation'],
          stack: error.stack,
        } as Record<string, unknown>);
        return toolError.executionError(errCtx, {
          message: 'Failed to validate the rule via detection emulation.',
          likelyCause: 'Internal error during the validation pipeline.',
        });
      }
    },
  };
};
