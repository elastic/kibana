/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type {
  HuntBehaviorArticleContext,
  HuntCompleteness,
  HuntCoordinatorStatus,
  HuntForThreatResult,
  HuntIncompleteness,
  HuntIoc,
} from '@kbn/alertzero-common';
import type { HuntScopeResolution } from '@kbn/alertzero-common';
import {
  completedSuccessfully,
  FINAL_WHEN_NOTHING_SEARCHABLE,
  huntCompletenessOf,
} from './common/completeness';
import { resolveHuntScope } from './common/resolve_index_scope';
import { resolveTier2Targets } from './common/resolve_tier2_targets';
import type { Tier2TargetSource } from './common/resolve_tier2_targets';
import { generateRecommendations } from './common/build_recommendations';
import { buildHuntHeadline, buildHuntNarrative } from './common/build_hunt_narrative';
import type { HuntNarrativeContext } from './common/build_hunt_narrative';
import { isTier1SearchableIoc } from './tier1/attribute_hits';
import { loadReportHuntContext, MAX_HUNT_REPORT_TEXT_CHARS } from './common/load_report_context';
import type { ResolvedHuntScope } from './common/resolve_index_scope';
import type { HuntScopeReportContext } from './common/match_hunt_datasets';
import { SUMMARIZE_HIT_SOURCE_FIELDS, summarizeHit } from './common/summarize_hit';
import { huntForThreat, emptyHuntForThreatResult } from './tier1/hunt_for_threat';
import type { HuntForThreatServiceResult } from './tier1/types';
import { huntBehavior } from './tier2/hunt_behavior';
import type { HuntBehaviorResult } from './tier2/types';

export type HuntCoordinatorTier2SkipReason =
  | 'configured_never'
  | 'no_inference'
  | 'no_environment_hits'
  | 'no_report_text'
  /**
   * Every Tier 2 target signal came up empty: the report's vendor or product matched no
   * dataset, Tier 1 hit no index, no index in the universe carries process telemetry,
   * and the model found nothing (or had nothing to read). There is no index set for Tier 2 to
   * generate against. Deterministic for this run; not counted as lost coverage.
   */
  | 'no_tier2_targets'
  /**
   * Tier 1 mapped no searchable term and, under `on_hits`, the run had nothing for Tier 2
   * either: no report text and no vendor or product from the report. A run that has any of
   * those is not gated here, because `on_hits` gates on Tier 1 having run clean and Tier 1
   * never ran; it proceeds to Tier 2 as an `always` run would.
   */
  | 'no_searchable_input'
  | 'report_not_found'
  | 'scope_blocked'
  | 'tier2_failed';

export interface HuntCoordinatorParams {
  report_id?: string;
  spaceId: string;
  /**
   * The hunt universe: the space's Security Solution default data view patterns,
   * exclusions included. Tier 1 searches exactly this list; the caller reads it from the
   * `securitySolution:defaultIndex` setting.
   */
  indexPatterns: string[];
  text?: string;
  iocs?: HuntIoc[];
  techniques?: string[];
  time_range?: { from: string; to: string };
  size?: number;
  max_assets?: number;
  llm_confidence_threshold?: number;
  tier2_when?: 'on_hits' | 'always' | 'never';
  max_tier2_sample_events?: number;
  trigger: 'manual' | 'scheduled';
  run_id: string;
}

export interface HuntCoordinatorTier1 extends HuntForThreatResult {
  tier: 1;
}

export interface HuntCoordinatorTier2 extends HuntBehaviorResult {
  tier: 2;
}

/** The coordinator's structured outcome, before the Investigation narrative is derived from it. */
export interface HuntCoordinatorCoreResult {
  status: HuntCoordinatorStatus;
  report_id?: string;
  run_id: string;
  /**
   * What Tier 1 searched: the hunt universe, exclusions included, never an alerts index.
   * Empty when the scope was blocked, when resolution failed, or when the run stopped
   * before a scope existed.
   */
  index_patterns: string[];
  /**
   * What Tier 2 was allowed to read, target, and count as a hit, chosen after the report
   * was read and Tier 1 ran: the union of the datasets the report's vendor or product
   * matched, the indices Tier 1 hit, and `actionable_indices`, plus the model's matches
   * when the first two found nothing. Empty when the scope was blocked, resolution
   * failed, or no signal named a target.
   */
  tier2_targets: string[];
  /** The signals that contributed to `tier2_targets`. Empty when `tier2_targets` is. */
  tier2_target_sources: Tier2TargetSource[];
  /**
   * Streams and indices in the universe whose mapping carries `process.entity_id` or
   * `process.pid`: where a hit can become a Defend response action. A mapping says a host
   * can report process telemetry, not that it is enrolled; packaging decides that.
   */
  actionable_indices: string[];
  tier1: HuntCoordinatorTier1;
  tier2?: HuntCoordinatorTier2;
  tier2_skipped_reason?: HuntCoordinatorTier2SkipReason;
  message: string;
  next_step: string;
  /**
   * True when Tier 1 confirmed a hit in the searched universe or any Tier 2 behavior
   * executed with a hit in its targets. Callers that gate SSE emit / packaging
   * on the hit bar must read this field, not `tier1.has_confirmed_hit` alone.
   */
  has_confirmed_hit: boolean;
  /**
   * Whether the run covered what it was asked to. Read this, not
   * `completed_successfully`, when recording a hunt outcome: the difference between
   * `complete` and `incomplete_final` is the difference between "the environment is
   * clean" and "we could not look". `tier1.incomplete` and `tier2.incomplete` say
   * which gaps produced it.
   */
  completeness: HuntCompleteness;
  /**
   * Whether the report stays eligible for a later run. Derived from `completeness`,
   * false only for `incomplete_retryable`. True for `incomplete_final` too, because
   * a deterministic gap recurs identically every run, so keeping the report eligible
   * re-spends the run forever without covering more. A caller that writes "clean"
   * off this flag alone records a clean environment for a run that could not search
   * it; that is what `completeness` is for.
   */
  completed_successfully: boolean;
  /**
   * Up to 8 analyst next-step lines for a confirmed hit, grounded to this run's own SSE-visible
   * entities. Absent when there is no confirmed hit or the run stopped before Tier 2.
   */
  recommendations?: string[];
}

export interface HuntCoordinatorResult extends HuntCoordinatorCoreResult {
  /** One clause for the run conclusion message: outcome plus what each tier did. */
  headline: string;
  /**
   * The full hunt results narrative the hunt child writes to the Investigation:
   * what was hunted, where and when, what each tier found, and why a tier did
   * not run. Deterministic markdown, derived from the fields above.
   */
  narrative: string;
}

const DEFAULT_TIER2_SAMPLE_EVENTS = 5;
/** Matches the OpenAPI `HuntBehaviorArticleContext.matched_indices` maxItems; `per_index` can carry far more buckets. */
const MAX_MATCHED_INDICES = 50;

/**
 * Elasticsearch clients the coordinator needs. Telemetry, alerts, and ES|QL run
 * as the calling user so their index privileges apply; the reports index is a
 * plugin-owned hidden index that Kibana feature privileges do not grant ES
 * access to, so it is read with the internal user and scoped by `space_id`.
 */
export interface HuntCoordinatorClients {
  esClient: ElasticsearchClient;
  reportsEsClient: ElasticsearchClient;
}

const clampHuntReportText = (value: string | undefined): string | undefined => {
  if (value === undefined || value.length === 0) return undefined;
  return value.length > MAX_HUNT_REPORT_TEXT_CHARS
    ? value.slice(0, MAX_HUNT_REPORT_TEXT_CHARS)
    : value;
};

/**
 * When Tier 1 finds nothing, Tier 2 still needs index patterns and sample field
 * names so the LLM can emit grounded ES|QL (independent-hit path). Pull a small
 * recent sample from the Tier 2 targets inside the hunt window.
 */
const sampleTier2TargetEvents = async ({
  esClient,
  targets,
  window,
  maxSamples,
  logger,
}: {
  esClient: ElasticsearchClient;
  targets: string[];
  window: { from: string; to: string };
  maxSamples: number;
  logger: Logger;
}): Promise<string[]> => {
  if (targets.length === 0 || maxSamples <= 0) return [];
  try {
    const response = await esClient.search({
      index: targets,
      size: maxSamples,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: window.from,
                  // Exclusive `to`, matching `IndexScopeWindow` and both tiers.
                  lt: window.to,
                },
              },
            },
          ],
        },
      },
      sort: [{ '@timestamp': { order: 'desc' as const } }],
      // Only what the digest reads. These documents are never returned to the
      // caller, so a full `_source` would move whole log events across the wire
      // for `summarizeHit` to throw nearly all of away, once per sample.
      _source: [...SUMMARIZE_HIT_SOURCE_FIELDS],
    });
    // Envelope keys last so a document with its own top-level `id`/`index`
    // field cannot clobber the hit's `_id`/`_index`.
    return (response.hits.hits ?? []).map((hit) =>
      summarizeHit({
        index: String(hit._index ?? ''),
        id: String(hit._id ?? ''),
        source: (hit._source ?? {}) as Record<string, unknown>,
      })
    );
  } catch (err) {
    logger.warn(
      `hunt_coordinator: could not sample Tier 2 targets for grounding — ${(err as Error).message}`
    );
    return [];
  }
};

const buildArticleContext = (
  tier1: HuntForThreatServiceResult,
  maxSamples: number,
  grounding?: { targets: string[]; sampleEvents: string[] }
): HuntBehaviorArticleContext | undefined => {
  if (tier1.status === 'environment_hits_found') {
    const context: HuntBehaviorArticleContext = {};
    const hosts = tier1.affected_assets.hosts.map((h) => h.name).filter((n) => n.length > 0);
    const users = tier1.affected_assets.users.map((u) => u.name).filter((n) => n.length > 0);
    if (hosts.length > 0) context.affected_hosts = hosts;
    if (users.length > 0) context.affected_users = users;
    // Every searched index confirms, so the indices Tier 1 hit steer Tier 2 generation.
    const matchedIndices = tier1.per_index
      .map((entry) => entry.index)
      .slice(0, MAX_MATCHED_INDICES);
    if (matchedIndices.length > 0) {
      context.matched_indices = matchedIndices;
    }
    // Prefer digests computed from full `_source` in Tier 1; slim wire hits
    // no longer carry nested event/host/user fields for re-summarization.
    if (tier1.sample_event_summaries && tier1.sample_event_summaries.length > 0) {
      context.sample_events = tier1.sample_event_summaries.slice(0, maxSamples);
    }
    if (tier1.time_range) context.time_range = tier1.time_range;
    return Object.keys(context).length === 0 ? undefined : context;
  }

  // Independent Tier 2: no Tier 1 hits, but still ground generation on the
  // Tier 2 target patterns and a recent sample inside the hunt window.
  if (!grounding) return undefined;
  const context: HuntBehaviorArticleContext = {};
  if (grounding.targets.length > 0) {
    context.matched_indices = grounding.targets;
  }
  if (grounding.sampleEvents.length > 0) {
    context.sample_events = grounding.sampleEvents;
  }
  if (tier1.time_range) context.time_range = tier1.time_range;
  return Object.keys(context).length === 0 ? undefined : context;
};

/**
 * What to tell the caller when the scope is blocked, keyed on why. `_resolve/index` is
 * cluster-wide and privilege-scoped, so the wording talks about what is visible to this
 * hunt rather than what exists in a space.
 */
const blockedScopeGuidance = ({
  resolution,
  indexPatterns,
}: {
  resolution: HuntScopeResolution;
  indexPatterns: string[];
}): { message: string; nextStep: string } => {
  const checked = indexPatterns.join(', ');
  if (resolution === 'blocked:discovery_failed') {
    return {
      message: `Hunt scope resolution failed, so no index was searched (checked: ${checked}).`,
      nextStep:
        "Check Elasticsearch connectivity and the calling user's index privileges, then retry.",
    };
  }
  return {
    message: `No index in the space's default data view is visible to this hunt (checked: ${checked}).`,
    nextStep:
      "Ingest data into an index the space's Security Solution default data view covers, or adjust the `securitySolution:defaultIndex` setting.",
  };
};

/**
 * Whether Tier 2 sits this run out before any target is chosen, and why. Checked in order:
 *
 * 1. `never` always wins: `configured_never`.
 * 2. Tier 1 mapped nothing to search (`no_searchable_terms`): `always` runs Tier 2;
 *    `on_hits` runs it too when the run has Tier 2 input (report text, or a vendor or
 *    product from the report), because `on_hits` means "skip Tier 2 when Tier 1 ran
 *    clean" and Tier 1 never ran, so there is nothing to gate on. A real KEV report
 *    carries no IOCs and no techniques, only a vulnerability and text; without this rule
 *    it retired after a run that issued no query. Only a run with nothing for Tier 2
 *    either returns `no_searchable_input`.
 * 3. `on_hits` with no confirmed hit: `no_environment_hits`.
 *
 * `no_tier2_targets` is decided later, once the targets exist: it needs Tier 1's hits and,
 * as a fallback, the model, and neither belongs in a run that is skipped here.
 */
const decideTier2Skip = ({
  tier2When,
  tier1,
  hasTier2Input,
}: {
  tier2When: 'on_hits' | 'always' | 'never';
  tier1: HuntForThreatResult;
  /** True when the run has report text, or a vendor or product from the report context. */
  hasTier2Input: boolean;
}): HuntCoordinatorTier2SkipReason | null => {
  if (tier2When === 'never') return 'configured_never';
  if (tier1.status === 'no_searchable_terms') {
    if (tier2When === 'always' || hasTier2Input) return null;
    return 'no_searchable_input';
  }
  // Gate on the confirmed hit bar, not merely `environment_hits_found`: a match outside
  // the window never sets it and must not burn a Tier 2 run.
  if (tier2When === 'on_hits' && !tier1.has_confirmed_hit) {
    return 'no_environment_hits';
  }
  return null;
};

/**
 * Skip reasons that mean Tier 2 was asked for and could not run, as opposed to not
 * being asked for at all. `configured_never`, `no_searchable_input`,
 * `no_environment_hits` and `no_tier2_targets` are the caller's own gating, or a
 * deterministic absence, being honoured — reporting those
 * as lost coverage would make every deliberate Tier-1-only run look incomplete.
 *
 * All three here are transient. A connector can be configured and a failing one can
 * recover; report text can arrive from a later ingest, and the alternative —
 * retiring a report whose text simply had not been written yet — is the silent
 * permanent miss settled decision #7 rules out for a missing required index. So the
 * report stays in the candidate pool and a later sweep covers it.
 */
const TIER2_REQUESTED_BUT_UNAVAILABLE: ReadonlySet<HuntCoordinatorTier2SkipReason> = new Set([
  'no_inference',
  'no_report_text',
  'tier2_failed',
]);

/**
 * Coverage the coordinator can see and neither tier can, keyed on what actually
 * matters: whether any query reached the environment, and whether the run covered
 * both halves of what it was asked to.
 *
 * Keying this on *which tier sat out* is the mistake worth not repeating. Tier 1
 * reports zero hits whether it searched and found nothing or mapped nothing to search
 * for, and Tier 2 reports no behaviors whether it proposed none or executed none — so
 * a run where nothing queried Elasticsearch is indistinguishable from a clean
 * environment unless the coordinator says otherwise, and a caller writing hunt
 * evidence retires the report either way.
 */
const coordinatorGaps = ({
  tier1Status,
  tier2Executed,
  skipReason,
  skipDetail,
}: {
  tier1Status: HuntForThreatResult['status'];
  tier2Executed: boolean;
  skipReason?: HuntCoordinatorTier2SkipReason;
  skipDetail?: string;
}): HuntIncompleteness[] => {
  const gaps: HuntIncompleteness[] = [];

  if (skipReason && TIER2_REQUESTED_BUT_UNAVAILABLE.has(skipReason)) {
    gaps.push({
      reason: 'generation_failed',
      detail:
        `Tier 2 was requested but could not run (${skipReason}${
          skipDetail ? `: ${skipDetail}` : ''
        }), so this report's behavioral techniques were never hunted. Tier 1's result covers its ` +
        `IOCs only.`,
    });
  }

  if (tier1Status === 'no_searchable_terms' && !tier2Executed) {
    gaps.push({
      reason: 'nothing_searched',
      detail:
        `Tier 1 mapped no searchable term from this report and Tier 2 executed no query, so ` +
        `nothing reached the environment. The absence of hits says nothing about whether the ` +
        `environment is clean.`,
    });
  }

  return gaps;
};

const huntCoordinatorCore = async (
  { esClient, reportsEsClient }: HuntCoordinatorClients,
  model: ScopedModel | undefined,
  logger: Logger,
  params: HuntCoordinatorParams,
  narrativeContext: HuntNarrativeContext
): Promise<HuntCoordinatorCoreResult> => {
  const {
    report_id: reportId,
    spaceId,
    iocs: callerIocs,
    techniques: callerTechniques,
    time_range: timeRange,
    size,
    max_assets: maxAssets,
    llm_confidence_threshold: llmThreshold,
    tier2_when: tier2When = 'always',
    max_tier2_sample_events: maxSamples = DEFAULT_TIER2_SAMPLE_EVENTS,
    text: callerText,
    run_id,
    indexPatterns,
  } = params;

  // A report-driven run (the Worker's child passes only `report_id`) hunts the
  // report's own IOCs and techniques and hands its text to Tier 2. Anything the
  // caller supplies explicitly wins over what the report carries, but the report
  // is always loaded when a `report_id` is named: the run's evidence is written
  // back to that report, so its visibility in this space is checked even when
  // the caller supplied every input itself.
  const reportContext =
    reportId !== undefined
      ? await loadReportHuntContext({ esClient: reportsEsClient, spaceId, reportId })
      : null;
  if (reportId !== undefined && reportContext === null) {
    const message = `Report ${reportId} was not found in space ${spaceId}.`;
    return {
      status: 'tier1_only',
      report_id: reportId,
      run_id,
      index_patterns: [],
      tier2_targets: [],
      tier2_target_sources: [],
      actionable_indices: [],
      tier1: {
        tier: 1,
        ...emptyHuntForThreatResult(
          'no_searchable_terms',
          [],
          [],
          timeRange ?? { from: 'now-24h', to: 'now' },
          message
        ),
      },
      tier2_skipped_reason: 'report_not_found',
      message,
      next_step:
        'A report_id run requires the report to be visible in this space. Pass a report id that exists here, or omit report_id and pass iocs/techniques/text for an ad hoc hunt.',
      has_confirmed_hit: false,
      // Nothing about this run says whether the environment is clean, and a later run
      // can differ: the report may be indexed, the scope may resolve, the index may
      // come back. The report has to stay eligible.
      completeness: 'incomplete_retryable',
      completed_successfully: false,
    };
  }
  // An omitted array falls back to the report; an explicitly empty one is a
  // choice and wins, as the contract above says caller input does. Testing length
  // instead conflated the two, so `iocs: []` — a run meant to hunt techniques
  // alone — still searched the report's IOCs and could confirm a hit on them.
  const iocs = callerIocs ?? reportContext?.iocs ?? [];
  const techniques = callerTechniques ?? reportContext?.techniques ?? [];
  if (reportContext?.title) narrativeContext.reportTitle = reportContext.title;
  // Clamp after merge: request schema bounds caller `text`, but report-loaded
  // `content.body_text` has no such bound and must not exceed the Tier 2 contract.
  const text = clampHuntReportText(callerText ?? reportContext?.text);

  // What the loader had to drop from the report, counted only where this run actually
  // used the report's value: a caller-supplied array replaces the report's, so what was
  // dropped from the report is not coverage this run lost. Deterministic — the same
  // report truncates the same way every sweep — so it retires the report rather than
  // re-hunting the same prefix forever, but it retires saying what it never looked at.
  const truncated = reportContext?.truncated;
  const lostSearchTerms = [
    ...(truncated?.iocs && callerIocs === undefined
      ? [
          ...(truncated.iocs.dropped > 0
            ? [`${truncated.iocs.dropped} IOC(s) beyond the first ${truncated.iocs.kept}`]
            : []),
          ...(truncated.iocs.oversized
            ? [`${truncated.iocs.oversized} IOC value(s) too long for a hunt to search for`]
            : []),
        ]
      : []),
    ...(truncated?.techniques && callerTechniques === undefined
      ? [
          `${truncated.techniques.dropped} technique(s) beyond the first ${truncated.techniques.kept}`,
        ]
      : []),
  ];
  const lostReportText =
    truncated?.text && callerText === undefined
      ? [
          `${truncated.text.dropped} character(s) of report text beyond the first ${truncated.text.kept}`,
        ]
      : [];

  /**
   * What the input bounds cost this run. Dropped IOCs and techniques always cost it something:
   * Tier 1 searches them directly. Dropped text only does on a run that read the text, and Tier 2
   * is its only reader — reporting it on a Tier 1 only run said the run had not searched something
   * it was never going to search either way, which makes a skipped Tier 2 look like lost coverage.
   */
  const inputGaps = (readReportText: boolean): HuntIncompleteness[] => {
    const lost = [...lostSearchTerms, ...(readReportText ? lostReportText : [])];
    return lost.length > 0
      ? [
          {
            reason: 'input_truncated',
            detail:
              `This report carries more than a hunt accepts, so only a prefix of it was hunted: ` +
              `${lost.join(', ')} were never searched.`,
          },
        ]
      : [];
  };

  // Stage 1: the hunt universe (the caller's default data view patterns), the datasets
  // the report's vendor or product matched inside it, and where an action could land.
  // The report context is only handed over when there is a report to match against, so
  // a bare call with neither a report nor caller inputs matches nothing deterministic.
  const hasReportContext =
    reportId !== undefined ||
    callerText !== undefined ||
    callerIocs !== undefined ||
    callerTechniques !== undefined;
  const scopeReport: HuntScopeReportContext | undefined = hasReportContext
    ? {
        vendor: reportContext?.vendor,
        product: reportContext?.product,
        text,
        // Only IOCs Tier 1 can actually query: an IOC Tier 1 will drop (a hash of no
        // known length) is no evidence of what the report is about.
        iocs: iocs.filter(isTier1SearchableIoc),
        techniques,
      }
    : undefined;
  let scope: ResolvedHuntScope;
  try {
    scope = await resolveHuntScope({
      esClient,
      spaceId,
      indexPatterns,
      report: scopeReport,
      logger,
    });
  } catch (err) {
    logger.warn(`hunt_coordinator: scope resolution failed — ${(err as Error).message}`);
    // Return a degraded result rather than hard-failing.
    const emptyTier1: HuntCoordinatorTier1 = {
      tier: 1,
      ...emptyHuntForThreatResult(
        'no_searchable_terms',
        [],
        [],
        timeRange ?? { from: 'now-24h', to: 'now' },
        `Index scope resolution failed: ${(err as Error).message}`
      ),
    };
    return {
      status: 'tier1_only',
      report_id: reportId,
      run_id,
      index_patterns: [],
      tier2_targets: [],
      tier2_target_sources: [],
      actionable_indices: [],
      tier1: emptyTier1,
      // Not the `on_hits` gate: with no scope there is no allowlist for Tier 2 to
      // generate and execute against, so Tier 2 cannot run even when the run has report
      // text. The run fails as retryable below, so the report stays eligible and is not
      // retired without a query.
      tier2_skipped_reason: 'no_searchable_input',
      message: `Scope resolution failed: ${(err as Error).message}`,
      next_step:
        "Check Elasticsearch connectivity and the calling user's index privileges, then retry.",
      has_confirmed_hit: false,
      // Nothing about this run says whether the environment is clean, and a later run
      // can differ: the report may be indexed, the scope may resolve, the index may
      // come back. The report has to stay eligible.
      completeness: 'incomplete_retryable',
      completed_successfully: false,
    };
  }

  // A blocked scope is a failed run, never a clean one: nothing in the universe is
  // visible to this hunt, so there is nothing to search and the caller must not write
  // hunt evidence.
  if (scope.status === 'blocked') {
    const { message, nextStep } = blockedScopeGuidance({
      resolution: scope.resolution,
      indexPatterns,
    });
    return {
      status: 'blocked',
      report_id: reportId,
      run_id,
      // The wire contract says empty when blocked, whatever the scope carried: nothing
      // was hunted, so nothing is reported as hunted.
      index_patterns: [],
      tier2_targets: [],
      tier2_target_sources: [],
      actionable_indices: [],
      tier1: {
        tier: 1,
        ...emptyHuntForThreatResult(
          'scope_blocked',
          iocs,
          techniques,
          timeRange ?? scope.window,
          message
        ),
      },
      tier2_skipped_reason: 'scope_blocked',
      message,
      next_step: nextStep,
      has_confirmed_hit: false,
      // Nothing about this run says whether the environment is clean, and a later run
      // can differ: the report may be indexed, the scope may resolve, the index may
      // come back. The report has to stay eligible.
      completeness: 'incomplete_retryable',
      completed_successfully: false,
    };
  }

  const tier1Raw = await huntForThreat(esClient, {
    scope: {
      search_patterns: scope.index_patterns,
      window: scope.window,
      row_limit: scope.row_limit,
    },
    iocs,
    techniques,
    time_range: timeRange,
    size,
    maxAssets,
  });

  // Drop internal grounding digests from the wire tier1 payload.
  const { sample_event_summaries: _summaries, ...tier1Wire } = tier1Raw;
  const tier1: HuntCoordinatorTier1 = { ...tier1Wire, tier: 1 };

  // Everything known before a tier reported: what the report lost to the input bounds
  // applies to every return below, whether or not Tier 2 ran.
  const runGaps = (readReportText: boolean) => [
    ...inputGaps(readReportText),
    ...(tier1Raw.incomplete ?? []),
  ];

  // Report text, or the vendor or product the report names, is what Tier 2 can work
  // from when Tier 1 had nothing to search; a run with any of them is not gated on a
  // Tier 1 that never ran.
  const hasTier2Input = Boolean(text || reportContext?.vendor || reportContext?.product);
  const gatedSkipReason = decideTier2Skip({ tier2When, tier1: tier1Raw, hasTier2Input });

  // Stage 2: what Tier 2 may read, chosen now that the report was read and Tier 1 ran.
  // The model is a fallback inside it and spends tokens, so a run that Tier 2 will not
  // reach gets the deterministic targets only; they still describe the run.
  const tier2Reachable = gatedSkipReason === null && model !== undefined && Boolean(text);
  const targets = await resolveTier2Targets({
    scope,
    tier1: tier1Raw,
    report: scopeReport,
    model: tier2Reachable ? model : undefined,
    logger,
  });

  /**
   * Every return that stops before Tier 2 produces a result. Completeness is computed
   * here rather than passed in: Tier 1's own gaps — partial shards, an index
   * that went away between scope resolution and the search — apply just as much on a
   * run where Tier 2 was skipped, and the hardcoded `true` these paths used before
   * silently discarded them.
   */
  const tier1Only = ({
    reason,
    message,
    nextStep,
    skipDetail,
    // True only where Tier 2 was handed the report text before this run gave up on it.
    readReportText = false,
  }: {
    reason: HuntCoordinatorTier2SkipReason;
    message: string;
    nextStep: string;
    skipDetail?: string;
    readReportText?: boolean;
  }): HuntCoordinatorCoreResult => {
    const completeness = huntCompletenessOf([
      ...runGaps(readReportText),
      // Tier 2 never ran on any of these paths, so nothing it could have executed
      // counts towards coverage.
      ...coordinatorGaps({
        tier1Status: tier1Raw.status,
        tier2Executed: false,
        skipReason: reason,
        skipDetail,
      }),
    ]);
    return {
      status: 'tier1_only',
      report_id: reportId,
      run_id,
      index_patterns: scope.index_patterns,
      tier2_targets: targets.tier2_targets,
      tier2_target_sources: targets.tier2_target_sources,
      actionable_indices: scope.actionable_indices,
      tier1,
      tier2_skipped_reason: reason,
      message,
      next_step: nextStep,
      has_confirmed_hit: tier1Raw.has_confirmed_hit,
      completeness,
      completed_successfully: completedSuccessfully(completeness),
    };
  };

  if (gatedSkipReason) {
    return tier1Only({
      reason: gatedSkipReason,
      message: `Tier 1: ${tier1Raw.status}. Tier 2 skipped (${gatedSkipReason}).`,
      nextStep:
        tier1Raw.status === 'environment_hits_found'
          ? 'Tier 1 matched. Re-run with tier2_when: "always" for behavioral rule proposals.'
          : 'No environment matches. Consider widening time_range.',
    });
  }

  if (!model) {
    return tier1Only({
      reason: 'no_inference',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 skipped (no GenAI connector).`,
      nextStep:
        'Tier 2 requires a GenAI connector. Configure one via Stack Management → Connectors.',
    });
  }

  if (!text) {
    const completeness = huntCompletenessOf([
      // There is no text on this path, so there is no dropped text either.
      ...runGaps(false),
      ...coordinatorGaps({
        tier1Status: tier1Raw.status,
        tier2Executed: false,
        skipReason: 'no_report_text',
      }),
    ]);
    return {
      status: 'tier2_only_skipped',
      report_id: reportId,
      run_id,
      index_patterns: scope.index_patterns,
      tier2_targets: targets.tier2_targets,
      tier2_target_sources: targets.tier2_target_sources,
      actionable_indices: scope.actionable_indices,
      tier1,
      tier2_skipped_reason: 'no_report_text',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 skipped (no report text).`,
      next_step:
        'Tier 2 needs report text. Pass `text` explicitly or use a `report_id` whose `content.body_text` has been ingested.',
      has_confirmed_hit: tier1Raw.has_confirmed_hit,
      completeness,
      completed_successfully: completedSuccessfully(completeness),
    };
  }

  // Nothing to point Tier 2 at is not a failure to run it: every signal came up empty,
  // and a later run over the same data finds the same. `always` does not override it,
  // because a query with no allowed index could only be refused at the source gate.
  if (targets.tier2_targets.length === 0) {
    return tier1Only({
      reason: 'no_tier2_targets',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 skipped (no_tier2_targets).`,
      nextStep:
        "The report matched no dataset, Tier 1 hit no index, and no index in the default data view carries process telemetry, so Tier 2 had no safe target. Install an integration for the report's vendor to hunt its behaviors.",
    });
  }

  let articleContext = buildArticleContext(tier1Raw, maxSamples);
  if (!articleContext && tier1Raw.time_range !== undefined) {
    const sampleEvents = await sampleTier2TargetEvents({
      esClient,
      targets: targets.tier2_targets,
      window: tier1Raw.time_range,
      maxSamples,
      logger,
    });
    articleContext = buildArticleContext(tier1Raw, maxSamples, {
      targets: targets.tier2_targets,
      sampleEvents,
    });
  }
  let tier2Raw: HuntBehaviorResult;
  try {
    tier2Raw = await huntBehavior(
      model,
      logger,
      {
        text,
        report_id: reportId,
        llm_confidence_threshold: llmThreshold,
        iocs: iocs.map((ioc) => ({ type: ioc.type, value: ioc.value })),
        article_context: articleContext,
        window: tier1Raw.time_range,
        size,
        row_limit: scope.row_limit,
        // Every reader downstream (the allowlist, the schema probe, the publish/execute
        // gates, the hit bar) treats this as the set Tier 2 may read.
        allowed_indices: targets.tier2_targets,
      },
      esClient
    );
  } catch (err) {
    logger.warn(`hunt_coordinator: tier2 huntBehavior failed — ${(err as Error).message}`);
    return tier1Only({
      reason: 'tier2_failed',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 failed: ${(err as Error).message}`,
      nextStep: 'Tier 2 LLM call failed. Check connector configuration and retry.',
      skipDetail: (err as Error).message,
      // Tier 2 had the text and failed on it, so the prefix it read is what it failed on.
      readReportText: true,
    });
  }

  const tier2: HuntCoordinatorTier2 = { ...tier2Raw, tier: 2 };
  const hasConfirmedHit = tier1Raw.has_confirmed_hit || tier2Raw.has_hit;
  const tier2Gaps = tier2Raw.incomplete ?? [];
  // Tier 2 ran, which is not the same as Tier 2 having searched: extraction can return
  // no candidate at all, and a proposed behavior whose query never executed queried
  // nothing either. Both leave `behaviors` empty of executions, so this is what decides
  // whether anything reached the environment on a run where Tier 1 mapped nothing.
  // An absent `execution` is a behavior that never reached execute, which queried
  // exactly as much as one that executed and returned nothing: nothing.
  const tier2Executed = tier2Raw.behaviors.some(({ execution }) => execution?.executed === true);
  const gaps = [
    ...runGaps(true),
    ...tier2Gaps,
    ...coordinatorGaps({ tier1Status: tier1Raw.status, tier2Executed }),
  ];
  // Both tiers ran, so `completed_successfully` is no longer a hardcoded `true`: it
  // follows the gaps each tier reported. A deterministic gap still retires the report,
  // because re-running reproduces it exactly and would re-spend the generation budget
  // on the same techniques forever — but it retires as `incomplete_final`, so a caller
  // writing hunt evidence can tell a searched-and-clean environment from one this run
  // never reached.
  //
  // When Tier 1 had nothing to search and no Tier 2 query grounded either, the report
  // has shown it carries nothing a query can be anchored to: no IOC, no technique, and
  // prose the grounding gate refused on every behavior. That gap is deterministic for
  // this report, since the same text yields the same refusal every sweep, and leaving it
  // retryable turned every IOC-less KEV entry into a Tier 2 call per sweep that never
  // retired (seen live). If even one behavior grounded and executed, the text does hold
  // usable literals and the remaining ungrounded ones keep their retry.
  const nothingGroundable = tier1Raw.status === 'no_searchable_terms' && !tier2Executed;
  const completeness = huntCompletenessOf(
    gaps,
    nothingGroundable ? { treatAsFinal: FINAL_WHEN_NOTHING_SEARCHABLE } : {}
  );

  const coreResult: HuntCoordinatorCoreResult = {
    status: 'tier1_and_tier2',
    report_id: reportId,
    run_id,
    index_patterns: scope.index_patterns,
    tier2_targets: targets.tier2_targets,
    tier2_target_sources: targets.tier2_target_sources,
    actionable_indices: scope.actionable_indices,
    tier1,
    tier2,
    message:
      `Tier 1: ${tier1Raw.status}. Tier 2: ${tier2Raw.status} ` +
      `(${tier2Raw.behaviors.length} proposed` +
      `${gaps.length > 0 ? `, ${gaps.length} coverage gap(s)` : ''}).`,
    next_step:
      tier2Raw.status === 'behaviors_proposed'
        ? gaps.length > 0
          ? `Behaviors proposed, but ${gaps.length} part(s) of this hunt did not run: ` +
            `${gaps.map(({ detail }) => detail).join(' ')}`
          : hasConfirmedHit
          ? 'Behaviors proposed; at least one tier confirmed an environment hit.'
          : 'Behaviors proposed for Investigation staging.'
        : 'No behavioral candidates survived catalog validation.',
    has_confirmed_hit: hasConfirmedHit,
    completeness,
    completed_successfully: completedSuccessfully(completeness),
  };

  if (!hasConfirmedHit) {
    return coreResult;
  }

  const recommendationContext = [
    narrativeContext.reportTitle ? `Report: ${narrativeContext.reportTitle}` : undefined,
    ...tier2Raw.behaviors.map((b) => `${b.technique_id} ${b.technique_name}: ${b.evidence_quote}`),
    tier1Raw.affected_assets.hosts.length > 0
      ? `Hosts: ${tier1Raw.affected_assets.hosts.map((h) => h.name).join(', ')}`
      : undefined,
    tier1Raw.affected_assets.users.length > 0
      ? `Users: ${tier1Raw.affected_assets.users.map((u) => u.name).join(', ')}`
      : undefined,
    tier1Raw.affected_assets.services.length > 0
      ? `Services: ${tier1Raw.affected_assets.services.map((s) => s.name).join(', ')}`
      : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  const recommendations = await generateRecommendations({
    model,
    logger,
    result: coreResult,
    context: recommendationContext,
  });

  return { ...coreResult, recommendations };
};

/**
 * Runs the two-tier hunt and derives the Investigation narrative from the
 * structured outcome, so every caller (the hunt child, the standalone route)
 * gets the same deterministic story for the same result.
 */
export const huntCoordinator = async (
  clients: HuntCoordinatorClients,
  model: ScopedModel | undefined,
  logger: Logger,
  params: HuntCoordinatorParams
): Promise<HuntCoordinatorResult> => {
  const narrativeContext: HuntNarrativeContext = {};
  const core = await huntCoordinatorCore(clients, model, logger, params, narrativeContext);
  return {
    ...core,
    headline: buildHuntHeadline(core),
    narrative: buildHuntNarrative(core, narrativeContext),
  };
};
