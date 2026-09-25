/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { executeEsql, generateEsql } from '@kbn/agent-builder-genai-utils';
import type { z } from '@kbn/zod/v4';
import type {
  HuntBehaviorArticleContext,
  HuntBehaviorIoc,
  HuntForThreatHit,
} from '@kbn/alertzero-common';
import { buildMatchesRequired, isIndexPatternAllowed } from '../common/matches_required';
import { getKnownHuntIndexPatterns } from '../common/resolve_index_scope';
import {
  huntBehaviorLlmExtractionSchema,
  EXTRACTION_PROMPT,
  CONTEXT_PREAMBLE,
  ESQL_GENERATION_INSTRUCTIONS,
} from './extraction_contract';
import { toIndexedBehaviors } from './indexed_behaviors';
import { getMitreCatalog } from './mitre_catalog';
import { assertEsqlSourcesAllowed } from './assert_esql_sources_allowed';
import { prepareEsqlForExecute } from './prepare_esql_for_execute';
import type {
  BehaviorExecution,
  HuntBehaviorParams,
  HuntBehaviorResult,
  SeverityLevel,
  ValidatedBehavior,
} from './types';

const MAX_AFFECTED_ENTITIES = 20;
/** Cap Tier 2 Discover refs to match SSE `events[]` / `alerts[]` max. */
const MAX_HITS = 50;
const NO_EXECUTION: BehaviorExecution = { executed: false, row_count: 0, hit: false };

const severityFromConfidence = (confidence: number): SeverityLevel => {
  if (confidence > 0.8) return 'critical';
  if (confidence > 0.6) return 'high';
  if (confidence > 0.4) return 'medium';
  return 'low';
};

const severityToRiskScore = (severity: SeverityLevel): number => {
  switch (severity) {
    case 'critical':
      return 99;
    case 'high':
      return 73;
    case 'medium':
      return 47;
    case 'low':
      return 21;
  }
};

const sanitizeRuleName = (
  techniqueId: string,
  techniqueName: string,
  reportId?: string
): string => {
  const safe = techniqueName.replace(/[()\/\\]/g, '').trim();
  return reportId
    ? `Hunt: ${safe} (${techniqueId}) [${reportId.slice(0, 8)}]`
    : `Hunt: ${safe} (${techniqueId})`;
};

/**
 * Non-executable placeholder when grounded generation is unavailable or fails.
 * Never emits a FROM clause — a prior `FROM *` stub was unsafe to ship as a
 * proposed rule even though the execute path skipped it.
 */
const proposedEsqlRuleUnavailable = ({
  technique_id,
  technique_name,
  tactic_ids,
  evidence_quote,
  confidence,
  severity,
  report_id,
}: {
  technique_id: string;
  technique_name: string;
  parent_technique_id?: string;
  tactic_ids: string[];
  evidence_quote: string;
  confidence: number;
  severity: SeverityLevel;
  report_id?: string;
}): string => {
  const name = sanitizeRuleName(technique_id, technique_name, report_id);
  return [
    `// rule_name: ${name}`,
    `// technique: ${technique_id} (${technique_name})`,
    `// tactics: ${tactic_ids.join(', ') || '<unmapped>'}`,
    `// severity: ${severity}  confidence: ${confidence.toFixed(2)}`,
    `// evidence: ${evidence_quote.slice(0, 120)}`,
    `// Grounded ES|QL generation unavailable; no executable query proposed.`,
  ].join('\n');
};

const buildGroundedEsqlHeader = (b: {
  rule_name: string;
  severity: SeverityLevel;
  risk_score: number;
  technique_id: string;
  parent_technique_id?: string;
  tactic_ids: string[];
}): string =>
  [
    `// Generated from hunt.hunt_behavior — grounded in the report's extracted`,
    `// IOCs/behaviors and validated against the target index mappings.`,
    `// Review the FROM clause and artifact values before enabling.`,
    `// rule_name: ${b.rule_name}`,
    `// severity: ${b.severity}  risk_score: ${b.risk_score}`,
    `// mitre_attack: ${b.technique_id}${
      b.parent_technique_id ? ` (parent ${b.parent_technique_id})` : ''
    }`,
    `// tactics: ${b.tactic_ids.join(', ') || '<unmapped>'}`,
  ].join('\n');

const MAX_ESQL_PROMPT_IOCS = 30;
const MAX_ESQL_PROMPT_TEXT_CHARS = 6000;
/** Concurrent `generateEsql` calls; each one is a multi-step LLM graph plus mapping lookups. */
const ESQL_GENERATION_CONCURRENCY = 3;
/**
 * How many behaviors get a grounded query. Concurrency bounds how much runs at
 * once, not how much runs in total, and the report text decides how many
 * candidates reach generation — so without this bound one report can spend
 * arbitrarily many LLM graphs and ES|QL executes. Behaviors past the budget keep
 * the non-executable placeholder they were built with: they still appear in
 * `behaviors`, they just do not spend a generation call.
 */
const MAX_GENERATED_BEHAVIORS = 20;
/** LIMIT the generator writes into a proposed rule when the caller has no row bound. */
const DEFAULT_PROPOSED_RULE_LIMIT = 100;
/**
 * Generation target when neither Tier 1 hits nor the scope name an index (the
 * standalone route). Letting the generator discover one lands on a dated
 * physical index, which is never what a proposed rule should cite.
 */
const DEFAULT_GENERATION_INDEX = 'logs-*';

const columnIndex = (columns: Array<{ name: string }> | undefined, name: string): number =>
  columns?.findIndex((c) => c.name === name) ?? -1;

const uniqueTrimmed = (values: unknown[], max: number): { items: string[]; truncated: boolean } => {
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    seen.add(trimmed);
  }
  const all = [...seen];
  return {
    items: all.slice(0, max),
    truncated: all.length > max,
  };
};

/**
 * Execute a generated query in the hunt window. Hit bar counts only rows
 * whose `_index` matches a required pattern. Per-behavior errors record
 * `executed: false` and do not fail the tier.
 */
const executeValidatedEsql = async ({
  esClient,
  logger,
  techniqueId,
  esql,
  window,
  row_limit,
  requiredIndices,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  techniqueId: string;
  esql: string;
  window: { from: string; to: string };
  row_limit: number;
  requiredIndices: string[];
}): Promise<{
  execution: BehaviorExecution;
  affected_hosts?: string[];
  affected_users?: string[];
  affected_hosts_truncated?: boolean;
  affected_users_truncated?: boolean;
  hits?: HuntForThreatHit[];
}> => {
  const matchesRequired = buildMatchesRequired(requiredIndices);

  try {
    const prepared = prepareEsqlForExecute(esql);
    const sourcesAllowed = assertEsqlSourcesAllowed(prepared, requiredIndices);
    if (!sourcesAllowed.ok) {
      logger.warn(
        `[hunt:esql] execute for ${techniqueId} refused — ${sourcesAllowed.reason}. ` +
          `Recording executed:false and continuing.`
      );
      return { execution: NO_EXECUTION };
    }

    const response = await executeEsql({
      esClient,
      query: prepared,
      limit: row_limit,
      filter: {
        range: {
          // Exclusive `to`, matching `IndexScopeWindow` and Tier 1.
          '@timestamp': { gte: window.from, lt: window.to },
        },
      },
    });

    const columns = response.columns ?? [];
    const values = response.values ?? [];
    const indexCol = columnIndex(columns, '_index');
    const idCol = columnIndex(columns, '_id');
    const hostCol = columnIndex(columns, 'host.name');
    const userCol = columnIndex(columns, 'user.name');
    const tsCol = columnIndex(columns, '@timestamp');

    if (values.length > 0 && indexCol < 0) {
      // Aggregating pipelines (STATS, etc.) drop METADATA columns. Rows existed
      // but the required-index hit bar cannot evaluate them.
      logger.warn(
        `[hunt:esql] execute for ${techniqueId} returned ${values.length} row(s) with no _index ` +
          `column (query may aggregate away METADATA). Treating as hit: false.`
      );
    }

    const requiredRows: unknown[][] = [];
    for (const row of values) {
      if (!Array.isArray(row)) continue;
      const indexValue = indexCol >= 0 ? row[indexCol] : undefined;
      if (typeof indexValue === 'string' && matchesRequired(indexValue)) {
        requiredRows.push(row);
      }
    }

    const hosts =
      hostCol >= 0
        ? uniqueTrimmed(
            requiredRows.map((row) => row[hostCol]),
            MAX_AFFECTED_ENTITIES
          )
        : undefined;
    const users =
      userCol >= 0
        ? uniqueTrimmed(
            requiredRows.map((row) => row[userCol]),
            MAX_AFFECTED_ENTITIES
          )
        : undefined;

    const hits: HuntForThreatHit[] = [];
    if (idCol >= 0 && indexCol >= 0) {
      for (const row of requiredRows) {
        if (hits.length >= MAX_HITS) break;
        const id = row[idCol];
        const index = row[indexCol];
        if (typeof id !== 'string' || id.length === 0) continue;
        if (typeof index !== 'string' || index.length === 0) continue;
        const timestamp = tsCol >= 0 ? row[tsCol] : undefined;
        hits.push({
          id,
          index,
          ...(typeof timestamp === 'string' && timestamp.length > 0 ? { timestamp } : {}),
        });
      }
    }

    return {
      execution: {
        executed: true,
        row_count: requiredRows.length,
        hit: requiredRows.length > 0,
      },
      ...(hosts && hosts.items.length > 0
        ? {
            affected_hosts: hosts.items,
            ...(hosts.truncated ? { affected_hosts_truncated: true } : {}),
          }
        : {}),
      ...(users && users.items.length > 0
        ? {
            affected_users: users.items,
            ...(users.truncated ? { affected_users_truncated: true } : {}),
          }
        : {}),
      ...(hits.length > 0 ? { hits } : {}),
    };
  } catch (err) {
    logger.warn(
      `[hunt:esql] execute for ${techniqueId} failed — recording executed:false and continuing. ` +
        `${((err as Error).message ?? '').slice(0, 300)}`
    );
    return { execution: NO_EXECUTION };
  }
};

/**
 * Wildcard patterns for the integrations that produced Tier 1 hits, derived
 * from concrete backing indices (`.ds-logs-okta.system-default-2026.09.01-000001`
 * → `logs-okta.system-default*`). A confirmed hit only says WHICH integration
 * to target, never a dated index name.
 */
const matchedIndexPatterns = (articleContext: HuntBehaviorArticleContext | undefined): string[] => [
  ...new Set(
    (articleContext?.matched_indices ?? []).map(
      (index) => `${index.replace(/^\.ds-/, '').replace(/[-.]\d{4}[.-]\d{2}[.-]\d{2}.*$/, '')}*`
    )
  ),
];

/**
 * Target for `generateEsql`. Prefer integrations with confirmed hits that sit
 * inside the allowlist (required scope when present, otherwise every known
 * technology pattern), then the scope's required patterns, then the generic
 * logs pattern. Caller-supplied `matched_indices` never steer generation at
 * indices outside that allowlist.
 */
const resolveGenerationIndex = (
  articleContext: HuntBehaviorArticleContext | undefined,
  requiredIndices: string[]
): string => {
  const allowlist = requiredIndices.length > 0 ? requiredIndices : getKnownHuntIndexPatterns();
  const matched = matchedIndexPatterns(articleContext).filter((pattern) =>
    isIndexPatternAllowed(pattern, allowlist)
  );
  if (matched.length > 0) return matched.join(',');
  if (requiredIndices.length > 0) return requiredIndices.join(',');
  return DEFAULT_GENERATION_INDEX;
};

/** Report-level grounding shared by every per-behavior generation call. */
const buildGenerationContext = ({
  text,
  iocs,
  articleContext,
}: {
  text: string;
  iocs?: HuntBehaviorIoc[];
  articleContext?: HuntBehaviorArticleContext;
}): string => {
  const sections: string[] = [];
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
  sections.push(`--- REPORT TEXT ---\n${text.slice(0, MAX_ESQL_PROMPT_TEXT_CHARS)}`);
  return sections.join('\n\n');
};

/**
 * One `generateEsql` call per validated behavior, keyed by technique id. The
 * shared generator grounds the query in ES|QL docs and the target's mappings,
 * autocorrects, validates the AST, and retries; anything that still fails
 * falls back to a non-executable placeholder (no FROM clause).
 */
const generateGroundedEsql = async ({
  model,
  esClient,
  logger,
  behaviors,
  text,
  iocs,
  articleContext,
  requiredIndices,
  rowLimit,
}: {
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
  behaviors: ValidatedBehavior[];
  text: string;
  iocs?: HuntBehaviorIoc[];
  articleContext?: HuntBehaviorArticleContext;
  requiredIndices: string[];
  rowLimit: number;
}): Promise<Map<string, string>> => {
  const index = resolveGenerationIndex(articleContext, requiredIndices);
  const additionalContext = buildGenerationContext({ text, iocs, articleContext });

  const entries = await pMap(
    behaviors,
    async (behavior): Promise<[string, string] | undefined> => {
      try {
        const { query, error } = await generateEsql({
          model,
          esClient,
          logger,
          nlQuery:
            `Hunt for MITRE ATT&CK ${behavior.technique_id} (${behavior.technique_name}) ` +
            `as described by this report evidence: "${behavior.evidence_quote}"`,
          index,
          additionalInstructions: ESQL_GENERATION_INSTRUCTIONS,
          additionalContext,
          // The hunt window is bound as an execute-time filter, not ?_tstart/?_tend params.
          disableNamedParams: true,
          // AST-validate against mappings, then probe-execute (LIMIT 1) so environment
          // errors feed the generator's retry loop. The real execute runs below with
          // METADATA columns and the hunt window.
          execute: 'schema',
          rowLimit,
        });
        if (error || !query) {
          logger.warn(
            `[hunt:esql] grounded ES|QL generation for ${behavior.technique_id} failed — ` +
              `falling back to a non-executable placeholder. ${(error ?? 'no query returned').slice(
                0,
                300
              )}`
          );
          return undefined;
        }
        return [behavior.technique_id, query.trim()];
      } catch (err) {
        logger.warn(
          `[hunt:esql] grounded ES|QL generation for ${behavior.technique_id} threw — ` +
            `falling back to a non-executable placeholder. ${((err as Error).message ?? '').slice(
              0,
              300
            )}`
        );
        return undefined;
      }
    },
    { concurrency: ESQL_GENERATION_CONCURRENCY }
  );

  const generated = new Map<string, string>(
    entries.filter((entry): entry is [string, string] => entry !== undefined)
  );
  if (generated.size < behaviors.length) {
    logger.warn(
      `[hunt:esql] grounded ES|QL generation covered ${generated.size}/${behaviors.length} ` +
        `behaviors — uncovered behaviors fall back to a non-executable placeholder.`
    );
  }
  return generated;
};

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
  esClient?: ElasticsearchClient
): Promise<HuntBehaviorResult> => {
  const {
    text,
    report_id: reportId,
    llm_confidence_threshold: llmThreshold = 0.5,
    iocs,
    article_context: articleContext,
    window,
    size,
    row_limit: rowLimitFromParams,
    required_indices: requiredIndices = [],
  } = params;

  const rowLimit = size ?? rowLimitFromParams;
  const canExecute =
    window !== undefined &&
    rowLimit !== undefined &&
    requiredIndices.length > 0 &&
    esClient !== undefined;

  const structured = model.chatModel.withStructuredOutput(huntBehaviorLlmExtractionSchema);
  const contextBlock = renderArticleContext(articleContext);
  const result = (await structured.invoke(
    `${EXTRACTION_PROMPT}${contextBlock}\n\n--- REPORT TEXT ---\n${text}`
  )) as z.infer<typeof huntBehaviorLlmExtractionSchema>;
  const candidates = (result.candidates ?? [])
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
      has_hit: false,
      message:
        'No behavioral candidates passed the LLM-confidence threshold. ' +
        'The report may be IOC-only or describe known/already-covered techniques.',
      next_step:
        'Lower `llm_confidence_threshold` or fall back to IOC matching if the report is IOC-only.',
    };
  }

  const validated: ValidatedBehavior[] = [];
  const droppedIds: string[] = [];

  const { techniqueById, subtechniqueById } = getMitreCatalog();
  for (const candidate of candidates) {
    const technique = techniqueById.get(candidate.technique_id);
    const subtechnique = technique ? undefined : subtechniqueById.get(candidate.technique_id);
    const entry = technique ?? subtechnique;
    if (!entry) {
      droppedIds.push(candidate.technique_id);
      continue;
    }
    // A revoked id resolves to its live successor; carry the live id forward so
    // the proposed rule and the indexed projection never cite a retired technique.
    const techniqueId = entry.id;
    // One behavior per live technique id. The LLM can emit the same id twice
    // (or a revoked id alongside its successor); generation, execution, and the
    // indexed `reportId:techniqueId` projection are all keyed by that id, so a
    // duplicate would double the LLM spend and collide in the index. Keep the
    // higher-confidence candidate.
    const existingIndex = validated.findIndex((b) => b.technique_id === techniqueId);
    if (existingIndex >= 0) {
      if (candidate.llm_confidence <= validated[existingIndex].llm_confidence) continue;
      validated.splice(existingIndex, 1);
    }
    const tacticIds = entry.tacticIds;
    const severity = severityFromConfidence(candidate.llm_confidence);
    const parentTechniqueId = subtechnique?.parentTechniqueId;
    validated.push({
      ...candidate,
      technique_id: techniqueId,
      confidence: candidate.llm_confidence,
      technique_name: entry.name,
      reference: entry.reference,
      tactic_ids: tacticIds,
      ...(parentTechniqueId ? { parent_technique_id: parentTechniqueId } : {}),
      proposed_esql_rule: proposedEsqlRuleUnavailable({
        technique_id: techniqueId,
        technique_name: entry.name,
        tactic_ids: tacticIds,
        evidence_quote: candidate.evidence_quote,
        confidence: candidate.llm_confidence,
        severity,
        report_id: reportId,
        ...(parentTechniqueId ? { parent_technique_id: parentTechniqueId } : {}),
      }),
      rule_name: sanitizeRuleName(techniqueId, entry.name, reportId),
      severity,
      risk_score: severityToRiskScore(severity),
      execution: NO_EXECUTION,
    });
  }

  if (validated.length > 0 && !esClient) {
    logger.debug(
      '[hunt:esql] no Elasticsearch client — grounded ES|QL generation skipped, ' +
        'behaviors carry a non-executable placeholder.'
    );
  }

  // Techniques the generation budget left unsearched. Reported rather than only
  // logged: a behavior that kept its placeholder is indistinguishable in
  // `behaviors` from one whose grounded query ran and found nothing, and the
  // caller retires the report either way.
  const uncorroboratedIds: string[] = [];

  if (validated.length > 0 && esClient) {
    // Highest confidence first, so a report that overruns the budget spends it on
    // its best-supported behaviors rather than whichever the model emitted first.
    const generationTargets = [...validated]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_GENERATED_BEHAVIORS);
    if (generationTargets.length < validated.length) {
      const targeted = new Set(generationTargets.map((b) => b.technique_id));
      uncorroboratedIds.push(
        ...validated.filter((b) => !targeted.has(b.technique_id)).map((b) => b.technique_id)
      );
      logger.warn(
        `[hunt:esql] ${validated.length} validated behaviors exceed the generation budget of ` +
          `${MAX_GENERATED_BEHAVIORS}; ${uncorroboratedIds.length} techniques are left ` +
          `uncorroborated and keep a non-executable placeholder: ${uncorroboratedIds.join(', ')}.`
      );
    }
    const groundedEsql = await generateGroundedEsql({
      model,
      esClient,
      logger,
      behaviors: generationTargets,
      text,
      iocs,
      articleContext,
      requiredIndices,
      rowLimit: rowLimit ?? DEFAULT_PROPOSED_RULE_LIMIT,
    });
    for (const behavior of validated) {
      const esql = groundedEsql.get(behavior.technique_id);
      if (!esql) continue;
      behavior.proposed_esql_rule = `${buildGroundedEsqlHeader(behavior)}\n${esql}`;
      if (!canExecute) continue;
      const executed = await executeValidatedEsql({
        esClient,
        logger,
        techniqueId: behavior.technique_id,
        esql,
        window: window!,
        row_limit: rowLimit!,
        requiredIndices,
      });
      behavior.execution = executed.execution;
      if (executed.affected_hosts) behavior.affected_hosts = executed.affected_hosts;
      if (executed.affected_users) behavior.affected_users = executed.affected_users;
      if (executed.affected_hosts_truncated) behavior.affected_hosts_truncated = true;
      if (executed.affected_users_truncated) behavior.affected_users_truncated = true;
      if (executed.hits) behavior.hits = executed.hits;
    }
  }

  const hasHit = validated.some((b) => b.execution?.hit === true);

  logger.debug(
    `hunt_behavior validated=${validated.length} dropped=${droppedIds.length} ` +
      `has_hit=${hasHit} report_id=${reportId}`
  );

  const partialSuffix =
    uncorroboratedIds.length > 0
      ? ` ${uncorroboratedIds.length} of ${validated.length} techniques exceeded the per-run ` +
        `generation budget and were never searched, so this report is only partially ` +
        `corroborated: ${uncorroboratedIds.join(', ')}.`
      : '';

  return {
    status: validated.length === 0 ? 'no_behaviors_validated' : 'behaviors_proposed',
    report_id: reportId,
    behaviors: validated,
    indexed_behaviors: toIndexedBehaviors(validated, reportId),
    has_hit: hasHit,
    ...(droppedIds.length > 0 && { dropped_unknown_ids: droppedIds }),
    ...(uncorroboratedIds.length > 0 && { uncorroborated_technique_ids: uncorroboratedIds }),
    next_step:
      validated.length === 0
        ? 'No candidates matched the canonical ATT&CK catalog. The LLM may have ' +
          'hallucinated technique IDs; consider lowering the LLM threshold or falling ' +
          'back to IOC matching for this report.'
        : hasHit
        ? `Behaviors proposed; at least one grounded query hit a required index.${partialSuffix}`
        : `Behaviors proposed for Investigation staging.${partialSuffix}`,
  };
};
