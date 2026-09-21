/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { resolveIndexScope } from './common/resolve_index_scope';
import { huntForThreat } from './tier1/hunt_for_threat';
import type { HuntForThreatResult } from './tier1/types';
import type { HuntTechnology } from './common/types';
import type { HuntIoc } from './tier1/types';
import { huntBehavior } from './tier2/hunt_behavior';
import type { HuntBehaviorResult, HuntBehaviorArticleContext } from './tier2/types';

// NO findings persistence — per plan.md Phase 6, Task 6.5.
// NO call to writeHuntFeedback — the coordinator returns completedSuccessfully for the caller.

export type HuntCoordinatorStatus =
  | 'tier1_only'
  | 'tier1_and_tier2'
  | 'tier2_only_skipped';

export type HuntCoordinatorTier2SkipReason =
  | 'configured_never'
  | 'no_inference'
  | 'no_environment_hits'
  | 'no_report_text'
  | 'no_searchable_input';

export interface HuntCoordinatorParams {
  report_id?: string;
  spaceId: string;
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
  tier1: HuntCoordinatorTier1;
  tier2?: HuntCoordinatorTier2;
  tier2_skipped_reason?: HuntCoordinatorTier2SkipReason;
  message: string;
  next_step: string;
  /**
   * True when the run completed without hard errors. The calling workflow checks
   * this to decide whether to write hunt feedback — the coordinator itself never
   * writes feedback (plan.md Phase 6, Task 6.6).
   */
  completedSuccessfully: boolean;
}

const DEFAULT_TIER2_SAMPLE_EVENTS = 5;

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
  if (
    tier1.status === 'no_searchable_terms'
  ) {
    if (tier2When === 'always') return null;
    return 'no_searchable_input';
  }
  if (tier2When === 'on_hits' && tier1.status !== 'environment_hits_found') {
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
    iocs = [],
    techniques = [],
    time_range: timeRange,
    size,
    max_assets: maxAssets,
    llm_confidence_threshold: llmThreshold,
    tier2_when: tier2When = 'on_hits',
    max_tier2_sample_events: maxSamples = DEFAULT_TIER2_SAMPLE_EVENTS,
    text,
    runId,
  } = params;

  // Resolve index scope — use the first technology available; in production the
  // coordinator is called per-report and the technology is resolved from the report.
  // For now default to aws_iam as the primary technology (plan.md:175).
  let scope;
  try {
    scope = await resolveIndexScope({
      esClient,
      technology: 'aws_iam' as HuntTechnology,
      spaceId,
    });
  } catch (err) {
    logger.warn(`hunt_coordinator: scope resolution failed — ${(err as Error).message}`);
    // Return a degraded result rather than hard-failing.
    return {
      status: 'tier1_only',
      report_id: reportId,
      runId,
      tier1: {
        tier: 1,
        status: 'no_searchable_terms',
        hasConfirmedHit: false,
        searchedIocs: 0,
        searchedTechniques: 0,
        resolvedIocs: [],
        resolvedTechniques: [],
        timeRange: timeRange ?? { from: 'now-24h', to: 'now' },
        counts: { totalHits: 0, returnedHits: 0, affectedHosts: 0, affectedUsers: 0 },
        hits: [],
        affectedAssets: { hosts: [], users: [] },
        perIndex: [],
        message: `Index scope resolution failed: ${(err as Error).message}`,
      },
      tier2_skipped_reason: 'no_searchable_input',
      message: `Scope resolution failed: ${(err as Error).message}`,
      next_step: 'Verify the technology index patterns are configured correctly.',
      completedSuccessfully: false,
    };
  }

  const tier1Raw = await huntForThreat(esClient, {
    scope,
    iocs,
    techniques,
    timeRange,
    size,
    maxAssets,
  });

  const tier1: HuntCoordinatorTier1 = { ...tier1Raw, tier: 1 };

  const skipReason = decideTier2Skip(tier2When, tier1Raw);
  if (skipReason) {
    return {
      status: 'tier1_only',
      report_id: reportId,
      runId,
      tier1,
      tier2_skipped_reason: skipReason,
      message: `Tier 1: ${tier1Raw.status}. Tier 2 skipped (${skipReason}).`,
      next_step: tier1Raw.status === 'environment_hits_found'
        ? 'Tier 1 matched. Re-run with tier2_when: "always" for behavioral rule proposals.'
        : 'No environment matches. Consider widening time_range.',
      completedSuccessfully: true,
    };
  }

  if (!model) {
    return {
      status: 'tier1_only',
      report_id: reportId,
      runId,
      tier1,
      tier2_skipped_reason: 'no_inference',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 skipped (no GenAI connector).`,
      next_step:
        'Tier 2 requires a GenAI connector. Configure one via Stack Management → Connectors.',
      completedSuccessfully: true,
    };
  }

  if (!text) {
    return {
      status: 'tier2_only_skipped',
      report_id: reportId,
      runId,
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
    tier2Raw = await huntBehavior(model, logger, {
      text,
      report_id: reportId,
      llm_confidence_threshold: llmThreshold,
      iocs: iocs.map((ioc) => ({ type: ioc.type as import('./tier2/types').HuntBehaviorIocType, value: ioc.value })),
      article_context: articleContext,
    }, esClient);
  } catch (err) {
    logger.warn(`hunt_coordinator: tier2 huntBehavior failed — ${(err as Error).message}`);
    return {
      status: 'tier1_only',
      report_id: reportId,
      runId,
      tier1,
      tier2_skipped_reason: 'no_report_text',
      message: `Tier 1: ${tier1Raw.status}. Tier 2 failed: ${(err as Error).message}`,
      next_step: 'Tier 2 LLM call failed. Check connector configuration and retry.',
      completedSuccessfully: false,
    };
  }

  const tier2: HuntCoordinatorTier2 = { ...tier2Raw, tier: 2 };

  return {
    status: 'tier1_and_tier2',
    report_id: reportId,
    runId,
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
