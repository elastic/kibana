/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import { subtechniqueById, tacticsToIds, techniqueById } from '@kbn/securitysolution-mitre-catalog';
import {
  proposedEsqlRule,
  sanitizeRuleName,
  severityToRiskScore,
  severityFromConfidence,
  type SeverityLevel,
} from '../../../common/threat_intelligence/hub';

/**
 * Domain capability module for the `hunt_behavior` action.
 *
 * Two-step extraction: (1) LLM extracts candidate MITRE ATT&CK technique
 * IDs with evidence quotes from the report text; (2) each candidate is
 * validated against the canonical ATT&CK catalog (the same source
 * `security.create_detection_rule` uses). Hallucinated or unknown IDs are
 * dropped. Surviving candidates are enriched with a `proposed_esql_rule`
 * body and a pre-built finding-card attachment hint.
 *
 * Same shape is used by the internal HTTP route and the Agent Builder
 * tool wrapper — the route resolves a `ScopedModel` from the inference
 * plugin (mirroring `nl_to_esql_route.ts`); the tool delegates here using
 * the model already provided by the runtime.
 */

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

export const huntBehaviorLlmExtractionSchema = z.object({
  candidates: z.array(candidateBehaviorSchema).default([]),
});

type CandidateBehavior = z.infer<typeof candidateBehaviorSchema>;

export interface HuntBehaviorParams {
  text: string;
  report_id?: string;
  llm_confidence_threshold?: number;
}

export interface ValidatedBehavior {
  technique_id: string;
  evidence_quote: string;
  llm_confidence: number;
  confidence: number;
  technique_name: string;
  reference: string;
  tactic_ids: string[];
  parent_technique_id?: string;
  proposed_esql_rule: string;
  rule_name: string;
  severity: SeverityLevel;
  risk_score: number;
  finding_id: string;
}

export interface HuntBehaviorAttachmentHint {
  type: 'threat-intel-finding-card';
  payload_partial: {
    finding_id: string;
    report_id: string;
    report_title: string;
    report_source_name: string;
    technique_id: string;
    technique_name: string;
    parent_technique_id?: string;
    tactics: string[];
    severity: SeverityLevel;
    confidence: number;
    evidence_quote: string;
    proposed_esql_rule: string;
    rule_name: string;
    risk_score: number;
  };
}

export type HuntBehaviorStatus =
  | 'no_behaviors_found'
  | 'no_behaviors_validated'
  | 'behaviors_proposed';

export interface HuntBehaviorResult {
  status: HuntBehaviorStatus;
  report_id?: string;
  behaviors: ValidatedBehavior[];
  attachment_hints: HuntBehaviorAttachmentHint[];
  dropped_unknown_ids?: string[];
  message?: string;
  next_step: string;
}

const EXTRACTION_PROMPT = `You are a threat intelligence analyst. Extract MITRE ATT&CK technique
IDs that are *actively described* in the provided report text. Do NOT include techniques merely
mentioned in passing or as background context.

For each candidate technique, return:
- technique_id: the canonical ATT&CK ID
- evidence_quote: a verbatim 1-3 sentence quote from the text justifying the mapping
- llm_confidence: 0.0-1.0 estimate of confidence`;

const buildFindingId = (techniqueId: string, reportId?: string): string =>
  `${reportId ?? 'anon'}:${techniqueId}`;

export const huntBehavior = async (
  model: ScopedModel,
  logger: Logger,
  params: HuntBehaviorParams
): Promise<HuntBehaviorResult> => {
  const { text, report_id: reportId, llm_confidence_threshold: llmThreshold = 0.5 } = params;

  // Step 1 — LLM extraction with structured output (zod-typed; no JSON parsing).
  let candidates: CandidateBehavior[] = [];
  const structured = model.chatModel.withStructuredOutput(huntBehaviorLlmExtractionSchema);
  const result = (await structured.invoke(
    `${EXTRACTION_PROMPT}\n\n--- REPORT TEXT ---\n${text}`
  )) as z.infer<typeof huntBehaviorLlmExtractionSchema>;
  candidates = (result.candidates ?? [])
    .map((c) => ({
      technique_id: c.technique_id.toUpperCase().trim(),
      evidence_quote: c.evidence_quote.trim(),
      llm_confidence: Math.max(0, Math.min(1, c.llm_confidence)),
    }))
    .filter((c) => c.llm_confidence >= llmThreshold);

  if (candidates.length === 0) {
    return {
      status: 'no_behaviors_found',
      report_id: reportId,
      behaviors: [],
      attachment_hints: [],
      message:
        'No behavioral candidates passed the LLM-confidence threshold. ' +
        'The report may be IOC-only or describe known/already-covered techniques.',
      next_step:
        'Lower `llm_confidence_threshold` or fall back to IOC matching if the report is IOC-only.',
    };
  }

  // Step 2 — validate each candidate against the static ATT&CK catalog. IDs that
  // do not exist (LLM hallucination, malformed sub-technique IDs, retired techniques)
  // are dropped silently; surviving candidates are enriched with name, tactic, and
  // parent-technique metadata for the rule-creation handoff.
  const validated: ValidatedBehavior[] = [];
  const droppedIds: string[] = [];

  for (const candidate of candidates) {
    const technique = techniqueById.get(candidate.technique_id);
    const subtechnique = technique ? undefined : subtechniqueById.get(candidate.technique_id);

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
    } else if (subtechnique) {
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
    } else {
      droppedIds.push(candidate.technique_id);
    }
  }

  // Per-behavior attachment hints for `threat-intel-finding-card`. Partial:
  // `report_title` and `report_source_name` are not known at this layer
  // (the agent obtained them via `ingest_report` / `search_reports`) and
  // MUST be filled in by the orchestrating agent before emitting.
  const attachmentHints: HuntBehaviorAttachmentHint[] = validated.map((b) => ({
    type: 'threat-intel-finding-card' as const,
    payload_partial: {
      finding_id: b.finding_id,
      report_id: reportId ?? '',
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

  logger.debug(
    `hunt_behavior validated=${validated.length} dropped=${droppedIds.length} report_id=${reportId}`
  );

  return {
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
  };
};
