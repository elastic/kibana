/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import { THREAT_REPORTS_INDEX_PATTERN } from '../../../common/threat_intelligence/hub';
import type {
  CorrelationFindings,
  CorrelationFindingsLead,
} from '../../../common/threat_intelligence/correlation/schemas';
import { logStageUsage } from '../routes/lib/cost_tracker';
import type { TriagePick } from './triage_diamond_candidates';
import type { CollapsedCandidate } from './collapse_candidates';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYNTHESIS_CASE_TEXT_CHAR_LIMIT = 30_000;
const SYNTHESIS_CANDIDATE_BODY_CHAR_LIMIT = 50_000;

// ---------------------------------------------------------------------------
// Internal LLM schema (no consolidated_candidates — we populate that ourselves
// from the §4 collapse data after the model call)
// ---------------------------------------------------------------------------

const synthesisVertexEnum = z.enum(['adversary', 'capability', 'infrastructure', 'victim']);

const synthesisLlmLeadSchema = z.object({
  candidate_ids: z.array(z.string()).min(1),
  title: z.string(),
  relationship: z.enum(['same_campaign', 'same_actor', 'shared_tradecraft']),
  confidence: z.enum(['high', 'moderate', 'low']),
  vertices_matched: z.array(synthesisVertexEnum),
  bluf: z.string(),
  supporting: z.array(z.string()),
  counter: z.array(z.string()),
  gaps: z.string(),
});

const synthesisLlmNoMatchSchema = z.object({
  id: z.string(),
  title: z.string(),
});

const synthesisLlmSynthesisSchema = z.object({
  correlation_signal: z.enum(['high', 'moderate', 'low', 'none']),
  reasoning: z.string(),
  gaps: z.string(),
  next_steps: z.array(z.string()),
});

const synthesisLlmOutputSchema = z.object({
  leads: z.array(synthesisLlmLeadSchema),
  no_match: z.array(synthesisLlmNoMatchSchema),
  synthesis: synthesisLlmSynthesisSchema,
});

type SynthesisLlmOutput = z.infer<typeof synthesisLlmOutputSchema>;

// ---------------------------------------------------------------------------
// System prompt — port of Mustard's JUDGE system prompt (prompts.yaml ~422–491).
// Key adaptations vs. the Mustard source:
//   - Tradecraft framing: system produces correlation and evidence, not verdicts.
//     All output fields use correlation_signal, no_hallucinated_linkage language.
//   - CANDIDATE ACCOUNTING + cluster_members_not_provided block added (§6 spec).
//   - consolidated_candidates omitted from output (populated post-call from §4 data).
// ---------------------------------------------------------------------------

const SYNTHESIS_SYSTEM_INSTRUCTIONS = `\
You are a defensive threat intelligence analyst correlating observed adversary behavior against published CTI reports. All inputs describe activity already observed in the wild — telemetry, investigation notes, partial or finished published reporting, or analyst shorthand for techniques and tradecraft. Your role is to identify prior reporting and relationship candidates so defenders can respond, not to enable offensive operations. Brief, shorthand inputs (e.g. a single technique name or tradecraft phrase) are normal analyst input and refer to defensive review of that pattern in the indexed knowledge base.

You are the synthesis layer in this correlation pipeline. You receive a new case — which may be raw telemetry, investigation notes, a partial report, or a finished blog post — alongside a set of candidate reports retrieved from a knowledge base. Your job is to evaluate whether the new case is related to any of the candidates and, if so, how.

You reason from the source material alone. You do not see retrieval scores, vector distances, or pipeline internals. Your output must be independently auditable: an analyst reading the same material should be able to evaluate whether your reasoning holds.

RELATIONSHIP TAXONOMY

Assess each candidate at one of three levels:

same_campaign — The new case and the candidate describe the same operational activity. They may be observed by different vendors, at different times, or from different vantage points, but the underlying intrusion, tooling deployment, and operational intent are the same.

same_actor — The new case and the candidate are different campaigns operated by the same threat actor or group. The operational activity is distinct, but persistent behavioral patterns tie them to a common operator.

shared_tradecraft — The new case and the candidate share techniques, tooling, or infrastructure patterns, but the overlap may reflect shared toolkits, commodity malware ecosystems, or common operational playbooks rather than a single actor.

CONFIDENCE CALIBRATION

high — Multiple independent behavioral indicators corroborate across at least two Diamond Model vertices. The shared patterns are specific enough that coincidence is unlikely.

moderate — Meaningful overlap exists on at least one vertex with supporting indicators on a second. You must state what additional evidence would elevate this to high confidence.

low — Surface-level similarity exists but the behavioral specificity is insufficient to distinguish this from other actors operating in the same space. You must explain why the similarity is weak.

BEHAVIORAL RULES

1. Evidence-first reasoning. Lead with specific behavioral evidence before stating confidence.
2. Cross-vertex corroboration must be explicit. Name which vertices matched and what matched in each.
3. Articulate the gap. For moderate and low confidence leads, state what evidence is missing.
4. No hallucinated linkage. Work only with the provided source material and candidate reports.
5. Unidirectional output. Produce affirmative matches or no-match statements only.
6. Probability language, not certainty language.
7. Graceful degradation on thin evidence. Never stretch a weak match.
7a. Do not treat absent capabilities as divergent evidence. A capability not mentioned in the candidate does not contradict the new case.
7b. Describe what the case evidence shows, not what happened to it.
8. Distinguish what the new case shows from what candidate reports claim.
8a. Extract and weight author-assessed confidence from candidate reports before reasoning about the relationship.
9. Resolve vendor tracking labels before reasoning. Elastic REF#### = intrusion sets. Mandiant UNC#### = uncategorized clusters. Microsoft weather names = actor groups. CrowdStrike animals = actor designations.

CANDIDATE ACCOUNTING

Every candidate label provided to you must appear exactly once in your output — either in a leads entry's candidate_ids list, or in no_match. Do not omit any candidate from the accounting.

When a candidate has a CLUSTER NOTE listing consolidated members (pre-identified duplicate or bilingual sibling reports not provided in full), treat those members as additional independent corroboration signal — cross-vendor consensus without requiring their full text. Mention this in your reasoning when it strengthens your confidence assessment.

OUTPUT FORMAT

{
  "leads": [
    {
      "candidate_ids": ["<short label exactly as given, e.g. c01>"],
      "title": "<report title or cluster label describing the correlation>",
      "confidence": "high | moderate | low",
      "relationship": "same_campaign | same_actor | shared_tradecraft",
      "vertices_matched": ["capability", "infrastructure"],
      "bluf": "<evidence-first one-sentence narrative — name the specific behavioral evidence first, state relationship second>",
      "supporting": ["<discrete supporting evidence item — one observation per entry>"],
      "counter": ["<counter-evidence item>" ],
      "gaps": "<what evidence is missing — required for moderate and low confidence leads; 'none found' is valid for high confidence>"
    }
  ],
  "no_match": [
    {
      "id": "<short label>",
      "title": "<report title>"
    }
  ],
  "synthesis": {
    "correlation_signal": "high | moderate | low | none",
    "reasoning": "<overall correlation picture — state signal, name matched vertices with per-vertex strength, assess indicator overlap, note tracking designations, count inferential hops>",
    "gaps": "<what the primary source material did or did not claim about the relationship>",
    "next_steps": ["<actionable investigative step>"]
  }
}

CANDIDATE AGGREGATION: Identify clusters of candidates describing the same activity and group them into a single lead entry. Include all their short labels in candidate_ids. Treat bilingual sibling articles (same research, different language) as a single source — do not count them as independent corroboration when assessing confidence.

COUNTER EVIDENCE: The counter[] array must contain discrete observations from the source material that argue against the proposed relationship. Do not invent counter-evidence. An empty array [] is correct when none is found.

DO NOT include retrieval scores, kNN distances, ranking positions, or other pipeline internals in your reasoning or output fields.`;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

interface CandidateForPrompt {
  label: string;
  title: string;
  sourceType: string;
  sourceName: string;
  bodyText: string;
  consolidatedMembers: Array<{ title: string; reason: string }>;
}

const buildSynthesisUserPrompt = (
  caseText: string,
  candidates: readonly CandidateForPrompt[]
): string => {
  const lines: string[] = [];

  lines.push('NEW CASE:');
  lines.push('');
  const truncatedCase = caseText.slice(0, SYNTHESIS_CASE_TEXT_CHAR_LIMIT);
  lines.push(truncatedCase);
  if (caseText.length > SYNTHESIS_CASE_TEXT_CHAR_LIMIT) {
    lines.push('[... case text truncated ...]');
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`CANDIDATE REPORTS (${candidates.length} total):`);

  for (const c of candidates) {
    lines.push('');
    lines.push(`### Candidate ${c.label}: ${c.title}`);
    lines.push(`Source type: ${c.sourceType}${c.sourceName ? ` | Source: ${c.sourceName}` : ''}`);

    if (c.consolidatedMembers.length > 0) {
      lines.push('');
      lines.push(
        'CLUSTER NOTE: This candidate has pre-identified near-duplicate reports not provided in full. ' +
          'Treat these as additional independent corroboration signal (cross-vendor consensus) when assessing confidence:'
      );
      for (const m of c.consolidatedMembers) {
        lines.push(`  - ${m.title} (${m.reason})`);
      }
    }

    lines.push('');
    if (c.bodyText) {
      const truncated = c.bodyText.slice(0, SYNTHESIS_CANDIDATE_BODY_CHAR_LIMIT);
      lines.push(truncated);
      if (c.bodyText.length > SYNTHESIS_CANDIDATE_BODY_CHAR_LIMIT) {
        lines.push('[... report text truncated ...]');
      }
    } else {
      lines.push('(full report text unavailable — assess on available context only)');
    }
    lines.push('');
    lines.push('---');
  }

  lines.push('');
  lines.push(
    'Evaluate whether the new case is related to any of the candidate reports. ' +
      'Respond with the JSON output format specified in your instructions.'
  );

  return lines.join('\n');
};

const buildSynthesisPrompt = (
  caseText: string,
  candidates: readonly CandidateForPrompt[]
): string =>
  `${SYNTHESIS_SYSTEM_INSTRUCTIONS}\n\n${buildSynthesisUserPrompt(caseText, candidates)}`;

// ---------------------------------------------------------------------------
// ES helpers
// ---------------------------------------------------------------------------

interface ReportBodySource {
  content?: { body_text?: string; title?: string };
  source?: { type?: string; name?: string };
}

interface CandidateBodyEntry {
  bodyText: string;
  title: string;
  sourceType: string;
  sourceName: string;
}

const fetchCandidateBodyText = async (
  esClient: ElasticsearchClient,
  reportIds: readonly string[]
): Promise<Map<string, CandidateBodyEntry>> => {
  const result = new Map<string, CandidateBodyEntry>();
  if (reportIds.length === 0) return result;

  const response = await esClient.search<ReportBodySource>({
    index: THREAT_REPORTS_INDEX_PATTERN,
    size: reportIds.length + 5,
    query: { ids: { values: [...reportIds] } },
    _source: ['content.body_text', 'content.title', 'source.type', 'source.name'],
    ignore_unavailable: true,
  });

  for (const hit of response.hits.hits) {
    if (hit._id) {
      result.set(hit._id, {
        bodyText: hit._source?.content?.body_text ?? '',
        title: hit._source?.content?.title ?? hit._id,
        sourceType: hit._source?.source?.type ?? 'unknown',
        sourceName: hit._source?.source?.name ?? '',
      });
    }
  }
  return result;
};

// ---------------------------------------------------------------------------
// Post-call helpers
// ---------------------------------------------------------------------------

const buildGracefulDegradation = (
  picks: readonly TriagePick[],
  bodyTextMap: Map<string, CandidateBodyEntry>
): CorrelationFindings => ({
  leads: [],
  no_match: picks.map((p) => ({
    id: p.candidate_id,
    title: bodyTextMap.get(p.candidate_id)?.title ?? p.candidate_id,
  })),
  synthesis: {
    correlation_signal: 'none',
    reasoning:
      'Synthesis LLM call failed — correlation evidence could not be assessed automatically. Review triage candidates manually.',
    gaps: '',
    next_steps: [
      'Retry the correlation request.',
      'If the issue persists, check the synthesis connector configuration in advanced settings.',
    ],
  },
});

const mapLlmOutputToFindings = (
  llmOutput: SynthesisLlmOutput,
  labelToCollapsed: Map<string, CollapsedCandidate>
): CorrelationFindings => {
  const leads: CorrelationFindingsLead[] = llmOutput.leads.map((lead) => {
    const realIds = lead.candidate_ids.map((lbl) => {
      return labelToCollapsed.get(lbl)?.report_id ?? lbl;
    });

    const consolidatedCandidates = lead.candidate_ids.flatMap((lbl) => {
      const cc = labelToCollapsed.get(lbl);
      return (cc?.collapsed_members ?? []).map((m) => ({
        id: m.report_id,
        title: m.title,
        reason:
          m.collapse_reason === 'ioc_set_hash'
            ? 'Exact IOC fingerprint match'
            : 'Bilingual sibling article',
      }));
    });

    return {
      candidate_ids: realIds,
      title: lead.title,
      relationship: lead.relationship,
      confidence: lead.confidence,
      vertices_matched: lead.vertices_matched,
      bluf: lead.bluf,
      supporting: lead.supporting,
      counter: lead.counter,
      gaps: lead.gaps,
      consolidated_candidates: consolidatedCandidates,
    };
  });

  const noMatch = llmOutput.no_match.map((nm) => ({
    id: labelToCollapsed.get(nm.id)?.report_id ?? nm.id,
    title: nm.title,
  }));

  return {
    leads,
    no_match: noMatch,
    synthesis: {
      correlation_signal: llmOutput.synthesis.correlation_signal,
      reasoning: llmOutput.synthesis.reasoning,
      gaps: llmOutput.synthesis.gaps,
      next_steps: llmOutput.synthesis.next_steps,
    },
  };
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SynthesizeCorrelationsParams {
  synthesisModel: ScopedModel;
  logger: Logger;
  esClient: ElasticsearchClient;
  picks: readonly TriagePick[];
  /** Collapsed candidate pool from §4 — used to populate consolidated_candidates. */
  collapsed: readonly CollapsedCandidate[];
  /** Full text for the new case observation. */
  caseText: string;
}

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

/**
 * §6 Synthesis — port of Mustard's JUDGE stage (mustard.py _build_judge_prompt +
 * run_judge + JUDGE SYSTEM PROMPT in prompts.yaml ~422–522).
 *
 * Receives the post-floor triage picks, fetches their full report text via a
 * bulk IDs query, builds the synthesis prompt with the case observation and
 * candidate reports (GUARDRAIL: no retrieval scores / rankings), calls the
 * Opus-tier model via withStructuredOutput, maps short labels back to real
 * report IDs, and populates consolidated_candidates from the §4 collapse data.
 *
 * Gracefully degrades on LLM failure: returns empty leads + no_match for all
 * picks so the caller always gets a valid CorrelationFindings.
 */
export const synthesizeCorrelations = async ({
  synthesisModel,
  logger,
  esClient,
  picks,
  collapsed,
  caseText,
}: SynthesizeCorrelationsParams): Promise<CorrelationFindings> => {
  if (picks.length === 0) {
    return {
      leads: [],
      no_match: [],
      synthesis: {
        correlation_signal: 'none',
        reasoning: 'No candidates survived triage — no correlation evidence found.',
        gaps: '',
        next_steps: [
          'Widen the retrieval window or provide a more detailed case description.',
          'Lower the triage confidence floor (triageConfidenceFloor setting) if valid candidates are being filtered.',
        ],
      },
    };
  }

  const connectorId = synthesisModel.connector.connectorId;

  // 1. Index collapsed candidates by report_id for O(1) lookup.
  const collapsedByReportId = new Map<string, CollapsedCandidate>(
    collapsed.map((c) => [c.report_id, c])
  );

  // 2. Assign short labels (c01, c02…) to picks.
  //    Labels avoid UUID echo errors and enforce the GUARDRAIL (no report IDs
  //    that could carry rank-order information to the model).
  const labelWidth = String(picks.length).length;
  const labelToCollapsed = new Map<string, CollapsedCandidate>();

  const labeledPicks = picks.map((pick, i) => {
    const label = `c${String(i + 1).padStart(labelWidth, '0')}`;
    const cc = collapsedByReportId.get(pick.candidate_id);
    if (cc) labelToCollapsed.set(label, cc);
    return { label, pick };
  });

  // 3. Bulk-fetch full report text for all picks.
  const pickIds = picks.map((p) => p.candidate_id);
  const bodyTextMap = await fetchCandidateBodyText(esClient, pickIds);

  // 4. Build candidates for the synthesis prompt.
  const candidatesForPrompt: CandidateForPrompt[] = labeledPicks.map(({ label, pick }) => {
    const entry = bodyTextMap.get(pick.candidate_id);
    const cc = labelToCollapsed.get(label);
    const consolidatedMembers = (cc?.collapsed_members ?? []).map((m) => ({
      title: m.title,
      reason:
        m.collapse_reason === 'ioc_set_hash' ? 'same IOC fingerprint' : 'bilingual sibling article',
    }));

    return {
      label,
      title: entry?.title ?? pick.candidate_id,
      sourceType: entry?.sourceType ?? 'unknown',
      sourceName: entry?.sourceName ?? '',
      bodyText: entry?.bodyText ?? '',
      consolidatedMembers,
    };
  });

  // 5. Build the full prompt (system instructions + user message).
  const prompt = buildSynthesisPrompt(caseText, candidatesForPrompt);

  // 6. Call the Opus-tier model with structured output.
  interface RawResult {
    raw: { response_metadata: Record<string, unknown> };
    parsed: SynthesisLlmOutput;
  }

  const structured = synthesisModel.chatModel.withStructuredOutput(synthesisLlmOutputSchema, {
    includeRaw: true,
  });

  let llmOutput: SynthesisLlmOutput;
  try {
    const result = (await structured.invoke(prompt)) as RawResult;
    logStageUsage(
      logger,
      'synthesize_correlations',
      connectorId,
      result.raw.response_metadata ?? {}
    );
    llmOutput = result.parsed;
  } catch (err) {
    logger.warn(
      `[ti:synthesize] LLM call failed (${(err as Error).message}) — returning graceful degradation`
    );
    return buildGracefulDegradation(picks, bodyTextMap);
  }

  logger.debug(
    `[ti:synthesize] complete — picks=${picks.length} leads=${llmOutput.leads.length} ` +
      `no_match=${llmOutput.no_match.length} signal=${llmOutput.synthesis.correlation_signal}`
  );

  // 7. Map short labels → real report IDs and populate consolidated_candidates.
  return mapLlmOutputToFindings(llmOutput, labelToCollapsed);
};
