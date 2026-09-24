/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { z } from '@kbn/zod/v4';
import type { HuntBehaviorArticleContext, HuntBehaviorIoc } from '@kbn/alertzero-common';
import { buildMatchesRequired } from '../common/matches_required';
import {
  huntBehaviorLlmExtractionSchema,
  huntBehaviorEsqlGenerationSchema,
  EXTRACTION_PROMPT,
  CONTEXT_PREAMBLE,
  ESQL_GENERATION_PROMPT,
} from './extraction_contract';
import { toIndexedBehaviors } from './indexed_behaviors';
import { getMitreCatalog } from './mitre_catalog';
import { prepareEsqlForExecute } from './prepare_esql_for_execute';
import type {
  BehaviorExecution,
  BehaviorHitRef,
  HuntBehaviorParams,
  HuntBehaviorResult,
  SeverityLevel,
  ValidatedBehavior,
} from './types';

const ESQL_REQUEST_TIMEOUT = '30s';
const MAX_AFFECTED_ENTITIES = 20;
/** Cap Tier 2 Discover refs to match SSE `events[]` / `alerts[]` max. */
const MAX_HIT_REFS = 50;
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

/** Skeleton ES|QL template emitted when grounded generation is unavailable or fails. */
const proposedEsqlRule = ({
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
  const techniqueLower = technique_name.toLowerCase();
  return [
    `// rule_name: ${name}`,
    `// technique: ${technique_id} (${technique_name})`,
    `// tactics: ${tactic_ids.join(', ') || '<unmapped>'}`,
    `// severity: ${severity}  confidence: ${confidence.toFixed(2)}`,
    `// evidence: ${evidence_quote.slice(0, 120)}`,
    `FROM *`,
    `| WHERE TO_LOWER(message) LIKE "*${techniqueLower}*"`,
    `| LIMIT 100`,
  ].join('\n');
};

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

const validateEsqlAgainstEnvironment = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  techniqueId: string,
  esql: string
): Promise<string | undefined> => {
  let candidate = esql;
  for (let attempt = 0; attempt < MAX_ESQL_REPAIR_ATTEMPTS; attempt++) {
    try {
      await esClient.esql.query(
        { query: `${candidate}\n| LIMIT 0` },
        { requestTimeout: ESQL_REQUEST_TIMEOUT }
      );
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
 * Execute a dry-run-passed query in the hunt window. Hit bar counts only rows
 * whose `_index` matches a required pattern. Per-behavior errors record
 * `executed: false` and do not fail the tier.
 */
const executeValidatedEsql = async ({
  esClient,
  logger,
  techniqueId,
  esql,
  window,
  rowLimit,
  requiredIndices,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  techniqueId: string;
  esql: string;
  window: { from: string; to: string };
  rowLimit: number;
  requiredIndices: string[];
}): Promise<{
  execution: BehaviorExecution;
  affected_hosts?: string[];
  affected_users?: string[];
  affected_hosts_truncated?: boolean;
  affected_users_truncated?: boolean;
  hit_refs?: BehaviorHitRef[];
}> => {
  const prepared = prepareEsqlForExecute(esql, rowLimit);
  const matchesRequired = buildMatchesRequired(requiredIndices);

  try {
    const response = await esClient.esql.query(
      {
        query: prepared,
        filter: {
          range: {
            '@timestamp': { gte: window.from, lte: window.to },
          },
        },
      },
      { requestTimeout: ESQL_REQUEST_TIMEOUT }
    );

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
        `[ti:esql] execute for ${techniqueId} returned ${values.length} row(s) with no _index ` +
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

    const hitRefs: BehaviorHitRef[] = [];
    if (idCol >= 0 && indexCol >= 0) {
      for (const row of requiredRows) {
        if (hitRefs.length >= MAX_HIT_REFS) break;
        const eventId = row[idCol];
        const sourceIndex = row[indexCol];
        if (typeof eventId !== 'string' || eventId.length === 0) continue;
        if (typeof sourceIndex !== 'string' || sourceIndex.length === 0) continue;
        const timestamp = tsCol >= 0 ? row[tsCol] : undefined;
        hitRefs.push({
          event_id: eventId,
          source_index: sourceIndex,
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
      ...(hitRefs.length > 0 ? { hit_refs: hitRefs } : {}),
    };
  } catch (err) {
    logger.warn(
      `[ti:esql] execute for ${techniqueId} failed — recording executed:false and continuing. ` +
        `${((err as Error).message ?? '').slice(0, 300)}`
    );
    return { execution: NO_EXECUTION };
  }
};

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

  const fallbackPatterns = ['logs-*', '.alerts-security.alerts-*', 'metrics-*'];
  const indexPatterns = new Set<string>(
    // Use matched_indices from article_context as the primary patterns, or fall back to defaults.
    articleContext?.matched_indices && articleContext.matched_indices.length > 0
      ? articleContext.matched_indices
      : fallbackPatterns
  );
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
    row_limit: rowLimitParam,
    required_indices: requiredIndices = [],
  } = params;

  const rowLimit = size ?? rowLimitParam;
  const canExecute =
    window !== undefined &&
    rowLimit !== undefined &&
    requiredIndices.length > 0 &&
    esClient !== undefined;

  let candidates: Array<{ technique_id: string; evidence_quote: string; llm_confidence: number }> =
    [];
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
      hasHit: false,
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
      proposed_esql_rule: proposedEsqlRule({
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
        if (canExecute) {
          const executed = await executeValidatedEsql({
            esClient: esClient!,
            logger,
            techniqueId: behavior.technique_id,
            esql,
            window: window!,
            rowLimit: rowLimit!,
            requiredIndices,
          });
          behavior.execution = executed.execution;
          if (executed.affected_hosts) behavior.affected_hosts = executed.affected_hosts;
          if (executed.affected_users) behavior.affected_users = executed.affected_users;
          if (executed.affected_hosts_truncated) {
            behavior.affected_hosts_truncated = true;
          }
          if (executed.affected_users_truncated) {
            behavior.affected_users_truncated = true;
          }
          if (executed.hit_refs) behavior.hit_refs = executed.hit_refs;
        }
      }
    }
  }

  const hasHit = validated.some((b) => b.execution?.hit === true);

  logger.debug(
    `hunt_behavior validated=${validated.length} dropped=${droppedIds.length} ` +
      `hasHit=${hasHit} report_id=${reportId}`
  );

  return {
    status: validated.length === 0 ? 'no_behaviors_validated' : 'behaviors_proposed',
    report_id: reportId,
    behaviors: validated,
    indexed_behaviors: toIndexedBehaviors(validated, reportId),
    hasHit,
    ...(droppedIds.length > 0 && { dropped_unknown_ids: droppedIds }),
    next_step:
      validated.length === 0
        ? 'No candidates matched the canonical ATT&CK catalog. The LLM may have ' +
          'hallucinated technique IDs; consider lowering the LLM threshold or falling ' +
          'back to IOC matching for this report.'
        : hasHit
        ? 'Behaviors proposed; at least one grounded query hit a required index.'
        : 'Behaviors proposed for Investigation staging.',
  };
};
