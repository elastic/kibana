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
import type {
  HuntBehaviorArticleContext,
  HuntBehaviorIoc,
  HostOrigin,
  HuntForThreatHit,
  HuntIncompleteness,
  HuntIncompleteReason,
} from '@kbn/alertzero-common';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import type { HuntBehaviorModels } from '../types';
import { isIndexExclusion } from '../../../../../common/remote_cluster';
import { originOfIndices } from '../common/host_origin';
import { buildMatchesRequired } from '../common/matches_required';
import {
  huntBehaviorLlmExtractionSchema,
  EXTRACTION_PROMPT,
  CONTEXT_PREAMBLE,
  ESQL_GENERATION_INSTRUCTIONS,
} from './extraction_contract';
import { collapseByArtifactSet, queryHuntsArtifacts } from './behavior_artifact_set';
import { toIndexedBehaviors } from './indexed_behaviors';
import { getMitreCatalog } from './mitre_catalog';
import { assertEsqlSourcesAllowed } from './assert_esql_sources_allowed';
import { scopedEsqlProbeClient } from './scoped_esql_probe_client';
import { assertEsqlGroundedInReport, isEvidenceQuoteGrounded } from './report_grounding';
import { invokeHuntStructured } from '../common/invoke_hunt_structured';
import {
  HUNT_BEHAVIOR_EXTRACTION_TEMPLATE_ID,
  HUNT_EXTRACTION_ENVIRONMENT_CONTEXT_MAX_CHARS,
  HUNT_EXTRACTION_REPORT_TEXT_MAX_CHARS,
  HUNT_PROMPT_TEMPLATE_VERSION,
  clampHuntTemplateString,
} from '../common/hunt_prompt_templates';
import { prepareEsqlForExecute } from './prepare_esql_for_execute';
import type {
  BehaviorExecution,
  HuntBehaviorParams,
  HuntBehaviorResult,
  SeverityLevel,
  ValidatedBehavior,
} from './types';

const MAX_AFFECTED_ENTITIES = 20;
/** `HostOrigin.name` schema cap. */
const MAX_ORIGIN_NAME_LENGTH = 512;
/** Cap Tier 2 Discover refs to match SSE `events[]` / `alerts[]` max. */
const MAX_HITS = 50;

/**
 * A behavior with no execution result. `reason` is omitted only where nothing went
 * wrong — the caller passed no client or no window, so corroboration was never
 * asked for. Everywhere else it has to be named, because `executed: false` alone
 * reads as "searched and found nothing" to whoever writes the hunt's evidence.
 */
const notExecuted = (reason?: HuntIncompleteReason): BehaviorExecution => ({
  executed: false,
  row_count: 0,
  hit: false,
  ...(reason ? { inconclusive_reason: reason } : {}),
});

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

const buildHuntTitle = (techniqueId: string, techniqueName: string, reportId?: string): string => {
  const safe = techniqueName.replace(/[()\/\\]/g, '').trim();
  return reportId
    ? `Hunt: ${safe} (${techniqueId}) [${reportId.slice(0, 8)}]`
    : `Hunt: ${safe} (${techniqueId})`;
};

/**
 * Joins `//` lines with every interpolated value flattened onto its own line. A
 * `//` comment ends at the line break, so a model-supplied value carrying one —
 * an `evidence_quote` is report prose, and `slice` bounds its length without
 * touching its newlines — ends the comment early and leaves whatever followed it
 * as ES|QL. That turns the placeholder below into an executable query, which is
 * precisely what it exists not to be, so the flattening belongs here rather than
 * at each call site where the next line added would forget it.
 */
const commentBlock = (lines: string[]): string =>
  lines.map((line) => line.replace(/\s+/g, ' ').trim()).join('\n');

/**
 * Non-executable placeholder when grounded generation is unavailable or fails.
 * Never emits a FROM clause — a prior `FROM *` stub was unsafe to leave
 * executable even though the execute path skipped it.
 */
const huntQueryUnavailable = ({
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
  const title = buildHuntTitle(technique_id, technique_name, report_id);
  return commentBlock([
    `// hunt: ${title}`,
    `// technique: ${technique_id} (${technique_name})`,
    `// tactics: ${tactic_ids.join(', ') || '<unmapped>'}`,
    `// severity: ${severity}  confidence: ${confidence.toFixed(2)}`,
    `// evidence: ${evidence_quote.slice(0, 120)}`,
    `// Grounded ES|QL generation unavailable; no hunt query executed.`,
  ]);
};

const buildGroundedEsqlHeader = (b: {
  title: string;
  severity: SeverityLevel;
  risk_score: number;
  technique_id: string;
  parent_technique_id?: string;
  tactic_ids: string[];
}): string =>
  commentBlock([
    `// Generated from hunt.hunt_behavior — grounded in the report's extracted`,
    `// IOCs/behaviors and validated against the target index mappings.`,
    `// hunt: ${b.title}`,
    `// severity: ${b.severity}  risk_score: ${b.risk_score}`,
    `// mitre_attack: ${b.technique_id}${
      b.parent_technique_id ? ` (parent ${b.parent_technique_id})` : ''
    }`,
    `// tactics: ${b.tactic_ids.join(', ') || '<unmapped>'}`,
  ]);

const MAX_ESQL_PROMPT_IOCS = 30;
const MAX_ESQL_PROMPT_TEXT_CHARS = 6000;
/**
 * Aggregate budget for the sample-events section, alongside `summarizeHit`'s own per-event
 * cap. `max_tier2_sample_events` (up to 50) bounds the array length but not its total size, so
 * without this a full page of events is ~100 KB repeated once per behavior (up to 20 calls),
 * either a large token bill or a context-limit failure — which surfaces as the retryable
 * `generation_failed`, so the run comes back and does it again.
 */
const MAX_ESQL_PROMPT_SAMPLE_EVENTS_CHARS = 8000;
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
/** Matches the `evidence_quote` cap of the package-report step input. */
const MAX_EVIDENCE_QUOTE_CHARS = 2000;
/** LIMIT the generator writes into a hunt query when the caller has no row bound. */
const DEFAULT_HUNT_QUERY_LIMIT = 100;
/**
 * Generation target when neither Tier 1 hits nor the scope name an index (the
 * standalone route). Letting the generator discover one lands on a dated
 * physical index, which is never what a hunt query should cite.
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
 * Where each kept host was seen, from the `_index` of the rows that named it. Every row here
 * already passed the required-index check, so `_index` is always a string. A name longer than
 * the origin schema allows gets no origin, which packaging reads as unknown. When the rows hit
 * the query's cap, a host's local rows may be past it, so only local origins are kept.
 */
const hostOriginsOf = (
  rows: unknown[][],
  hostCol: number,
  indexCol: number,
  hosts: string[],
  saturated: boolean
): HostOrigin[] => {
  const indicesByHost = new Map(
    hosts
      .filter((name) => name.length <= MAX_ORIGIN_NAME_LENGTH)
      .map((name) => [name, new Set<string>()])
  );
  for (const row of rows) {
    const host = row[hostCol];
    const index = row[indexCol];
    if (typeof host !== 'string' || typeof index !== 'string') continue;
    indicesByHost.get(host.trim())?.add(index);
  }
  return [...indicesByHost].flatMap(([name, indices]) => {
    const origin = originOfIndices(indices);
    return origin && (origin.local || !saturated) ? [{ name, ...origin }] : [];
  });
};

/**
 * The most rows the executed query could return: `executeEsql` keeps `min(N, limit)` for a
 * trailing `LIMIT N`, and a `LIMIT` earlier in the pipeline caps it too. A `LIMIT` inside a
 * string literal only lowers the cap, which leaves more origins unknown.
 */
const rowCapOf = (query: string, limit: number): number =>
  Math.min(limit, ...[...query.matchAll(/\bLIMIT\s+(\d+)/gi)].map(([, n]) => Number(n)));

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
  allowedIndices,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  techniqueId: string;
  esql: string;
  window: { from: string; to: string };
  row_limit: number;
  allowedIndices: string[];
}): Promise<{
  execution: BehaviorExecution;
  affected_hosts?: string[];
  affected_users?: string[];
  affected_host_origins?: HostOrigin[];
  affected_hosts_truncated?: boolean;
  affected_users_truncated?: boolean;
  hits?: HuntForThreatHit[];
}> => {
  const matchesRequired = buildMatchesRequired(allowedIndices);

  try {
    const prepared = prepareEsqlForExecute(esql);
    const sourcesAllowed = assertEsqlSourcesAllowed(prepared, allowedIndices);
    if (!sourcesAllowed.ok) {
      logger.warn(
        `[hunt:esql] execute for ${techniqueId} refused — ${sourcesAllowed.reason}. ` +
          `Recording executed:false and continuing.`
      );
      return { execution: notExecuted('query_out_of_scope') };
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

    // Aggregating pipelines (STATS, etc.) drop METADATA columns. Rows existed but
    // the required-index hit bar cannot evaluate them, so the `hit: false` below is
    // "could not tell", not "nothing there" — the two have to stay distinguishable
    // because only one of them is evidence of a clean environment.
    const rowsUnclassifiable = values.length > 0 && indexCol < 0;
    if (rowsUnclassifiable) {
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
    const saturated = values.length >= rowCapOf(prepared, row_limit);
    const hostOrigins = hosts
      ? hostOriginsOf(requiredRows, hostCol, indexCol, hosts.items, saturated)
      : [];

    // `prepareEsqlForExecute` injects `METADATA _id`/`_index` but deliberately does
    // not undo a `DROP _id` the model wrote, so a query can keep `_index` — enough to
    // confirm required-index rows — while losing the ids the refs are built from. The
    // hit stands, since rows really did match; what it cannot do is show its work, so
    // downstream event attachment needs to hear that rather than render nothing.
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

    const refsUnavailable = requiredRows.length > 0 && hits.length === 0;
    if (refsUnavailable) {
      logger.warn(
        `[hunt:esql] execute for ${techniqueId} confirmed ${requiredRows.length} required-index ` +
          `row(s) but produced no document refs (the query dropped _id), so the confirmed hit ` +
          `carries no evidence to show.`
      );
    }

    return {
      execution: {
        executed: true,
        row_count: requiredRows.length,
        hit: requiredRows.length > 0,
        ...(rowsUnclassifiable
          ? { inconclusive_reason: 'rows_unclassifiable' as const }
          : refsUnavailable
          ? { inconclusive_reason: 'refs_unavailable' as const }
          : {}),
      },
      ...(hosts && hosts.items.length > 0
        ? {
            affected_hosts: hosts.items,
            ...(hostOrigins.length > 0 ? { affected_host_origins: hostOrigins } : {}),
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
    return { execution: notExecuted('execute_failed') };
  }
};

/**
 * Target for `generateEsql`: one query over the full allowed scope
 * (`tier2_targets`, threaded through as `allowedIndices`), not narrowed to
 * whichever concrete index Tier 1's per-index buckets happened to hit. A
 * coincidental IOC match landing in an unrelated dataset that shares a
 * wildcard can no longer misdirect the FROM this way, since the FROM
 * always covers the whole allowed scope regardless of which specific bucket
 * confirmed the hit. Per-behavior host-vs-cloud target choice is future work.
 */
const resolveGenerationIndex = (allowedIndices: string[]): string => {
  // Exclusion entries (`-logs-elastic_agent*`) belong to the search, not to a FROM.
  const positives = allowedIndices.filter((pattern) => !isIndexExclusion(pattern));
  return positives.length > 0 ? positives.join(',') : DEFAULT_GENERATION_INDEX;
};

/**
 * Caps the joined sample-events section to `maxChars` by keeping as many whole events,
 * in order, as fit the budget — always at least the first, even if it alone exceeds it,
 * so one oversized event cannot empty the section. Bounding by whole events rather than
 * slicing the joined string keeps every kept event complete instead of cut off mid-line.
 */
const boundSampleEvents = (events: string[], maxChars: number): string[] => {
  const kept: string[] = [];
  let total = 0;
  for (const event of events) {
    const next = total + event.length + 1; // +1 for the joining newline
    if (kept.length > 0 && next > maxChars) break;
    kept.push(event);
    total = next;
  }
  return kept;
};

/** Report-level grounding shared by every per-behavior generation call. */
const buildGenerationContext = ({
  text,
  iocs,
  excludedIocs,
  articleContext,
}: {
  text: string;
  iocs?: HuntBehaviorIoc[];
  excludedIocs?: HuntBehaviorIoc[];
  articleContext?: HuntBehaviorArticleContext;
}): string => {
  const sections: string[] = [];
  if (articleContext?.sample_events?.length) {
    const boundedEvents = boundSampleEvents(
      articleContext.sample_events,
      MAX_ESQL_PROMPT_SAMPLE_EVENTS_CHARS
    );
    sections.push(
      `--- SAMPLE MATCHED ENVIRONMENT EVENTS ---\n${boundedEvents
        .map((evt) => `- ${evt}`)
        .join('\n')}`
    );
  }
  if (excludedIocs?.length) {
    sections.push(
      `--- ADJUDICATED OUT (do not hunt these values) ---\n${excludedIocs
        .slice(0, MAX_ESQL_PROMPT_IOCS)
        .map((ioc) => `- ${ioc.type}: ${ioc.value}`)
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
 * One behavior's outcome from {@link generateGroundedEsql}: either a query ready to hand to
 * the outer source/grounding gates (grounded in-scope, or out-of-scope and passed through
 * untouched so the outer source gate labels it `query_out_of_scope` as today), or a query that
 * stayed ungrounded through the retry, carrying the first gate's rejection reason.
 */
type GeneratedEsqlEntry =
  | { outcome: 'generated'; techniqueId: string; esql: string }
  | { outcome: 'ungrounded'; techniqueId: string; reason: string };

/**
 * One `generateEsql` call per validated behavior, keyed by technique id, followed by this
 * module's own grounding check and — on the first failure — exactly one corrective retry that
 * hands the model its own rejected query and the gate's reason. The shared generator still
 * grounds the query in ES|QL docs and the target's mappings, autocorrects, validates the AST,
 * and retries on its own schedule; that loop is unchanged and separate from this one.
 *
 * Returns two maps rather than one: `generated` holds every query this function hands on to
 * the publish loop's own source/grounding gates (grounded in-scope queries, plus out-of-scope
 * queries passed through so the outer source gate labels them, exactly as before this function
 * existed); `ungrounded` holds the first gate's rejection reason for a behavior that stayed
 * ungrounded through the retry. A technique id in neither map means generation itself failed
 * (an `error`, no query, or a throw), unchanged from before.
 */
const generateGroundedEsql = async ({
  esqlModel,
  esClient,
  logger,
  behaviors,
  text,
  iocs,
  excludedIocs,
  articleContext,
  allowedIndices,
  rowLimit,
}: {
  esqlModel: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
  behaviors: ValidatedBehavior[];
  text: string;
  iocs?: HuntBehaviorIoc[];
  excludedIocs?: HuntBehaviorIoc[];
  articleContext?: HuntBehaviorArticleContext;
  allowedIndices: string[];
  rowLimit: number;
}): Promise<{ generated: Map<string, string>; ungrounded: Map<string, string> }> => {
  const index = resolveGenerationIndex(allowedIndices);
  const additionalContext = buildGenerationContext({ text, iocs, excludedIocs, articleContext });
  // The schema probe runs the model's FROM before the publish/execute scope gate, so gate the
  // client it runs on with the same allowlist — an out-of-scope probe is refused before it
  // reaches Elasticsearch, and generation falls back to the non-executable placeholder.
  const probeClient = scopedEsqlProbeClient(esClient, allowedIndices);
  const iocValues = (iocs ?? []).map((ioc) => ioc.value);
  const excludedIocValues = (excludedIocs ?? []).map((ioc) => ioc.value);

  const entries = await pMap(
    behaviors,
    async (behavior): Promise<GeneratedEsqlEntry | undefined> => {
      // Shared across both calls: only `additionalInstructions` differs on the retry.
      const baseArgs = {
        model: esqlModel,
        esClient: probeClient,
        logger,
        nlQuery:
          `Hunt for MITRE ATT&CK ${behavior.technique_id} (${behavior.technique_name}) ` +
          `as described by this report evidence: "${behavior.evidence_quote}"`,
        index,
        additionalContext,
        // The hunt window is bound as an execute-time filter, not ?_tstart/?_tend params.
        disableNamedParams: true,
        // AST-validate against mappings, then probe-execute (LIMIT 1) so environment
        // errors feed the generator's retry loop. The real execute runs below with
        // METADATA columns and the hunt window.
        execute: 'schema' as const,
        rowLimit,
      };
      try {
        const { query, error } = await generateEsql({
          ...baseArgs,
          additionalInstructions: ESQL_GENERATION_INSTRUCTIONS,
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
        const esql = query.trim();
        // Out of scope → hand it on unchanged, no retry: the outer source gate labels it
        // `query_out_of_scope` exactly as today.
        const sourcesAllowed = assertEsqlSourcesAllowed(
          prepareEsqlForExecute(esql),
          allowedIndices
        );
        if (!sourcesAllowed.ok) {
          return { outcome: 'generated', techniqueId: behavior.technique_id, esql };
        }
        // Raw `query.trim()`, the same input the outer grounding gate uses today.
        const grounded = assertEsqlGroundedInReport(esql, {
          reportText: text,
          iocValues,
          excludedIocValues,
        });
        if (grounded.ok) {
          return { outcome: 'generated', techniqueId: behavior.technique_id, esql };
        }
        const firstReason = grounded.reason;
        // Debug-level, exact shape, so a future local run can be harvested into fixtures by
        // grepping `[hunt:esql] ungrounded query`.
        logger.debug(
          `[hunt:esql] ungrounded query technique=${behavior.technique_id} attempt=1 ` +
            `reason=${firstReason}\n${esql.slice(0, 2000)}`
        );
        const retryInstructions =
          `${ESQL_GENERATION_INSTRUCTIONS}\n\n` +
          `Your previous query was rejected because it is not grounded in the report:\n\n` +
          `${esql.slice(0, 4000)}\n\n` +
          `Rejection reason: ${firstReason}\n\n` +
          `Rewrite the query so every OR branch, IN member and FORK branch filters on a ` +
          `verbatim report artifact; remove any branch that does not. Do not add new generic ` +
          `branches.`;
        try {
          const { query: retryQuery, error: retryError } = await generateEsql({
            ...baseArgs,
            additionalInstructions: retryInstructions,
          });
          if (retryError || !retryQuery) {
            logger.warn(
              `[hunt:esql] grounded ES|QL retry for ${behavior.technique_id} failed — ` +
                `keeping the non-executable placeholder. first reason: ${firstReason}; ` +
                `second-call error: ${(retryError ?? 'no query returned').slice(0, 300)}`
            );
            return {
              outcome: 'ungrounded',
              techniqueId: behavior.technique_id,
              reason: firstReason,
            };
          }
          // No source pre-check of its own: an out-of-scope retry still grounds here and lands
          // in `generated`, where the outer source gate labels it as today.
          const retryEsql = retryQuery.trim();
          const retryGrounded = assertEsqlGroundedInReport(retryEsql, {
            reportText: text,
            iocValues,
            excludedIocValues,
          });
          if (retryGrounded.ok) {
            return { outcome: 'generated', techniqueId: behavior.technique_id, esql: retryEsql };
          }
          logger.debug(
            `[hunt:esql] ungrounded query technique=${behavior.technique_id} attempt=2 ` +
              `reason=${retryGrounded.reason}\n${retryEsql.slice(0, 2000)}`
          );
          logger.warn(
            `[hunt:esql] discarding the retried query for ${behavior.technique_id} — ` +
              `first reason: ${firstReason}; second reason: ${retryGrounded.reason}. ` +
              `Keeping the non-executable placeholder.`
          );
          return { outcome: 'ungrounded', techniqueId: behavior.technique_id, reason: firstReason };
        } catch (retryErr) {
          logger.warn(
            `[hunt:esql] grounded ES|QL retry for ${behavior.technique_id} threw — ` +
              `keeping the non-executable placeholder. first reason: ${firstReason}; ` +
              `second-call error: ${((retryErr as Error).message ?? '').slice(0, 300)}`
          );
          return { outcome: 'ungrounded', techniqueId: behavior.technique_id, reason: firstReason };
        }
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

  const generated = new Map<string, string>();
  const ungrounded = new Map<string, string>();
  for (const entry of entries) {
    if (!entry) continue;
    if (entry.outcome === 'generated') {
      generated.set(entry.techniqueId, entry.esql);
    } else {
      ungrounded.set(entry.techniqueId, entry.reason);
    }
  }
  if (generated.size < behaviors.length) {
    logger.warn(
      `[hunt:esql] grounded ES|QL generation covered ${generated.size}/${behaviors.length} ` +
        `behaviors — uncovered behaviors fall back to a non-executable placeholder.`
    );
  }
  return { generated, ungrounded };
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
  models: HuntBehaviorModels,
  logger: Logger,
  params: HuntBehaviorParams,
  esClient?: ElasticsearchClient,
  mitreDataClient?: MitreAttackDataClient
): Promise<HuntBehaviorResult> => {
  const {
    text,
    report_id: reportId,
    llm_confidence_threshold: llmThreshold = 0.5,
    iocs,
    excluded_iocs: excludedIocs,
    article_context: articleContext,
    window,
    size,
    row_limit: rowLimitFromParams,
    allowed_indices: allowedIndices = [],
  } = params;

  const rowLimit = size ?? rowLimitFromParams;
  const canExecute =
    window !== undefined &&
    rowLimit !== undefined &&
    allowedIndices.length > 0 &&
    esClient !== undefined;

  // Load the catalog first so a run without one pays for no model call. An empty catalog is a
  // deployment-side gap (population failed or data missing), not evidence the model invented ids.
  const { techniqueById, subtechniqueById } = await getMitreCatalog({
    mitreDataClient,
    logger,
  });
  if (techniqueById.size === 0 && subtechniqueById.size === 0) {
    logger.warn(
      '[hunt:extract] the managed MITRE ATT&CK data is unavailable; extraction was skipped and ' +
        'no technique was verified or hunted.'
    );
    // Nothing was extracted, so there is no per-technique gap to name: one report-level
    // entry (no technique_id), retryable by `completeness.ts`.
    return {
      status: 'no_behaviors_validated',
      report_id: reportId,
      behaviors: [],
      indexed_behaviors: [],
      has_hit: false,
      incomplete: [
        {
          reason: 'catalog_unavailable',
          detail:
            'The managed MITRE ATT&CK data is unavailable (mitreAttack plugin disabled, ' +
            'population failed, or data missing), so no technique could be extracted or ' +
            'verified and the report was not hunted.',
        },
      ],
      next_step:
        'Managed MITRE ATT&CK data is unavailable; retry the hunt once the mitreAttack plugin ' +
        'has populated its data.',
    };
  }

  const contextBlock = renderArticleContext(articleContext);
  const result = await invokeHuntStructured({
    model: models.extraction,
    // ES|QL stays on a messages model when extraction's connector requires a
    // template, so it can take the call if the gateway rejects that template.
    messagesFallback: models.esql,
    schema: huntBehaviorLlmExtractionSchema,
    prompt: `${EXTRACTION_PROMPT}${contextBlock}\n\n--- REPORT TEXT ---\n${text}`,
    logger,
    template: {
      id: HUNT_BEHAVIOR_EXTRACTION_TEMPLATE_ID,
      version: HUNT_PROMPT_TEMPLATE_VERSION,
      variables: {
        environment_context: clampHuntTemplateString(
          contextBlock,
          HUNT_EXTRACTION_ENVIRONMENT_CONTEXT_MAX_CHARS
        ),
        report_text: clampHuntTemplateString(text, HUNT_EXTRACTION_REPORT_TEXT_MAX_CHARS),
      },
    },
  });
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
  const ungroundedQuoteIds: string[] = [];

  for (const candidate of candidates) {
    const technique = techniqueById.get(candidate.technique_id);
    const subtechnique = technique ? undefined : subtechniqueById.get(candidate.technique_id);
    const entry = technique ?? subtechnique;
    if (!entry) {
      droppedIds.push(candidate.technique_id);
      continue;
    }
    // The extraction contract promises a verbatim quote, but only the technique id is
    // verified above. A real id paired with a fabricated quote would still become a
    // proposed behavior and an indexed finding attributed to this report, so drop a
    // candidate whose quote is not grounded in the report text.
    if (!isEvidenceQuoteGrounded(candidate.evidence_quote, text)) {
      ungroundedQuoteIds.push(candidate.technique_id);
      continue;
    }
    // A revoked id resolves to its live successor; carry the live id forward so
    // the hunt query and the indexed projection never cite a retired technique.
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
      // Bounded for packaging's input schema; grounding above already used the full quote.
      evidence_quote: candidate.evidence_quote.slice(0, MAX_EVIDENCE_QUOTE_CHARS),
      technique_id: techniqueId,
      confidence: candidate.llm_confidence,
      technique_name: entry.name,
      reference: entry.reference,
      tactic_ids: tacticIds,
      ...(parentTechniqueId ? { parent_technique_id: parentTechniqueId } : {}),
      validated_esql: huntQueryUnavailable({
        technique_id: techniqueId,
        technique_name: entry.name,
        tactic_ids: tacticIds,
        evidence_quote: candidate.evidence_quote,
        confidence: candidate.llm_confidence,
        severity,
        report_id: reportId,
        ...(parentTechniqueId ? { parent_technique_id: parentTechniqueId } : {}),
      }),
      title: buildHuntTitle(techniqueId, entry.name, reportId),
      severity,
      risk_score: severityToRiskScore(severity),
      // No reason yet: generation below either fills this in with a real query's
      // result or replaces it with the reason the query never ran.
      execution: notExecuted(),
    });
  }

  if (ungroundedQuoteIds.length > 0) {
    logger.warn(
      `[hunt:extract] dropped ${ungroundedQuoteIds.length} candidate(s) whose evidence_quote ` +
        `was not found verbatim in the report text: ${ungroundedQuoteIds.join(', ')}.`
    );
  }

  // Every technique this run was asked about and could not corroborate, with why.
  // One list rather than a field per cause: a caller deciding whether a report was
  // actually hunted has to read all of them, and each new cause added as its own
  // optional field is one more a caller can miss and read silence as coverage.
  const incomplete: HuntIncompleteness[] = [
    ...droppedIds.map((technique_id) => ({
      reason: 'unknown_technique_id' as const,
      technique_id,
      detail: `${technique_id} is not in the ATT&CK catalog, so it was never searched for.`,
    })),
    ...ungroundedQuoteIds.map((technique_id) => ({
      reason: 'quote_ungrounded' as const,
      technique_id,
      detail:
        `The quote offered as evidence for ${technique_id} is not in the report, so the ` +
        `technique was dropped rather than attributed to it.`,
    })),
  ];
  const gap = (technique_id: string, reason: HuntIncompleteReason, detail: string): void => {
    incomplete.push({ reason, technique_id, detail });
  };

  if (validated.length > 0 && !esClient) {
    logger.debug(
      '[hunt:esql] no Elasticsearch client — grounded ES|QL generation skipped, ' +
        'behaviors carry a non-executable placeholder.'
    );
  }

  if (validated.length > 0 && esClient) {
    // Behaviors whose evidence names the same report artifacts are hunting the same thing
    // under different technique ids, so pay for one query per shared artifact set rather than
    // one per technique — and do it before the budget slice below, so a duplicate never spends
    // a slot a distinct behavior could have used. Siblings are not written off here, though:
    // they are deferred behind their survivor and generated in a second wave with whatever
    // budget remains, and only one that loses to the budget is settled on what the survivor's
    // query turned out to search.
    const { survivors, collapsed: collapsedSiblings } = collapseByArtifactSet(validated, iocs);

    // Highest confidence first, so a report that overruns the budget spends it on
    // its best-supported behaviors rather than whichever the model emitted first.
    const generationTargets = [...survivors]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_GENERATED_BEHAVIORS);
    const targeted = new Set(generationTargets.map((b) => b.technique_id));
    if (generationTargets.length < survivors.length) {
      const skipped = survivors.filter((b) => !targeted.has(b.technique_id));
      for (const behavior of skipped) {
        behavior.execution = notExecuted('generation_budget');
        gap(
          behavior.technique_id,
          'generation_budget',
          `The run reached its budget of ${MAX_GENERATED_BEHAVIORS} generated queries before ` +
            `${behavior.technique_id}, so no query was written for it and it was never searched.`
        );
      }
      logger.warn(
        `[hunt:esql] ${survivors.length} surviving behaviors exceed the generation budget of ` +
          `${MAX_GENERATED_BEHAVIORS}; ${skipped.length} techniques are left ` +
          `uncorroborated and keep a non-executable placeholder: ` +
          `${skipped.map((b) => b.technique_id).join(', ')}.`
      );
    }

    // A sibling whose survivor missed the budget cut was never going to be covered: nothing
    // hunted those artifacts, so it gets `generation_budget` rather than a coverage claim.
    const deferredSiblings = collapsedSiblings.filter((c) => targeted.has(c.survivor.technique_id));
    for (const { behavior, survivor } of collapsedSiblings) {
      if (targeted.has(survivor.technique_id)) continue;
      behavior.execution = notExecuted('generation_budget');
      gap(
        behavior.technique_id,
        'generation_budget',
        `The run reached its budget of ${MAX_GENERATED_BEHAVIORS} generated queries before ` +
          `${survivor.technique_id} (which shares report artifacts with ${behavior.technique_id}), ` +
          `so neither was generated and ${behavior.technique_id} was never searched.`
      );
    }

    /**
     * Carries one generated query through the publish gates and, when the run has a window,
     * execution. Returns the published query so a caller can see what the behavior now hunts,
     * or `undefined` when the behavior kept its placeholder.
     */
    const publishBehavior = async (
      behavior: ValidatedBehavior,
      groundedEsql: Awaited<ReturnType<typeof generateGroundedEsql>>
    ): Promise<string | undefined> => {
      const esql = groundedEsql.generated.get(behavior.technique_id);
      if (!esql) {
        const firstReason = groundedEsql.ungrounded.get(behavior.technique_id);
        if (firstReason) {
          behavior.execution = notExecuted('query_ungrounded');
          gap(
            behavior.technique_id,
            'query_ungrounded',
            `The query generated for ${behavior.technique_id} was discarded ` +
              `(${firstReason}), so the technique was never searched.`
          );
        } else {
          behavior.execution = notExecuted('generation_failed');
          gap(
            behavior.technique_id,
            'generation_failed',
            `No query could be generated for ${behavior.technique_id}, so it was never searched. ` +
              `A later run may succeed.`
          );
        }
        return undefined;
      }
      // Publication clears a source gate of its own. A staged rule reads as
      // grounded and authoritative to whoever picks it up in Investigation, so a
      // query reaching outside the indices a hunt may read must not be handed on
      // as one — it keeps the non-executable placeholder instead. The allowlist is
      // the one generation was steered by; an empty one allows nothing, so a caller
      // that passed no scope cannot reach `.kibana-*` or `*`.
      const sourcesAllowed = assertEsqlSourcesAllowed(prepareEsqlForExecute(esql), allowedIndices);
      if (!sourcesAllowed.ok) {
        logger.warn(
          `[hunt:esql] discarding the generated query for ${behavior.technique_id} — ` +
            `${sourcesAllowed.reason}. Keeping the non-executable placeholder.`
        );
        behavior.execution = notExecuted('query_out_of_scope');
        gap(
          behavior.technique_id,
          'query_out_of_scope',
          `The query generated for ${behavior.technique_id} was discarded (${sourcesAllowed.reason}), ` +
            `so the technique was never searched.`
        );
        return undefined;
      }
      // The source gate proves the query stays in scope; it does not prove the query
      // filters on anything from the report. An unfiltered query (`FROM <required> |
      // LIMIT 1`) clears the gate above, executes, returns an arbitrary row, and sets
      // `has_confirmed_hit` — a corroboration grounded in nothing. Require a literal
      // drawn from the report, or keep the non-executable placeholder.
      const groundedInReport = assertEsqlGroundedInReport(esql, {
        reportText: text,
        iocValues: (iocs ?? []).map((ioc) => ioc.value),
        excludedIocValues: (excludedIocs ?? []).map((ioc) => ioc.value),
      });
      if (!groundedInReport.ok) {
        logger.warn(
          `[hunt:esql] discarding the generated query for ${behavior.technique_id} — ` +
            `${groundedInReport.reason}. Keeping the non-executable placeholder.`
        );
        behavior.execution = notExecuted('query_ungrounded');
        gap(
          behavior.technique_id,
          'query_ungrounded',
          `The query generated for ${behavior.technique_id} was discarded ` +
            `(${groundedInReport.reason}), so the technique was never searched.`
        );
        return undefined;
      }
      behavior.validated_esql = `${buildGroundedEsqlHeader(behavior)}\n${esql}`;
      if (!canExecute) return esql;
      const executed = await executeValidatedEsql({
        esClient,
        logger,
        techniqueId: behavior.technique_id,
        esql,
        window: window!,
        row_limit: rowLimit!,
        allowedIndices,
      });
      behavior.execution = executed.execution;
      const executeReason = executed.execution.inconclusive_reason;
      if (executeReason) {
        gap(
          behavior.technique_id,
          executeReason,
          executeReason === 'refs_unavailable'
            ? `The query for ${behavior.technique_id} confirmed required-index rows but returned ` +
                `no document ids, so the hit cannot be shown.`
            : `The query for ${behavior.technique_id} ran but its result does not say whether the ` +
                `environment matched (${executeReason}).`
        );
      }
      if (executed.affected_hosts) behavior.affected_hosts = executed.affected_hosts;
      if (executed.affected_host_origins) {
        behavior.affected_host_origins = executed.affected_host_origins;
      }
      if (executed.affected_users) behavior.affected_users = executed.affected_users;
      if (executed.affected_hosts_truncated) behavior.affected_hosts_truncated = true;
      if (executed.affected_users_truncated) behavior.affected_users_truncated = true;
      if (executed.hits) behavior.hits = executed.hits;
      return esql;
    };

    const firstWave = await generateGroundedEsql({
      esqlModel: models.esql,
      esClient,
      logger,
      behaviors: generationTargets,
      text,
      iocs,
      excludedIocs,
      articleContext,
      allowedIndices,
      rowLimit: rowLimit ?? DEFAULT_HUNT_QUERY_LIMIT,
    });
    const published = new Map<string, string>();
    for (const behavior of validated) {
      // Budget-skipped and deferred behaviors are recorded elsewhere; re-reporting them
      // here as generation failures would name the same technique twice for two causes.
      if (!targeted.has(behavior.technique_id)) continue;
      const esql = await publishBehavior(behavior, firstWave);
      if (esql) published.set(behavior.technique_id, esql);
    }

    // Now the survivors' queries are known, settle their siblings. Sharing an artifact set was
    // reason enough to let the survivor generate first; it is not reason to drop the sibling's
    // technique for good, because a query written for the survivor's technique and evidence can
    // filter on the shared artifacts and still not express what the sibling's technique does
    // with them. So every deferred sibling gets its own generation while budget remains. Only
    // one that loses to the budget is settled on what its survivor did: `collapsed` when the
    // survivor published a query seen to filter on every shared artifact and that query executed
    // with a result that says something about the environment, since the artifacts were then
    // searched, and `generation_budget` otherwise, since nothing searched them. A survivor whose
    // query failed, returned an inconclusive result, or never ran (no window or client) searched
    // nothing, and recording its siblings as searched would skip them on every later run.
    const remainingBudget = Math.max(0, MAX_GENERATED_BEHAVIORS - generationTargets.length);
    const secondWave = deferredSiblings
      .map(({ behavior }) => behavior)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, remainingBudget);
    const secondWaveIds = new Set(secondWave.map((b) => b.technique_id));
    let collapsedCount = 0;
    let budgetCount = 0;
    for (const { behavior, survivor, key } of deferredSiblings) {
      if (secondWaveIds.has(behavior.technique_id)) continue;
      const survivorEsql = published.get(survivor.technique_id);
      const survivorSearched =
        survivor.execution?.executed === true && !survivor.execution.inconclusive_reason;
      const sharedValues = key.split('\u0000').join(', ');
      if (survivorEsql && survivorSearched && queryHuntsArtifacts(survivorEsql, key)) {
        collapsedCount += 1;
        behavior.execution = notExecuted('collapsed');
        gap(
          behavior.technique_id,
          'collapsed',
          (
            `The run reached its budget of ${MAX_GENERATED_BEHAVIORS} generated queries before ` +
            `${behavior.technique_id}; its report artifacts (${sharedValues}) were searched by the ` +
            `query for ${survivor.technique_id}, but no query for ${behavior.technique_id} itself ` +
            `was written.`
          ).slice(0, 500)
        );
      } else {
        budgetCount += 1;
        behavior.execution = notExecuted('generation_budget');
        gap(
          behavior.technique_id,
          'generation_budget',
          `The run reached its budget of ${MAX_GENERATED_BEHAVIORS} generated queries before ` +
            `${behavior.technique_id}, and the query for ${survivor.technique_id} did not search ` +
            `its report artifacts (${sharedValues}), so it was never searched.`
        );
      }
    }
    if (deferredSiblings.length > 0) {
      logger.info(
        `[hunt:esql] ${deferredSiblings.length} behavior(s) share report artifacts with a ` +
          `survivor; generating ${secondWave.length} with the remaining budget, ` +
          `${collapsedCount} collapsed onto a survivor query that searches their artifacts, ` +
          `${budgetCount} left to the budget gap.`
      );
    }
    if (secondWave.length > 0) {
      const secondWaveEsql = await generateGroundedEsql({
        esqlModel: models.esql,
        esClient,
        logger,
        behaviors: secondWave,
        text,
        iocs,
        excludedIocs,
        articleContext,
        allowedIndices,
        rowLimit: rowLimit ?? DEFAULT_HUNT_QUERY_LIMIT,
      });
      for (const behavior of validated) {
        if (!secondWaveIds.has(behavior.technique_id)) continue;
        await publishBehavior(behavior, secondWaveEsql);
      }
    }
  }

  const hasHit = validated.some((b) => b.execution?.hit === true);

  logger.debug(
    `hunt_behavior validated=${validated.length} dropped=${droppedIds.length} ` +
      `incomplete=${incomplete.length} has_hit=${hasHit} report_id=${reportId}`
  );

  const partialSuffix =
    incomplete.length > 0
      ? ` ${incomplete.length} technique${incomplete.length === 1 ? ' was' : 's were'} not ` +
        `corroborated, so this report is only partially hunted — see \`incomplete\` for which ` +
        `and why (${[...new Set(incomplete.map(({ reason }) => reason))].join(', ')}).`
      : '';

  return {
    status: validated.length === 0 ? 'no_behaviors_validated' : 'behaviors_proposed',
    report_id: reportId,
    behaviors: validated,
    indexed_behaviors: toIndexedBehaviors(validated, reportId),
    has_hit: hasHit,
    ...(incomplete.length > 0 && { incomplete }),
    next_step:
      validated.length === 0
        ? 'No extracted candidate survived validation: each was either absent from the ' +
          'canonical ATT&CK catalog or offered a quote the report does not contain. ' +
          'Consider lowering the LLM threshold or falling back to IOC matching for this ' +
          `report.${partialSuffix}`
        : hasHit
        ? `Behaviors proposed; at least one grounded query hit a required index.${partialSuffix}`
        : `Behaviors proposed for Investigation staging.${partialSuffix}`,
  };
};
