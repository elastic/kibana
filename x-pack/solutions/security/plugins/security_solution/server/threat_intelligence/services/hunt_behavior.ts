/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import { subtechniqueById, tacticsToIds, techniqueById } from '@kbn/securitysolution-mitre-catalog';
import {
  HUNT_FOR_THREAT_INDEX_PATTERNS,
  proposedEsqlRule,
  sanitizeRuleName,
  severityToRiskScore,
  severityFromConfidence,
  type SeverityLevel,
} from '../../../common/threat_intelligence/hub';
import { toIndexedBehaviors, type IndexedBehavior } from './indexed_behaviors';

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
 *
 * @implements
 * Conforms to the cross-team `TelemetryProbe` contract defined in
 * `common/threat_intelligence/hub/telemetry_probe.ts` (the Tier 2 /
 * corroboration variant). The validated `behaviors[]` array maps onto
 * `TelemetryProbeResult.matches` + `TelemetryProbeResult.proposed_rules`
 * — see RFC §3.1 mapping table in
 * `docs/rfcs/0001_streams_layer3_grounded_hypothesis_flow.md`.
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

/**
 * Optional environment-hit context passed by `huntOrchestrator` after a
 * Tier 1 atomic-IOC lookup matches. Lets the Tier 2 LLM extractor refine
 * its behavioral candidates against the actual entities seen in the
 * customer environment (tradecraft-style article + corroboration
 * coupling) rather than reasoning from the report text alone.
 *
 * All fields are best-effort hints — when missing or empty, the
 * extraction falls back to text-only behavior, preserving the
 * standalone `hunt_behavior` semantics that `enrich_threat_report`
 * already depends on.
 */
export interface HuntBehaviorArticleContext {
  /**
   * Concrete backing indices that produced Tier 1 hits (from the
   * `per_index` aggregation). Used to steer the grounded ES|QL
   * generation towards the data sources the activity was actually
   * observed in.
   */
  matched_indices?: string[];
  /** Top N affected hostnames from the Tier 1 hit aggregation. */
  affected_hosts?: string[];
  /** Top N affected usernames from the Tier 1 hit aggregation. */
  affected_users?: string[];
  /** Compact field summaries from a handful of Tier 1 hit documents. */
  sample_events?: string[];
  /** Time window the Tier 1 hunt searched, ISO-8601. */
  time_range?: { from: string; to: string };
  /**
   * Atomic ES|QL rule proposals already generated for this Tier 1 hit
   * set (see `common/threat_intelligence/hub/rule_export.ts`'s
   * `proposeAtomicEsqlFromIocs`). When provided, the LLM is steered
   * away from re-proposing the same atomic detection as a behavioral
   * rule — Tier 2 should add value over Tier 1 (broader patterns,
   * cross-event correlations) rather than duplicating the IOC-direct
   * coverage the orchestrator will already surface to the analyst.
   *
   * Only the rule name + IOC type/value are threaded into the prompt;
   * the full ES|QL body is intentionally omitted to keep the LLM's
   * context window focused on the analytical signal rather than the
   * rule scaffolding.
   */
  proposed_atomic_rules?: Array<{
    rule_name: string;
    ioc_type: string;
    ioc_value: string;
  }>;
}

export interface HuntBehaviorIoc {
  type: string;
  value: string;
}

export interface HuntBehaviorParams {
  text: string;
  report_id?: string;
  llm_confidence_threshold?: number;
  /**
   * Extracted IOCs from the originating report (same shape as
   * `hunt_for_threat`'s resolved set). When provided, the grounded
   * ES|QL generation step anchors each proposed rule on these verbatim
   * artifact values instead of relying on the LLM re-extracting them
   * from the report text.
   */
  iocs?: HuntBehaviorIoc[];
  /**
   * When provided, the LLM extraction prompt is prepended with a
   * structured "Environment context" block describing the Tier 1 hit
   * surface. See {@link HuntBehaviorArticleContext}.
   */
  article_context?: HuntBehaviorArticleContext;
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
  /**
   * Mapping-safe projection for `.kibana-threat-reports` extraction
   * workflows — strict nested `extracted.behaviors` rejects extra keys.
   */
  indexed_behaviors: IndexedBehavior[];
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

const CONTEXT_PREAMBLE = `When environment context is provided, prefer techniques that BOTH the
report text describes AND the observed entities (hosts, users, sample events) plausibly exhibit.
Use the context to refine technique IDs (e.g. choose a specific sub-technique that matches an
observed process/command pattern) — do NOT invent IDs that aren't in the report text just because
the environment is noisy.

When a "Proposed atomic rules" block is present, the listed IOCs are ALREADY covered by atomic
ES|QL detections the orchestrator will surface to the analyst. Your job is to add value beyond
that coverage: propose behaviors that catch the same activity through *patterns* (process trees,
command-line signatures, parent/child relationships, event sequences) rather than echoing the
atomic IOC match. If a candidate technique would only fire on the exact IOC values already
listed, drop it — it's not a corroboration signal, it's a duplicate.`;

const buildFindingId = (techniqueId: string, reportId?: string): string =>
  `${reportId ?? 'anon'}:${techniqueId}`;

/**
 * Step 3 — grounded ES|QL generation. One structured-output call turns
 * the validated behavior set into real hunt queries anchored on the
 * report's concrete artifacts (IPs, domains, hashes, file paths,
 * package/process names, command lines, accounts) instead of the
 * placeholder `TO_LOWER(message) LIKE "*<technique name>*"` skeleton
 * that `proposedEsqlRule` emits. The skeleton remains the fallback for
 * any behavior the LLM misses, for unparseable output, and for the
 * whole set when the generation call itself fails — so the
 * `proposed_esql_rule` contract (always present, always non-empty)
 * is preserved for every caller.
 */
const esqlRuleSchema = z.object({
  technique_id: z
    .string()
    .describe('ATT&CK ID of the candidate behavior this query hunts for — copy it verbatim.'),
  esql: z
    .string()
    .describe(
      'Complete executable ES|QL query starting with FROM. No markdown fences, no comment lines.'
    ),
});

export const huntBehaviorEsqlGenerationSchema = z.object({
  rules: z.array(esqlRuleSchema).default([]),
});

const ESQL_GENERATION_PROMPT = `You are an expert detection engineer writing ES|QL threat-hunt
queries for the Elastic Security Detection Engine.

For EACH candidate behavior listed below, write ONE complete ES|QL query that hunts for the
SPECIFIC activity the threat report describes, grounded in the report's concrete artifacts:
IP addresses, CIDR ranges, domains, URLs, file hashes, file paths, package/library names,
process names, command lines, and email/user accounts. Use the verbatim artifact values from
the "Extracted IOCs" list and the report text.

Hard requirements:
- Each query MUST filter on at least one concrete artifact value (or a tight pattern derived
  from one, e.g. a package name with a version wildcard). Generic queries are worthless.
- NEVER filter on the ATT&CK technique name as a message substring
  (e.g. \`TO_LOWER(message) LIKE "*credentials in files*"\` is forbidden).
- Start with \`FROM <patterns>\` using the most relevant of the available index patterns —
  prefer the specific integration(s) where the activity would appear over a catch-all.
  Always use wildcard index patterns (e.g. \`logs-okta.system*\`); NEVER a dated concrete
  index name — confirmed-hit indices only tell you WHICH integration to target.
- Use only valid ES|QL: commands FROM / WHERE / EVAL / STATS ... BY / SORT / KEEP / LIMIT
  separated by \`|\`; functions such as TO_LOWER(), STARTS_WITH(), ENDS_WITH(),
  CIDR_MATCH(<ip_field>, "<cidr>"), COALESCE(); operators ==, !=, IN (...), LIKE with *
  wildcards, AND / OR / NOT, IS NOT NULL. String literals use double quotes.
- Use ECS fields appropriate to the artifact and data source:
  ip → source.ip / destination.ip / host.ip / client.ip / server.ip / related.ip;
  domain → dns.question.name / destination.domain / url.domain;
  url → url.full / url.original;
  hash → file.hash.sha256|sha1|md5 / process.hash.* / dll.hash.*;
  email or account → user.name / user.email / user.target.name / related.user;
  file path → file.path / process.executable;
  process / command → process.name / process.command_line / process.args;
  cloud API activity → event.action / event.provider / user.name / source.ip;
  packages & network flows → url.* / destination.domain / network.* / event.action.
- Correlate more than one signal when the report supports it (e.g. process activity AND a
  known C2 destination) — but never at the cost of requirement 1.
- End with \`| LIMIT 100\`. Include a KEEP listing @timestamp plus the fields the query
  filters on so the preview surface shows the evidence. In KEEP, only use fields you
  filtered on, core ECS fields (@timestamp, host.name, user.name, source.ip,
  destination.ip, event.action, event.outcome), or fields observed in the sample
  events — an invented column makes the whole query fail validation.
- Return the bare query text only — no markdown, no comments, no prose.`;

/**
 * Strip markdown fences / stray comment lines from LLM output and
 * reject anything that doesn't start with a FROM source command. A
 * `undefined` return means "fall back to the skeleton template".
 */
const sanitizeGeneratedEsql = (raw: string): string | undefined => {
  let text = raw.trim();
  const fenced = text.match(/```(?:esql|sql)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  text = text
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
    .trim();
  if (!/^FROM\s/i.test(text)) return undefined;
  return text;
};

/**
 * Deterministic metadata header prepended to the LLM-generated body —
 * mirrors the skeleton template's comment block so downstream surfaces
 * (finding flyout, rule-create handoff) keep the same shape.
 */
const buildGroundedEsqlHeader = (b: {
  rule_name: string;
  severity: SeverityLevel;
  risk_score: number;
  technique_id: string;
  parent_technique_id?: string;
  tactic_ids: string[];
}): string =>
  [
    `// Generated from threat_intel.hunt_behavior — grounded in the report's extracted`,
    `// IOCs/behaviors. Review the FROM clause and artifact values before enabling.`,
    `// rule_name: ${b.rule_name}`,
    `// severity: ${b.severity}  risk_score: ${b.risk_score}`,
    `// mitre_attack: ${b.technique_id}${
      b.parent_technique_id ? ` (parent ${b.parent_technique_id})` : ''
    }`,
    `// tactics: ${b.tactic_ids.join(', ') || '<unmapped>'}`,
  ].join('\n');

const MAX_ESQL_PROMPT_IOCS = 30;
const MAX_ESQL_PROMPT_TEXT_CHARS = 6000;
const MAX_ESQL_REPAIR_ATTEMPTS = 3;

/**
 * Drop one unknown column from the query's KEEP list. Returns
 * `undefined` when the column isn't in KEEP (e.g. referenced in WHERE —
 * not safely repairable) so the caller falls back to the template.
 */
const pruneKeepColumn = (esql: string, column: string): string | undefined => {
  const keepRegex = /(\bKEEP\b\s+)([^|]+)/i;
  const match = esql.match(keepRegex);
  if (!match) return undefined;
  const columns = match[2]
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const remaining = columns.filter((c) => c !== column);
  if (remaining.length === columns.length || remaining.length === 0) return undefined;
  return esql.replace(keepRegex, `$1${remaining.join(', ')} `);
};

/**
 * Dry-run a generated query against the environment (`| LIMIT 0` keeps
 * it cheap — ES|QL applies the minimum LIMIT). Unknown KEEP columns —
 * the most common LLM hallucination — are pruned and retried; any other
 * verification failure rejects the query so the behavior falls back to
 * the skeleton template rather than persisting a broken rule.
 */
const validateEsqlAgainstEnvironment = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  techniqueId: string,
  esql: string
): Promise<string | undefined> => {
  let candidate = esql;
  for (let attempt = 0; attempt < MAX_ESQL_REPAIR_ATTEMPTS; attempt++) {
    try {
      await esClient.esql.query({ query: `${candidate}\n| LIMIT 0` });
      return candidate;
    } catch (err) {
      const message = (err as Error).message ?? '';
      const unknownColumn = message.match(/Unknown column \[([^\]]+)\]/);
      const repaired = unknownColumn ? pruneKeepColumn(candidate, unknownColumn[1]) : undefined;
      if (!repaired) {
        logger.warn(
          `[ti:esql] generated ES|QL for ${techniqueId} failed environment validation — ` +
            `falling back to the skeleton template. ${message.slice(0, 300)}`
        );
        return undefined;
      }
      candidate = repaired;
    }
  }
  logger.warn(
    `[ti:esql] generated ES|QL for ${techniqueId} still failing after ` +
      `${MAX_ESQL_REPAIR_ATTEMPTS} repair attempts — falling back to the skeleton template.`
  );
  return undefined;
};

/**
 * One LLM call for the whole validated set. Returns a map of
 * technique_id → sanitized ES|QL body; missing entries (and the empty
 * map on failure) fall back to the skeleton template per behavior.
 */
const generateGroundedEsql = async (
  model: ScopedModel,
  logger: Logger,
  {
    text,
    iocs,
    articleContext,
    behaviors,
  }: {
    text: string;
    iocs?: HuntBehaviorIoc[];
    articleContext?: HuntBehaviorArticleContext;
    behaviors: ValidatedBehavior[];
  }
): Promise<Map<string, string>> => {
  const generated = new Map<string, string>();
  const sections: string[] = [ESQL_GENERATION_PROMPT];

  const indexPatterns = new Set<string>(HUNT_FOR_THREAT_INDEX_PATTERNS);
  // Generalize concrete backing indices (dated data-stream / rollover names)
  // to wildcard patterns so the model can't anchor a durable rule on a
  // single day's index.
  const matchedPatterns = [
    ...new Set(
      (articleContext?.matched_indices ?? []).map(
        (index) => `${index.replace(/^\.ds-/, '').replace(/[-.]\d{4}[.-]\d{2}[.-]\d{2}.*$/, '')}*`
      )
    ),
  ];
  for (const pattern of matchedPatterns) {
    indexPatterns.add(pattern);
  }
  sections.push(`--- AVAILABLE INDEX PATTERNS ---\n${[...indexPatterns].join('\n')}`);
  if (matchedPatterns.length > 0) {
    sections.push(
      `--- INDEX PATTERNS WITH CONFIRMED ENVIRONMENT HITS (prefer these in FROM) ---\n${matchedPatterns.join(
        '\n'
      )}`
    );
  }
  if (articleContext?.sample_events?.length) {
    sections.push(
      `--- SAMPLE MATCHED ENVIRONMENT EVENTS ---\n${articleContext.sample_events
        .map((evt) => `- ${evt}`)
        .join('\n')}`
    );
  }
  if (iocs?.length) {
    sections.push(
      `--- EXTRACTED IOCS (verbatim values to hunt) ---\n${iocs
        .slice(0, MAX_ESQL_PROMPT_IOCS)
        .map((ioc) => `- ${ioc.type}: ${ioc.value}`)
        .join('\n')}`
    );
  }
  sections.push(
    `--- CANDIDATE BEHAVIORS (one query each) ---\n${behaviors
      .map((b) => `- ${b.technique_id} (${b.technique_name}): "${b.evidence_quote}"`)
      .join('\n')}`
  );
  sections.push(`--- REPORT TEXT ---\n${text.slice(0, MAX_ESQL_PROMPT_TEXT_CHARS)}`);

  try {
    const structured = model.chatModel.withStructuredOutput(huntBehaviorEsqlGenerationSchema);
    const result = (await structured.invoke(sections.join('\n\n'))) as z.infer<
      typeof huntBehaviorEsqlGenerationSchema
    >;
    for (const rule of result.rules ?? []) {
      const techniqueId = rule.technique_id?.toUpperCase().trim();
      const esql = sanitizeGeneratedEsql(rule.esql ?? '');
      if (techniqueId && esql && !generated.has(techniqueId)) {
        generated.set(techniqueId, esql);
      }
    }
    if (generated.size < behaviors.length) {
      logger.warn(
        `[ti:esql] grounded ES|QL generation covered ${generated.size}/${behaviors.length} ` +
          `behaviors — uncovered behaviors fall back to the skeleton template.`
      );
    }
  } catch (err) {
    logger.warn(
      `[ti:esql] grounded ES|QL generation failed — all behaviors fall back to the ` +
        `skeleton template. ${(err as Error).message}`
    );
  }
  return generated;
};

/**
 * Render the optional Tier 1 environment-hit context as a structured
 * preamble for the LLM prompt. Empty / missing context returns `''` so
 * the standalone `hunt_behavior` shape (no article_context) is
 * byte-identical to the pre-orchestrator prompt and existing callers
 * (`enrich_threat_report` workflow, direct route invocations)
 * behave unchanged.
 */
const renderArticleContext = (context: HuntBehaviorArticleContext | undefined): string => {
  if (!context) return '';
  const lines: string[] = [];
  const {
    affected_hosts: hosts,
    affected_users: users,
    sample_events: events,
    time_range,
    proposed_atomic_rules: atomicRules,
  } = context;
  if (time_range) {
    lines.push(`- Time window searched: ${time_range.from} → ${time_range.to}`);
  }
  if (hosts?.length) {
    lines.push(`- Top affected hosts: ${hosts.slice(0, 10).join(', ')}`);
  }
  if (users?.length) {
    lines.push(`- Top affected users: ${users.slice(0, 10).join(', ')}`);
  }
  if (events?.length) {
    lines.push('- Sample environment events:');
    for (const evt of events.slice(0, 5)) {
      lines.push(`    • ${evt}`);
    }
  }
  if (atomicRules?.length) {
    // Cap at 10 atomic rules in the prompt — the prompt grows linearly
    // with the IOC count and the LLM only needs a representative sample
    // to recognise the "already covered atomically" pattern.
    lines.push('- Proposed atomic rules (already drafted from Tier 1 IOC hits):');
    for (const rule of atomicRules.slice(0, 10)) {
      lines.push(`    • ${rule.rule_name}  [${rule.ioc_type}=${rule.ioc_value}]`);
    }
    if (atomicRules.length > 10) {
      lines.push(`    • … and ${atomicRules.length - 10} more atomic rule(s).`);
    }
  }
  if (lines.length === 0) return '';
  return `\n\n--- ENVIRONMENT CONTEXT (Tier 1 hits) ---\n${CONTEXT_PREAMBLE}\n${lines.join('\n')}`;
};

export const huntBehavior = async (
  model: ScopedModel,
  logger: Logger,
  params: HuntBehaviorParams,
  /**
   * Optional — when provided, each LLM-generated ES|QL body is dry-run
   * against the environment (`LIMIT 0`) before replacing the skeleton
   * template, so hallucinated columns never reach a persisted finding.
   */
  esClient?: ElasticsearchClient
): Promise<HuntBehaviorResult> => {
  const {
    text,
    report_id: reportId,
    llm_confidence_threshold: llmThreshold = 0.5,
    iocs,
    article_context: articleContext,
  } = params;

  // Step 1 — LLM extraction with structured output (zod-typed; no JSON parsing).
  let candidates: CandidateBehavior[] = [];
  const structured = model.chatModel.withStructuredOutput(huntBehaviorLlmExtractionSchema);
  const contextBlock = renderArticleContext(articleContext);
  const result = (await structured.invoke(
    `${EXTRACTION_PROMPT}${contextBlock}\n\n--- REPORT TEXT ---\n${text}`
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
      indexed_behaviors: [],
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

  // Step 3 — replace the skeleton template with grounded ES|QL wherever the
  // LLM produced a usable query. The template (already set in the loop
  // above) remains the per-behavior fallback so `proposed_esql_rule` is
  // never empty.
  if (validated.length > 0) {
    const groundedEsql = await generateGroundedEsql(model, logger, {
      text,
      iocs,
      articleContext,
      behaviors: validated,
    });
    for (const behavior of validated) {
      let esql = groundedEsql.get(behavior.technique_id);
      if (esql && esClient) {
        esql = await validateEsqlAgainstEnvironment(esClient, logger, behavior.technique_id, esql);
      }
      if (esql) {
        behavior.proposed_esql_rule = `${buildGroundedEsqlHeader(behavior)}\n${esql}`;
      }
    }
  }

  // Per-behavior attachment hints for `threat-intel-finding-card`. Partial:
  // `report_title` and `report_source_name` are not known at this layer
  // (the agent obtained them via `create_threat_report` / `find_threat_reports`) and
  // MUST be filled in by the orchestrating agent before emitting.
  const attachmentHints: HuntBehaviorAttachmentHint[] = validated.map((b) => ({
    type: 'threat-intel-finding-card' as const,
    payload_partial: {
      finding_id: b.finding_id,
      report_id: reportId ?? '',
      report_title: '<fill from create_threat_report result>',
      report_source_name: '<fill from create_threat_report result>',
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
    indexed_behaviors: toIndexedBehaviors(validated),
    attachment_hints: attachmentHints,
    ...(droppedIds.length > 0 && { dropped_unknown_ids: droppedIds }),
    next_step:
      validated.length === 0
        ? 'No candidates matched the canonical ATT&CK catalog. The LLM may have ' +
          'hallucinated technique IDs; consider lowering the LLM threshold or falling ' +
          'back to IOC matching for this report.'
        : 'For each behavior, emit a `threat-intel-finding-card` attachment built from ' +
          'the matching entry in `attachment_hints` (fill in report_title and ' +
          'report_source_name from the prior create_threat_report / find_threat_reports result). ' +
          'The card carries Deploy / Dismiss / Investigate buttons so the analyst can ' +
          'act in chat. When `security.create_detection_rule` is available, also call ' +
          'it for the highest-confidence behavior with the same evidence quote and ' +
          'proposed_esql_rule body.',
  };
};
