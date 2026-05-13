/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { GENERALIZE_FROM_TELEMETRY_API_PATH, THREAT_INTEL_TOOL_IDS } from '../../../common';
import { generalizeFromTelemetry } from '../../services';

/**
 * Thin Agent Builder tool wrapper for the `generalize_from_telemetry`
 * domain action (Phase C — closes the brittle-alert → durable-behavioral-
 * rule loop).
 *
 * Canonical execution surface is the internal HTTP route at
 * `GENERALIZE_FROM_TELEMETRY_API_PATH`. The route resolves a
 * `ScopedModel` via the inference plugin; this tool delegates to the same
 * `generalizeFromTelemetry` service using the model already provided by
 * the agent-builder runtime.
 */
const alertSampleSchema = z
  .object({
    alert_id: z
      .string()
      .min(1)
      .describe('Document id of the alert (`_id` from `.alerts-security.alerts-*`).'),
    rule_name: z.string().optional().describe('`kibana.alert.rule.name` of the originating rule.'),
    technique_ids: z
      .array(z.string())
      .optional()
      .describe(
        'Existing technique mapping on the alert ' +
          '(`kibana.alert.rule.threat.technique[].id`). Used as a hint to the LLM.'
      ),
    summary: z
      .string()
      .min(1)
      .describe(
        'Short human-readable summary of the alert: relevant ECS fields ' +
          '(host.name, process.name, command_line, file.hash.sha256, source.ip, etc). ' +
          'The agent usually composes this from a `security.alerts` result.'
      ),
  })
  .describe('One alert sample provided to the generalization step.');

const generalizeFromTelemetrySchema = z.object({
  question: z
    .string()
    .min(1)
    .describe(
      'Analyst question that motivated the generalization (e.g. "this alert keeps ' +
        'firing on rotating hashes — what behavior would catch it durably?").'
    ),
  alerts: z
    .array(alertSampleSchema)
    .min(1)
    .max(50)
    .describe(
      'Pre-fetched alert samples. The orchestrating agent should call ' +
        '`security.alerts` first and pass at least 3-5 samples for the ' +
        'extraction to find a stable behavior.'
    ),
  llm_confidence_threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Candidates with LLM confidence below this are dropped before catalog validation.'),
  persist_synthetic_report: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Whether to write the synthetic `source.type: "telemetry"` row into ' +
        '`.kibana-threat-reports-*`. Default true so downstream tools (`coverage_gap`, ' +
        '`search_reports`) can reuse the finding.'
    ),
});

export const generalizeFromTelemetryTool: BuiltinSkillBoundedTool<
  typeof generalizeFromTelemetrySchema
> = {
  id: THREAT_INTEL_TOOL_IDS.generalizeFromTelemetry,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${GENERALIZE_FROM_TELEMETRY_API_PATH}. ` +
    'Generalize a set of brittle alerts (firing on rotating IOCs) into durable behavioral ' +
    'detection rules. A synthetic `source.type: "telemetry"` row is persisted to ' +
    '`.kibana-threat-reports-*` for provenance. Surviving candidates are returned with the ' +
    'same `proposed_esql_rule` + `threat-intel-finding-card` attachment-hint shape as ' +
    '`hunt_behavior`. Inside Kibana, prefer calling the route directly via ' +
    '`execute_workflow_step` + `kibana-request`.',
  schema: generalizeFromTelemetrySchema,
  handler: async (params, { esClient, logger, modelProvider, spaceId }) => {
    try {
      const model = await modelProvider.getDefaultModel();
      const data = await generalizeFromTelemetry(
        esClient.asCurrentUser,
        model,
        logger,
        spaceId,
        params
      );
      return { results: [{ type: ToolResultType.other, data }] };
    } catch (err) {
      logger.warn(`generalize_from_telemetry failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                `LLM extraction failed: ${(err as Error).message}. ` +
                `Verify a default inference connector is configured.`,
            },
          },
        ],
      };
    }
  },
};
