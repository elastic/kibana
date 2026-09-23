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
import { loadReportHuntContext } from './common/load_report_context';
import type { HuntScope } from './common/resolve_index_scope';
import { huntForThreat, emptyHuntForThreatResult } from './tier1/hunt_for_threat';
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
  runId: string;
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
  runId: string;
  /** Technologies whose indices the hunt actually ran against; empty when the scope was blocked. */
  technologies: HuntTechnology[];
  tier1: HuntCoordinatorTier1;
  tier2?: HuntCoordinatorTier2;
  tier2_skipped_reason?: HuntCoordinatorTier2SkipReason;
  message: string;
  next_step: string;
  /**
   * True when the run completed without hard errors. The calling workflow checks
   * this before writing hunt evidence; the coordinator itself never writes feedback.
   */
  completedSuccessfully: boolean;
}

const DEFAULT_TIER2_SAMPLE_EVENTS = 5;

/** Matches the OpenAPI `text` maxLength on hunt_behavior / hunt_coordinator. */
const MAX_HUNT_REPORT_TEXT_CHARS = 200_000;

const clampHuntReportText = (value: string | undefined): string | undefined => {
  if (value === undefined || value.length === 0) return undefined;
  return value.length > MAX_HUNT_REPORT_TEXT_CHARS
    ? value.slice(0, MAX_HUNT_REPORT_TEXT_CHARS)
    : value;
};

const summarizeHit = (hit: HuntForThreatResult['hits'][number]): string => {
  const parts: string[] = [];
  const src = hit as Record<string, unknown>;
  if (typeof src['kibana.alert.rule.name'] === 'string')
    parts.push(`rule="${src['kibana.alert.rule.name']}"`);
  if (typeof src['event.dataset'] === 'string') parts.push(`dataset=${src['event.dataset']}`);
  if (typeof src['host.name'] === 'string') parts.push(`host=${src['host.name']}`);
  if (typeof src['user.name'] === 'string') parts.push(`user=${src['user.name']}`);
  if (typeof src['source.ip'] === 'string') parts.push(`src=${src['source.ip']}`);
  if (typeof src['destination.ip'] === 'string') parts.push(`dst=${src['destination.ip']}`);
  return parts.length > 0 ? parts.join(' ') : `_index=${hit.index} _id=${hit.id}`;
};

const buildArticleContext = (
  tier1: HuntForThreatResult,
  maxSamples: number
): HuntBehaviorArticleContext | undefined => {
  if (tier1.status !== 'environment_hits_found') return undefined;
  const context: HuntBehaviorArticleContext = {};
  const hosts = tier1.affectedAssets.hosts.map((h) => h.name).filter((n) => n.length > 0);
  const users = tier1.affectedAssets.users.map((u) => u.name).filter((n) => n.length > 0);
  if (hosts.length > 0) context.affected_hosts = hosts;
  if (users.length > 0) context.affected_users = users;
  if (tier1.perIndex.length > 0) {
    context.matched_indices = tier1.perIndex.map((entry) => entry.index);
  }
  if (tier1.hits.length > 0) {
    context.sample_events = tier1.hits.slice(0, maxSamples).map(summarizeHit);
  }
  if (tier1.timeRange) context.time_range = tier1.timeRange;
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
  if (tier2When === 'on_hits' && !tier1.hasConfirmedHit) {
    return 'no_environment_hits';
  }
  return null;
};

export const huntCoordinator = async (
  esClient: ElasticsearchClient,
  model: ScopedModel | undefined,
  logger: Logger,
  params: HuntCoordinatorParams
): Promise<HuntCoordinatorResult> => {
  const {
    report_id: reportId,
    spaceId,
    iocs: callerIocs = [],
    techniques: callerTechniques = [],
    time_range: timeRange,
    size,
    max_assets: maxAssets,
    llm_confidence_threshold: llmThreshold,
    tier2_when: tier2When = 'on_hits',
    max_tier2_sample_events: maxSamples = DEFAULT_TIER2_SAMPLE_EVENTS,
    text: callerText,
    runId,
    technology,
  } = params;

  // A report-driven run (the Worker's child passes only `report_id`) hunts the
  // report's own IOCs and techniques and hands its text to Tier 2. Anything the
  // caller supplies explicitly wins over what the report carries.
  const needsReportContext =
    reportId !== undefined &&
    (callerIocs.length === 0 || callerTechniques.length === 0 || callerText === undefined);
  const reportContext = needsReportContext
    ? await loadReportHuntContext({ esClient, spaceId, reportId })
    : null;
  if (needsReportContext && reportContext === null) {
    const message = `Report ${reportId} was not found in space ${spaceId}.`;
    return {
      status: 'tier1_only',
      report_id: reportId,
      runId,
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
        'Pass a report id that exists in this space, or pass iocs/techniques/text explicitly.',
      completedSuccessfully: false,
    };
  }
  const iocs = callerIocs.length > 0 ? callerIocs : reportContext?.iocs ?? [];
  const techniques =
    callerTechniques.length > 0 ? callerTechniques : reportContext?.techniques ?? [];
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
      runId,
      technologies: [],
      tier1: emptyTier1,
      tier2_skipped_reason: 'no_searchable_input',
      message: `Scope resolution failed: ${(err as Error).message}`,
      next_step: 'Verify the technology index patterns are configured correctly.',
      completedSuccessfully: false,
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
      runId,
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
      completedSuccessfully: false,
    };
  }

  const tier1Raw = await huntForThreat(esClient, {
    scope: indexScope,
    iocs,
    techniques,
    timeRange,
    size,
    maxAssets,
  });

  const tier1: HuntCoordinatorTier1 = { ...tier1Raw, tier: 1 };

  const tier1Only = ({
    reason,
    message,
    nextStep,
    completedSuccessfully,
  }: {
    reason: HuntCoordinatorTier2SkipReason;
    message: string;
    nextStep: string;
    completedSuccessfully: boolean;
  }): HuntCoordinatorResult => ({
    status: 'tier1_only',
    report_id: reportId,
    runId,
    technologies,
    tier1,
    tier2_skipped_reason: reason,
    message,
    next_step: nextStep,
    completedSuccessfully,
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
      completedSuccessfully: true,
    });
  }

  if (!model) {
    return tier1Only({
      reason: 'no_inference',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 skipped (no GenAI connector).`,
      nextStep:
        'Tier 2 requires a GenAI connector. Configure one via Stack Management → Connectors.',
      completedSuccessfully: true,
    });
  }

  if (!text) {
    return {
      status: 'tier2_only_skipped',
      report_id: reportId,
      runId,
      technologies,
      tier1,
      tier2_skipped_reason: 'no_report_text',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 skipped (no report text).`,
      next_step:
        'Tier 2 needs report text. Pass `text` explicitly or use a `report_id` whose `content.body_text` has been ingested.',
      completedSuccessfully: true,
    };
  }

  const articleContext = buildArticleContext(tier1Raw, maxSamples);
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
      },
      esClient
    );
  } catch (err) {
    logger.warn(`hunt_coordinator: tier2 huntBehavior failed — ${(err as Error).message}`);
    return tier1Only({
      reason: 'tier2_failed',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 failed: ${(err as Error).message}`,
      nextStep: 'Tier 2 LLM call failed. Check connector configuration and retry.',
      completedSuccessfully: false,
    });
  }

  const tier2: HuntCoordinatorTier2 = { ...tier2Raw, tier: 2 };

  return {
    status: 'tier1_and_tier2',
    report_id: reportId,
    runId,
    technologies,
    tier1,
    tier2,
    message: `Tier 1: ${tier1Raw.status}. Tier 2: ${tier2Raw.status} (${tier2Raw.behaviors.length} proposed).`,
    next_step:
      tier2Raw.status === 'behaviors_proposed'
        ? 'Behaviors proposed for Investigation staging.'
        : 'No behavioral candidates survived catalog validation.',
    completedSuccessfully: true,
  };
};
