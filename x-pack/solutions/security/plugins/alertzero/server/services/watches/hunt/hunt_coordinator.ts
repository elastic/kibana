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
  HuntCoordinatorStatus,
  HuntForThreatResult,
  HuntIoc,
  HuntTechnology,
} from '@kbn/alertzero-common';
import { resolveHuntScope } from './common/resolve_index_scope';
import { loadReportHuntContext, MAX_HUNT_REPORT_TEXT_CHARS } from './common/load_report_context';
import type { HuntScope } from './common/resolve_index_scope';
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
  | 'no_searchable_input'
  | 'report_not_found'
  | 'scope_blocked'
  | 'tier2_failed';

export interface HuntCoordinatorParams {
  report_id?: string;
  spaceId: string;
  /**
   * Pins the hunt to one technology's index scope. Absent, the coordinator
   * resolves every known technology and hunts the ones present in the space.
   */
  technology?: HuntTechnology;
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

export interface HuntCoordinatorResult {
  status: HuntCoordinatorStatus;
  report_id?: string;
  run_id: string;
  /** Technologies whose indices the hunt actually ran against; empty when the scope was blocked. */
  technologies: HuntTechnology[];
  tier1: HuntCoordinatorTier1;
  tier2?: HuntCoordinatorTier2;
  tier2_skipped_reason?: HuntCoordinatorTier2SkipReason;
  message: string;
  next_step: string;
  /**
   * True when Tier 1 confirmed a required-index hit or any Tier 2 behavior
   * executed with a required-index hit. Callers that gate SSE emit / packaging
   * on the hit bar must read this field, not `tier1.has_confirmed_hit` alone.
   */
  has_confirmed_hit: boolean;
  /**
   * True when the run completed without hard errors. The calling workflow checks
   * this before writing hunt evidence; the coordinator itself never writes feedback.
   */
  completed_successfully: boolean;
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
 * recent sample from the required indices inside the hunt window.
 */
const sampleRequiredIndexEvents = async ({
  esClient,
  requiredIndices,
  window,
  maxSamples,
  logger,
}: {
  esClient: ElasticsearchClient;
  requiredIndices: string[];
  window: { from: string; to: string };
  maxSamples: number;
  logger: Logger;
}): Promise<string[]> => {
  if (requiredIndices.length === 0 || maxSamples <= 0) return [];
  try {
    const response = await esClient.search({
      index: requiredIndices,
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
      `hunt_coordinator: could not sample required indices for Tier 2 grounding — ${
        (err as Error).message
      }`
    );
    return [];
  }
};

const buildArticleContext = (
  tier1: HuntForThreatServiceResult,
  maxSamples: number,
  grounding?: { requiredIndices: string[]; sampleEvents: string[] }
): HuntBehaviorArticleContext | undefined => {
  if (tier1.status === 'environment_hits_found') {
    const context: HuntBehaviorArticleContext = {};
    const hosts = tier1.affected_assets.hosts.map((h) => h.name).filter((n) => n.length > 0);
    const users = tier1.affected_assets.users.map((u) => u.name).filter((n) => n.length > 0);
    if (hosts.length > 0) context.affected_hosts = hosts;
    if (users.length > 0) context.affected_users = users;
    // Only required-index buckets steer Tier 2 generation: its hit bar counts
    // required-index rows alone, so a Tier 1 match that landed only in the
    // alerts (optional) index must not point the generator at the alerts index,
    // where nothing it returns can ever count. With no required bucket the
    // generator falls back to the scope's required patterns.
    const requiredIndices = tier1.per_index
      .filter((entry) => entry.required)
      .map((entry) => entry.index)
      .slice(0, MAX_MATCHED_INDICES);
    if (requiredIndices.length > 0) {
      context.matched_indices = requiredIndices;
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
  // required index patterns and a recent sample inside the hunt window.
  if (!grounding) return undefined;
  const context: HuntBehaviorArticleContext = {};
  if (grounding.requiredIndices.length > 0) {
    context.matched_indices = grounding.requiredIndices;
  }
  if (grounding.sampleEvents.length > 0) {
    context.sample_events = grounding.sampleEvents;
  }
  if (tier1.time_range) context.time_range = tier1.time_range;
  return Object.keys(context).length === 0 ? undefined : context;
};

const decideTier2Skip = (
  tier2When: 'on_hits' | 'always' | 'never',
  tier1: HuntForThreatResult
): HuntCoordinatorTier2SkipReason | null => {
  if (tier2When === 'never') return 'configured_never';
  if (tier1.status === 'no_searchable_terms') {
    if (tier2When === 'always') return null;
    return 'no_searchable_input';
  }
  // Gate on the confirmed hit bar, not merely `environment_hits_found`: optional-only
  // matches (alerts, endpoint) populate hits/counts but must not burn a Tier 2 run.
  if (tier2When === 'on_hits' && !tier1.has_confirmed_hit) {
    return 'no_environment_hits';
  }
  return null;
};

export const huntCoordinator = async (
  { esClient, reportsEsClient }: HuntCoordinatorClients,
  model: ScopedModel | undefined,
  logger: Logger,
  params: HuntCoordinatorParams
): Promise<HuntCoordinatorResult> => {
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
    technology,
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
      technologies: [],
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
      completed_successfully: false,
    };
  }
  // An omitted array falls back to the report; an explicitly empty one is a
  // choice and wins, as the contract above says caller input does. Testing length
  // instead conflated the two, so `iocs: []` — a run meant to hunt techniques
  // alone — still searched the report's IOCs and could confirm a hit on them.
  const iocs = callerIocs ?? reportContext?.iocs ?? [];
  const techniques = callerTechniques ?? reportContext?.techniques ?? [];
  // Clamp after merge: request schema bounds caller `text`, but report-loaded
  // `content.body_text` has no such bound and must not exceed the Tier 2 contract.
  const text = clampHuntReportText(callerText ?? reportContext?.text);

  // Resolve the index scope from the environment: the named technology, or every
  // technology whose required indices exist in this space.
  let scope: HuntScope;
  try {
    scope = await resolveHuntScope({ esClient, spaceId, technology });
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
      technologies: [],
      tier1: emptyTier1,
      tier2_skipped_reason: 'no_searchable_input',
      message: `Scope resolution failed: ${(err as Error).message}`,
      next_step: 'Verify the technology index patterns are configured correctly.',
      has_confirmed_hit: false,
      completed_successfully: false,
    };
  }

  const { technologies, ...indexScope } = scope;

  // A blocked scope is a failed run, never a clean one: no required index exists,
  // so there is nothing to hunt and the caller must not write hunt evidence.
  if (indexScope.status === 'blocked') {
    const target = technology ?? 'any configured technology';
    const message = `No required index resolved for ${target} in space ${spaceId} (missing: ${indexScope.missing.join(
      ', '
    )}).`;
    return {
      status: 'blocked',
      report_id: reportId,
      run_id,
      technologies,
      tier1: {
        tier: 1,
        ...emptyHuntForThreatResult(
          'scope_blocked',
          iocs,
          techniques,
          timeRange ?? indexScope.window,
          message
        ),
      },
      tier2_skipped_reason: 'scope_blocked',
      message,
      next_step:
        'Install the integration whose indices this hunt needs, or pass a technology whose indices exist in this space.',
      has_confirmed_hit: false,
      completed_successfully: false,
    };
  }

  const tier1Raw = await huntForThreat(esClient, {
    scope: indexScope,
    iocs,
    techniques,
    time_range: timeRange,
    size,
    maxAssets,
  });

  // Drop internal grounding digests from the wire tier1 payload.
  const { sample_event_summaries: _summaries, ...tier1Wire } = tier1Raw;
  const tier1: HuntCoordinatorTier1 = { ...tier1Wire, tier: 1 };

  const tier1Only = ({
    reason,
    message,
    nextStep,
    completed_successfully,
  }: {
    reason: HuntCoordinatorTier2SkipReason;
    message: string;
    nextStep: string;
    completed_successfully: boolean;
  }): HuntCoordinatorResult => ({
    status: 'tier1_only',
    report_id: reportId,
    run_id,
    technologies,
    tier1,
    tier2_skipped_reason: reason,
    message,
    next_step: nextStep,
    has_confirmed_hit: tier1Raw.has_confirmed_hit,
    completed_successfully,
  });

  const skipReason = decideTier2Skip(tier2When, tier1Raw);
  if (skipReason) {
    return tier1Only({
      reason: skipReason,
      message: `Tier 1: ${tier1Raw.status}. Tier 2 skipped (${skipReason}).`,
      nextStep:
        tier1Raw.status === 'environment_hits_found'
          ? 'Tier 1 matched. Re-run with tier2_when: "always" for behavioral rule proposals.'
          : 'No environment matches. Consider widening time_range.',
      completed_successfully: true,
    });
  }

  if (!model) {
    return tier1Only({
      reason: 'no_inference',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 skipped (no GenAI connector).`,
      nextStep:
        'Tier 2 requires a GenAI connector. Configure one via Stack Management → Connectors.',
      completed_successfully: true,
    });
  }

  if (!text) {
    return {
      status: 'tier2_only_skipped',
      report_id: reportId,
      run_id,
      technologies,
      tier1,
      tier2_skipped_reason: 'no_report_text',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 skipped (no report text).`,
      next_step:
        'Tier 2 needs report text. Pass `text` explicitly or use a `report_id` whose `content.body_text` has been ingested.',
      has_confirmed_hit: tier1Raw.has_confirmed_hit,
      completed_successfully: true,
    };
  }

  let articleContext = buildArticleContext(tier1Raw, maxSamples);
  if (!articleContext && indexScope.required.length > 0 && tier1Raw.time_range !== undefined) {
    const sampleEvents = await sampleRequiredIndexEvents({
      esClient,
      requiredIndices: indexScope.required,
      window: tier1Raw.time_range,
      maxSamples,
      logger,
    });
    articleContext = buildArticleContext(tier1Raw, maxSamples, {
      requiredIndices: indexScope.required,
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
        row_limit: indexScope.row_limit,
        required_indices: indexScope.required,
      },
      esClient
    );
  } catch (err) {
    logger.warn(`hunt_coordinator: tier2 huntBehavior failed — ${(err as Error).message}`);
    return tier1Only({
      reason: 'tier2_failed',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 failed: ${(err as Error).message}`,
      nextStep: 'Tier 2 LLM call failed. Check connector configuration and retry.',
      completed_successfully: false,
    });
  }

  const tier2: HuntCoordinatorTier2 = { ...tier2Raw, tier: 2 };
  const hasConfirmedHit = tier1Raw.has_confirmed_hit || tier2Raw.has_hit;
  const uncorroborated = tier2Raw.uncorroborated_technique_ids ?? [];

  return {
    status: 'tier1_and_tier2',
    report_id: reportId,
    run_id,
    technologies,
    tier1,
    tier2,
    message:
      `Tier 1: ${tier1Raw.status}. Tier 2: ${tier2Raw.status} ` +
      `(${tier2Raw.behaviors.length} proposed` +
      `${uncorroborated.length > 0 ? `, ${uncorroborated.length} uncorroborated` : ''}).`,
    next_step:
      tier2Raw.status === 'behaviors_proposed'
        ? uncorroborated.length > 0
          ? `Behaviors proposed, but ${uncorroborated.length} exceeded the Tier 2 generation ` +
            `budget and were never searched: ${uncorroborated.join(', ')}. Re-hunt this report ` +
            `explicitly to corroborate them.`
          : hasConfirmedHit
          ? 'Behaviors proposed; at least one tier confirmed an environment hit.'
          : 'Behaviors proposed for Investigation staging.'
        : 'No behavioral candidates survived catalog validation.',
    has_confirmed_hit: hasConfirmedHit,
    // A budget-truncated Tier 2 still counts as completed. Reporting it as a
    // failure would park the report outside the hunt-once gate, and because the
    // budget is deterministic the next sweep would truncate it identically and
    // re-spend the whole generation budget on the same techniques, forever.
    // Partial coverage is reported through `tier2.uncorroborated_technique_ids`
    // and `next_step` instead; acting on it needs per-technique evidence the
    // gate does not carry yet.
    completed_successfully: true,
  };
};
