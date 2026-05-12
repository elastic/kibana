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
import { subtechniqueById, tacticsToIds, techniqueById } from '@kbn/securitysolution-mitre-catalog';
import {
  THREAT_INTEL_TOOL_IDS,
  proposedEsqlRule,
  sanitizeRuleName,
  severityToRiskScore,
  severityFromConfidence,
} from '../../../common';

const huntBehaviorSchema = z.object({
  text: z
    .string()
    .min(1)
    .describe(
      'Free-form report text to analyze (e.g. a vendor advisory, blog post, or analyst paste).'
    ),
  report_id: z
    .string()
    .optional()
    .describe('Optional `_id` of the source report in `threat-reports-*` for provenance backlink.'),
  llm_confidence_threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Candidates with LLM confidence below this are dropped before catalog validation.'),
});

const candidateBehaviorSchema = z.object({
  technique_id: z
    .string()
    .describe(
      'Canonical ATT&CK ID (e.g. "T1566.001", "T1059.003"). Use sub-technique IDs ' +
        'when the text describes a specific variant.'
    ),
  evidence_quote: z
    .string()
    .describe('Verbatim 1-3 sentence quote from the text that justifies the mapping.'),
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

/**
 * Stable id for client-side dismiss-state correlation. Built from
 * `(report_id, technique_id)` so the same finding regenerated in a
 * later turn keeps its identity. Falls back to `anon` when the source
 * isn't known yet (e.g. ad-hoc paste with no `report_id`).
 */
const buildFindingId = (techniqueId: string, reportId?: string): string =>
  `${reportId ?? 'anon'}:${techniqueId}`;

const EXTRACTION_PROMPT = `You are a threat intelligence analyst. Extract MITRE ATT&CK technique
IDs that are *actively described* in the provided report text. Do NOT include techniques merely
mentioned in passing or as background context.

For each candidate technique, return:
- technique_id: the canonical ATT&CK ID
- evidence_quote: a verbatim 1-3 sentence quote from the text justifying the mapping
- llm_confidence: 0.0-1.0 estimate of confidence`;

export const huntBehaviorTool: BuiltinSkillBoundedTool<typeof huntBehaviorSchema> = {
  id: THREAT_INTEL_TOOL_IDS.huntBehavior,
  type: ToolType.builtin,
  description:
    'Extract behavioral detection hypotheses from a threat intelligence report and propose ' +
    'durable behavioral detection rules. Two-step algorithm: (1) LLM extracts candidate ' +
    'MITRE ATT&CK technique IDs with evidence quotes; (2) each candidate is validated against ' +
    'the vendored Kibana ATT&CK catalog (the same source `security.create_detection_rule` uses). ' +
    'Hallucinated or unknown IDs are dropped. Surviving candidates are returned as behavioral ' +
    'findings, each with a `proposed_esql_rule` body and a pre-built `threat-intel-finding-card` ' +
    'attachment hint (Deploy / Dismiss / Investigate buttons). The orchestrating agent emits ' +
    'one card per finding and, when `security.create_detection_rule` is available, also calls ' +
    'it for the highest-confidence behavior. When that tool is unavailable, the finding card ' +
    'still lets the analyst deploy via the UI.',
  schema: huntBehaviorSchema,
  handler: async (
    { text, report_id: reportId, llm_confidence_threshold: llmThreshold },
    { modelProvider, logger }
  ) => {
    // Step 1 — LLM extraction with structured output (zod-typed; no JSON parsing).
    let candidates: CandidateBehavior[] = [];
    try {
      const model = await modelProvider.getDefaultModel();
      const structured = model.chatModel.withStructuredOutput(llmExtractionSchema);
      const result = (await structured.invoke(
        `${EXTRACTION_PROMPT}\n\n--- REPORT TEXT ---\n${text}`
      )) as z.infer<typeof llmExtractionSchema>;
      candidates = (result.candidates ?? [])
        .map((c) => ({
          technique_id: c.technique_id.toUpperCase().trim(),
          evidence_quote: c.evidence_quote.trim(),
          llm_confidence: Math.max(0, Math.min(1, c.llm_confidence)),
        }))
        .filter((c) => c.llm_confidence >= llmThreshold);
    } catch (err) {
      logger.warn(`hunt_behavior LLM step failed: ${(err as Error).message}`);
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
              report_id: reportId,
              behaviors: [],
              message:
                'No behavioral candidates passed the LLM-confidence threshold. ' +
                'The report may be IOC-only or describe known/already-covered techniques.',
            },
          },
        ],
      };
    }

    // Step 2 — validate each candidate against the static ATT&CK catalog. IDs that
    // do not exist (LLM hallucination, malformed sub-technique IDs, retired techniques)
    // are dropped silently; surviving candidates are enriched with name, tactic, and
    // parent-technique metadata for the rule-creation handoff. Each surviving
    // behavior carries a `proposed_esql_rule` skeleton ready for handoff to
    // `security.create_detection_rule` (or copy-paste when AI rule creation is off).
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
            report_id: reportId,
          }),
          rule_name: sanitizeRuleName(candidate.technique_id, technique.name, reportId),
          severity,
          risk_score: severityToRiskScore(severity),
          finding_id: buildFindingId(candidate.technique_id, reportId),
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
            report_id: reportId,
          }),
          rule_name: sanitizeRuleName(candidate.technique_id, subtechnique.name, reportId),
          severity,
          risk_score: severityToRiskScore(severity),
          finding_id: buildFindingId(candidate.technique_id, reportId),
        });
        continue;
      }

      droppedIds.push(candidate.technique_id);
    }

    // Per-behavior attachment hints for `threat-intel-finding-card`. The
    // hint is a partial payload — `report_title` and `report_source_name`
    // are not known at this layer (the agent obtained them via
    // `ingest_report` / `search_reports`) and MUST be filled in by the
    // orchestrating agent before emitting the attachment. Mirrors the
    // `attachment_hint` pattern used by `coverage_gap`.
    const attachmentHints = validated.map((b) => ({
      type: 'threat-intel-finding-card' as const,
      payload_partial: {
        finding_id: b.finding_id,
        report_id: reportId ?? '',
        // Agent must fill these two from the prior ingest_report / search_reports result.
        report_title: '<fill from ingest_report result>',
        report_source_name: '<fill from ingest_report result>',
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
            report_id: reportId,
            behaviors: validated,
            attachment_hints: attachmentHints,
            ...(droppedIds.length > 0 && { dropped_unknown_ids: droppedIds }),
            next_step:
              validated.length === 0
                ? 'No candidates matched the canonical ATT&CK catalog. The LLM may have ' +
                  'hallucinated technique IDs; consider lowering the LLM threshold or falling ' +
                  'back to IOC matching for this report.'
                : 'For each behavior, emit a `threat-intel-finding-card` attachment built from ' +
                  'the matching entry in `attachment_hints` (fill in report_title and ' +
                  'report_source_name from the prior ingest_report / search_reports result). ' +
                  'The card carries Deploy / Dismiss / Investigate buttons so the analyst can ' +
                  'act in chat. When `security.create_detection_rule` is available, also call ' +
                  'it for the highest-confidence behavior with the same evidence quote and ' +
                  'proposed_esql_rule body.',
          },
        },
      ],
    };
  },
};
