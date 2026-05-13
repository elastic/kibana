/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { subtechniqueById, tacticsToIds, techniqueById } from '@kbn/securitysolution-mitre-catalog';
import {
  THREAT_INTEL_TOOL_IDS,
  THREAT_REPORTS_DATA_STREAM,
  proposedEsqlRule,
  sanitizeRuleName,
  severityToRiskScore,
  severityFromConfidence,
} from '../../../common';

/**
 * Phase C — generalize alerts that fire on rotating IOCs into durable
 * behavioral detection rules.
 *
 * The PRD calls this the "brittle-alert → durable-behavioral-rule" feedback
 * loop: an alert that keeps firing on shifting hashes / domains / IPs is
 * evidence of a *behavior* the OS exposes, not just a static identifier.
 * Walking up the abstraction ladder once produces a rule constrained by the
 * OS, not by the adversary — i.e. one the adversary can't sidestep by
 * rotating identifiers cheaply.
 *
 * Flow:
 *   1. Caller (the agent) pulls a sample of `.alerts-security.alerts-*`
 *      documents via `security.alerts` and hands them in via `alerts`.
 *   2. This tool projects each alert into a short textual summary (the
 *      ATT&CK extraction prompt is text-input, not JSON-input) and asks
 *      the LLM to extract candidate ATT&CK technique IDs with evidence
 *      quotes — same prompt as `hunt_behavior`, same structured-output
 *      schema, so the two paths produce identical downstream artifacts.
 *   3. Candidates are validated against the static ATT&CK catalog
 *      (`@kbn/securitysolution-mitre-catalog`) — hallucinated IDs are
 *      dropped.
 *   4. A synthetic `threat-reports-*` row is written with
 *      `source.type = 'telemetry'`,
 *      `provenance.source_doc_ref` pointing at the alert sample, and
 *      `extraction_method = 'generalize_from_telemetry_v1'`. This makes
 *      the telemetry-derived intelligence searchable alongside external
 *      feeds and lets `coverage_gap` and `hit_provenance_backfill` reuse
 *      it without special-casing.
 *   5. Surviving behaviors are returned with the same `proposed_esql_rule`
 *      and `threat-intel-finding-card` attachment-hint structure as
 *      `hunt_behavior`, so the agent's downstream rendering and the
 *      Detection Engine handoff are unchanged.
 *
 * Returns the same `behaviors` + `attachment_hints` shape as `hunt_behavior`
 * for parity.
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
        'firing on rotating hashes — what behavior would catch it durably?"). Helps ' +
        'the LLM focus on the right TTP layer.'
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
        '`threat-reports-*`. Default true so downstream tools (`coverage_gap`, ' +
        '`search_reports`) can reuse the finding.'
    ),
});

const candidateBehaviorSchema = z.object({
  technique_id: z.string().describe('Canonical ATT&CK ID (e.g. "T1566.001", "T1059.003").'),
  evidence_quote: z
    .string()
    .describe('Verbatim quote from one of the alert summaries justifying the mapping.'),
  llm_confidence: z.number().min(0).max(1).describe('0.0-1.0 confidence in this mapping.'),
});

const llmExtractionSchema = z.object({
  candidates: z.array(candidateBehaviorSchema).default([]),
});

type CandidateBehavior = z.infer<typeof candidateBehaviorSchema>;

interface ValidatedBehavior extends CandidateBehavior {
  confidence: number;
  technique_name: string;
  reference: string;
  tactic_ids: string[];
  parent_technique_id?: string;
  proposed_esql_rule: string;
  rule_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  finding_id: string;
}

const EXTRACTION_PROMPT = `You are a detection engineer. Given a set of recent alert samples
that share a common adversary tactic, identify the underlying MITRE ATT&CK *behavior* (not
just the static identifier the alerts matched on). The goal is to propose a behavioral
detection that would still fire if the adversary rotated hashes, domains, or IPs.

For each candidate technique, return:
- technique_id: the canonical ATT&CK ID
- evidence_quote: a verbatim 1-3 sentence quote from one of the alert summaries that
  justifies the mapping
- llm_confidence: 0.0-1.0 estimate of confidence`;

const summarizeAlerts = (alerts: Array<z.infer<typeof alertSampleSchema>>): string =>
  alerts
    .map(
      (a, idx) =>
        `--- ALERT ${idx + 1} (id=${a.alert_id}${a.rule_name ? `, rule="${a.rule_name}"` : ''}${
          a.technique_ids?.length ? `, existing_technique_ids=[${a.technique_ids.join(',')}]` : ''
        }) ---\n${a.summary}`
    )
    .join('\n\n');

const buildFindingId = (techniqueId: string, sampleHash: string): string =>
  `telemetry:${sampleHash.slice(0, 12)}:${techniqueId}`;

export const generalizeFromTelemetryTool: BuiltinSkillBoundedTool<
  typeof generalizeFromTelemetrySchema
> = {
  id: THREAT_INTEL_TOOL_IDS.generalizeFromTelemetry,
  type: ToolType.builtin,
  description:
    'Generalize a set of brittle alerts (firing on rotating IOCs) into durable behavioral ' +
    'detection rules. Two-step algorithm: (1) LLM extracts candidate MITRE ATT&CK technique ' +
    'IDs from the alert summaries with evidence quotes; (2) each candidate is validated ' +
    "against the vendored Kibana ATT&CK catalog. A synthetic `source.type: 'telemetry'` " +
    'row is persisted to `threat-reports-*` for provenance so the same finding shows up ' +
    'in `coverage_gap` and `search_reports`. Surviving candidates are returned as ' +
    'behavioral findings with the same `proposed_esql_rule` + `threat-intel-finding-card` ' +
    'attachment-hint shape as `hunt_behavior`, so downstream Deploy / Dismiss / Investigate ' +
    'rendering and the optional `security.create_detection_rule` handoff are unchanged. ' +
    'Use when the user asks "generalize this alert", "this alert keeps firing on rotating ' +
    'hashes", or "make a durable behavioral rule out of these detections".',
  schema: generalizeFromTelemetrySchema,
  handler: async (
    {
      question,
      alerts,
      llm_confidence_threshold: llmThreshold,
      persist_synthetic_report: persistSynthetic,
    },
    { esClient, logger, modelProvider, spaceId }
  ) => {
    const alertSummary = summarizeAlerts(alerts);
    const sampleHash = createHash('sha256')
      .update(
        alerts
          .map((a) => a.alert_id)
          .sort()
          .join(',')
      )
      .digest('hex');

    let candidates: CandidateBehavior[] = [];
    try {
      const model = await modelProvider.getDefaultModel();
      const structured = model.chatModel.withStructuredOutput(llmExtractionSchema);
      const result = (await structured.invoke(
        `${EXTRACTION_PROMPT}\n\n--- ANALYST QUESTION ---\n${question}\n\n--- ALERT SAMPLES ---\n${alertSummary}`
      )) as z.infer<typeof llmExtractionSchema>;
      candidates = (result.candidates ?? [])
        .map((c) => ({
          technique_id: c.technique_id.toUpperCase().trim(),
          evidence_quote: c.evidence_quote.trim(),
          llm_confidence: Math.max(0, Math.min(1, c.llm_confidence)),
        }))
        .filter((c) => c.llm_confidence >= llmThreshold);
    } catch (err) {
      logger.warn(`generalize_from_telemetry LLM step failed: ${(err as Error).message}`);
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

    if (candidates.length === 0) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              status: 'no_behaviors_found',
              behaviors: [],
              message:
                'No behavioral candidates passed the LLM-confidence threshold. The alert ' +
                'sample may be too small or describe an IOC-only signal. Try widening the ' +
                'search and including more alert samples.',
            },
          },
        ],
      };
    }

    const validated: ValidatedBehavior[] = [];
    const droppedIds: string[] = [];

    for (const candidate of candidates) {
      const technique = techniqueById.get(candidate.technique_id);
      if (technique) {
        const tacticIds = tacticsToIds(technique.tactics);
        const severity = severityFromConfidence(candidate.llm_confidence);
        validated.push({
          ...candidate,
          confidence: candidate.llm_confidence,
          technique_name: technique.name,
          reference: technique.reference,
          tactic_ids: tacticIds,
          proposed_esql_rule: proposedEsqlRule({
            technique_id: candidate.technique_id,
            technique_name: technique.name,
            tactic_ids: tacticIds,
            evidence_quote: candidate.evidence_quote,
            confidence: candidate.llm_confidence,
            severity,
          }),
          rule_name: sanitizeRuleName(
            candidate.technique_id,
            technique.name,
            `telemetry:${sampleHash.slice(0, 8)}`
          ),
          severity,
          risk_score: severityToRiskScore(severity),
          finding_id: buildFindingId(candidate.technique_id, sampleHash),
        });
        continue;
      }

      const subtechnique = subtechniqueById.get(candidate.technique_id);
      if (subtechnique) {
        const tacticIds = tacticsToIds(subtechnique.tactics);
        const severity = severityFromConfidence(candidate.llm_confidence);
        validated.push({
          ...candidate,
          confidence: candidate.llm_confidence,
          technique_name: subtechnique.name,
          reference: subtechnique.reference,
          tactic_ids: tacticIds,
          parent_technique_id: subtechnique.techniqueId,
          proposed_esql_rule: proposedEsqlRule({
            technique_id: candidate.technique_id,
            technique_name: subtechnique.name,
            parent_technique_id: subtechnique.techniqueId,
            tactic_ids: tacticIds,
            evidence_quote: candidate.evidence_quote,
            confidence: candidate.llm_confidence,
            severity,
          }),
          rule_name: sanitizeRuleName(
            candidate.technique_id,
            subtechnique.name,
            `telemetry:${sampleHash.slice(0, 8)}`
          ),
          severity,
          risk_score: severityToRiskScore(severity),
          finding_id: buildFindingId(candidate.technique_id, sampleHash),
        });
        continue;
      }

      droppedIds.push(candidate.technique_id);
    }

    // Persist the synthetic `source.type: 'telemetry'` row so the finding
    // shows up in downstream tools (`coverage_gap`, `search_reports`,
    // dashboard). Best-effort: a failed write is logged but the tool still
    // returns the behaviors so the analyst's chat session isn't blocked.
    let syntheticReportId: string | undefined;
    if (persistSynthetic && validated.length > 0) {
      const now = new Date().toISOString();
      const title = `Generalized from ${alerts.length} alerts: ${validated[0].technique_name}`;
      const bodyText =
        `Analyst question: ${question}\n\n` +
        `Behavior(s) extracted: ${validated.map((b) => b.technique_id).join(', ')}\n\n` +
        `Source alert sample (${alerts.length}):\n${alertSummary}`;
      try {
        const indexResponse = await esClient.asCurrentUser.index({
          index: THREAT_REPORTS_DATA_STREAM,
          document: {
            '@timestamp': now,
            content_fingerprint: sampleHash,
            space_id: spaceId,
            source: {
              type: 'telemetry',
              name: 'Telemetry generalization',
              adapter_id: 'telemetry:generalize_from_telemetry',
            },
            content: {
              title,
              body_text: bodyText,
              language: 'en',
            },
            severity: {
              level: validated[0].severity,
              score: severityToRiskScore(validated[0].severity),
            },
            extracted: {
              behaviors: validated.map((b) => ({
                id: b.finding_id,
                technique_id: b.technique_id,
                description: b.evidence_quote,
                telemetry_targets: [],
                llm_confidence: b.confidence,
                confidence: b.confidence,
              })),
              ttps: {
                techniques: validated.map((b) => b.technique_id),
              },
            },
            provenance: {
              ingested_at: now,
              extracted_at: now,
              extraction_method: 'generalize_from_telemetry_v1',
              source_doc_ref: {
                index: '.alerts-security.alerts-*',
                id: alerts.map((a) => a.alert_id).join(','),
              },
            },
          },
        });
        syntheticReportId = indexResponse._id;
      } catch (err) {
        logger.warn(
          `generalize_from_telemetry: failed to persist synthetic report: ${(err as Error).message}`
        );
      }
    }

    const attachmentHints = validated.map((b) => ({
      type: 'threat-intel-finding-card' as const,
      payload_partial: {
        finding_id: b.finding_id,
        report_id: syntheticReportId ?? '',
        report_title: `Telemetry generalization (${alerts.length} alerts)`,
        report_source_name: 'Telemetry generalization',
        technique_id: b.technique_id,
        technique_name: b.technique_name,
        ...(b.parent_technique_id && { parent_technique_id: b.parent_technique_id }),
        tactics: b.tactic_ids,
        severity: b.severity,
        confidence: b.confidence,
        evidence_quote: b.evidence_quote,
        proposed_esql_rule: b.proposed_esql_rule,
        rule_name: b.rule_name,
        risk_score: b.risk_score,
      },
    }));

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            status: validated.length === 0 ? 'no_behaviors_validated' : 'behaviors_proposed',
            synthetic_report_id: syntheticReportId,
            behaviors: validated,
            attachment_hints: attachmentHints,
            ...(droppedIds.length > 0 && { dropped_unknown_ids: droppedIds }),
            next_step:
              validated.length === 0
                ? 'No candidates matched the canonical ATT&CK catalog. Provide more alert ' +
                  'samples or lower the LLM-confidence threshold.'
                : 'For each behavior, emit a `threat-intel-finding-card` attachment built ' +
                  'from the matching entry in `attachment_hints`. The card carries Deploy ' +
                  '/ Dismiss / Investigate buttons. When `security.create_detection_rule` ' +
                  'is available, also call it for the highest-confidence behavior with ' +
                  'the same evidence quote and proposed_esql_rule body.',
          },
        },
      ],
    };
  },
};
