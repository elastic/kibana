/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maps the hunt coordinator's raw Tier 1 / Tier 2 output into the
 * `security.significant_security_event` attachment data shape (PR 1,
 * `hunt-watch-attachment-types`, `significant_security_event.ts`).
 *
 * This is the schema lock for the SSE attachment contract: once PR 1
 * lands, `SseAttachmentData` below is replaced by an import of
 * `significantSecurityEventAttachmentDataSchema`'s inferred type from
 * `alertzero/common/`, and `sse_mapper.test.ts` runs the coordinator's real
 * output through that schema directly (no cast) so a drift between the two
 * PRs fails a test instead of surfacing at demo time. Until PR 1 merges or
 * is integration-branched, this file defines a local mirror of that contract
 * so PR 3 has something concrete to build and test against.
 *
 * Amended 2026-09-21: the
 * report-to-Investigation-to-SSE join uses deterministic ids only
 * (`hunt:report:{reportId}`, `trigger-{sha256(space|reportId)}`,
 * `sse-{sha256(space|reportId[|technique])}`). Nothing is written to the
 * threat report. `buildSseData` now returns one SSE entry per confirmed
 * technique (a single report-scoped entry when Tier 2 produced none), each
 * carrying its own computed `attachment_id`; the caller (the hunt child
 * workflow) attaches every entry to the Investigation with `ai.attachment.add`.
 */

import { createHash } from 'crypto';
import type { HuntCoordinatorResult } from '../hunt_coordinator';

export interface SseEntityRef {
  field:
    | 'user.name'
    | 'user.email'
    | 'user.id'
    | 'host.name'
    | 'host.hostname'
    | 'host.id'
    | 'service.name'
    | 'service.id';
  value: string;
}

export interface SseIoc {
  type: 'ip' | 'email' | 'domain' | 'url' | 'hash';
  value: string;
}

export interface SseSecurityKnowledgeIndicator {
  type: 'technology' | 'threat' | 'risk' | 'technique' | 'ioc';
  value: string;
  confidence?: number;
  technique_id?: string;
  ioc?: SseIoc;
}

export interface SseEventRef {
  event_id: string;
  source_index: string;
  timestamp?: string;
  matched?: { ioc?: SseIoc; technique_id?: string; field: string };
}

export interface SseHuntResult {
  has_confirmed_hit: boolean;
  time_range: { from: string; to: string };
  tier1: {
    status: 'no_searchable_terms' | 'no_environment_hits' | 'environment_hits_found';
    counts: {
      total_hits: number;
      returned_hits: number;
      affected_hosts: number;
      affected_users: number;
    };
    per_index: Array<{ index: string; hit_count: number; required: boolean }>;
    resolved_iocs: SseIoc[];
  };
  tier2?: {
    status: 'no_behaviors_found' | 'no_behaviors_validated' | 'behaviors_proposed';
    behaviors: Array<{
      technique_id: string;
      tactic_ids: string[];
      confidence: number;
      rule_name: string;
    }>;
  };
}

/**
 * Minimal shape this mapper populates. Fields PR 1 owns and requires
 * (title, status, evaluation_record_ref, etc.) that the coordinator has no
 * opinion on are left to the caller (the hunt child workflow's packaging
 * step) to fill in before writing the attachment.
 */
export interface SseAttachmentData {
  source_watch: string;
  capability: string;
  run_id: string;
  report_id: string;
  security_knowledge_indicators: SseSecurityKnowledgeIndicator[];
  entities: SseEntityRef[];
  events: SseEventRef[];
  hunt_result: SseHuntResult;
}

/** One SSE attachment, ready to be written with `ai.attachment.add`. */
export interface SseEntry {
  attachment_id: string;
  data: SseAttachmentData;
}

const SOURCE_WATCH_MANAGED_ID = 'system-security-hunt-continuous-threat-hunt';
const CAPABILITY_ID = 'continuous_threat_hunt';

/**
 * Subject-stable SSE attachment id: `sse-{sha256(space|reportId[|technique])}`.
 * Matches the `trigger-{sha256(space|reportId)}` convention for the
 * `security.threat` attachment (`mvp-slice.md`); omitting `technique` gives
 * the report-scoped fallback id used when Tier 2 produced no behaviors.
 */
export const buildSseAttachmentId = ({
  spaceId,
  reportId,
  techniqueId,
}: {
  spaceId: string;
  reportId: string;
  techniqueId?: string;
}): string => {
  const subject = techniqueId ? `${spaceId}|${reportId}|${techniqueId}` : `${spaceId}|${reportId}`;
  const hash = createHash('sha256').update(subject).digest('hex');
  return `sse-${hash}`;
};

/**
 * Options the caller (the hunt child workflow) supplies: everything the
 * mapper needs beyond the coordinator's own result. `requiredIndices` was
 * removed: `hunt_result.tier1.per_index[].required`
 * now comes straight from `HuntCoordinatorResult.tier1.perIndex[].required`,
 * which Tier 1 already computes via pattern matching. The mapper no longer
 * re-derives it from a raw index list (that re-derivation compared concrete
 * `_index` bucket names against wildcard patterns with exact string equality
 * and was always false in production).
 */
export interface SseMapperOptions {
  spaceId: string;
}

/**
 * Builds `security_knowledge_indicators`. When `onlyTechniqueId` is set, the
 * output is scoped to that one technique. The SSE is meant to be 1:1 with a
 * Proposal (mvp-slice.md worked example), so a two-technique hit run must
 * not put both techniques' behaviors/rule names on either SSE.
 */
const buildSecurityKnowledgeIndicators = (
  result: HuntCoordinatorResult,
  onlyTechniqueId?: string
): SseSecurityKnowledgeIndicator[] => {
  const { tier1, tier2 } = result;
  // No `{ type: 'threat', value: reportId }` entry here: `report_id` is
  // already its own top-level field on the payload, and the inline content
  // renders it as a linked "Source report" line, so duplicating it into the
  // indicator list was redundant and unlinked.
  const indicators: SseSecurityKnowledgeIndicator[] = [
    ...tier1.resolvedIocs.map(
      (ioc): SseSecurityKnowledgeIndicator => ({
        type: 'ioc',
        value: ioc.value,
        ioc: { type: ioc.type, value: ioc.value },
      })
    ),
  ];

  if (tier2) {
    for (const behavior of tier2.behaviors) {
      if (onlyTechniqueId && behavior.technique_id !== onlyTechniqueId) continue;
      indicators.push({
        type: 'technique',
        value: `${behavior.technique_id} (${behavior.technique_name})`,
        confidence: behavior.confidence,
        technique_id: behavior.technique_id,
      });
    }
  }

  return indicators;
};

const buildEntities = (result: HuntCoordinatorResult): SseEntityRef[] => [
  ...result.tier1.affectedAssets.hosts.map(
    (host): SseEntityRef => ({ field: 'host.name', value: host.name })
  ),
  ...result.tier1.affectedAssets.users.map(
    (user): SseEntityRef => ({ field: 'user.name', value: user.name })
  ),
];

// Tier 1 doesn't attribute a hit to a specific IOC/technique today.
// `events[].matched` needs Tier 1 to tag which IOC produced each hit, e.g.
// via `highlight` or a per-IOC query (deferred,
// not silently dropped). Events therefore stay shared across every SSE for a
// hit run, unlike `security_knowledge_indicators` which IS attributable.
const buildEvents = (result: HuntCoordinatorResult): SseEventRef[] =>
  result.tier1.hits.map((hit) => {
    const timestamp = (hit as Record<string, unknown>)['@timestamp'];
    return {
      event_id: hit.id,
      source_index: hit.index,
      ...(typeof timestamp === 'string' ? { timestamp } : {}),
    };
  });

/**
 * `per_index[].required` is copied straight from Tier 1's own computation
 * (`HuntCoordinatorResult.tier1.perIndex[].required`), not re-derived here.
 * Tier 1 already pattern-matches concrete `_index` bucket names against the
 * resolved technology's required index *patterns*; redoing that with a raw
 * index list and exact string equality was the bug this function used to
 * have.
 *
 * When `onlyTechniqueId` is set, `tier2.behaviors` is filtered to that one
 * technique for the same reason `buildSecurityKnowledgeIndicators` is: the
 * SSE is 1:1 with a Proposal, so a technique-scoped entry must not carry a
 * sibling technique's behavior/rule name.
 */
const buildHuntResult = (
  result: HuntCoordinatorResult,
  onlyTechniqueId?: string
): SseHuntResult => {
  const { tier1, tier2 } = result;
  return {
    has_confirmed_hit: tier1.hasConfirmedHit,
    time_range: tier1.timeRange,
    tier1: {
      status: tier1.status,
      counts: {
        total_hits: tier1.counts.totalHits,
        returned_hits: tier1.counts.returnedHits,
        affected_hosts: tier1.counts.affectedHosts,
        affected_users: tier1.counts.affectedUsers,
      },
      per_index: tier1.perIndex.map((entry) => ({
        index: entry.index,
        hit_count: entry.hitCount,
        required: entry.required,
      })),
      resolved_iocs: tier1.resolvedIocs.map((ioc) => ({ type: ioc.type, value: ioc.value })),
    },
    tier2: tier2
      ? {
          status: tier2.status,
          behaviors: tier2.behaviors
            .filter((behavior) => !onlyTechniqueId || behavior.technique_id === onlyTechniqueId)
            .map((behavior) => ({
              technique_id: behavior.technique_id,
              tactic_ids: behavior.tactic_ids,
              confidence: behavior.confidence,
              rule_name: behavior.rule_name,
            })),
        }
      : undefined,
  };
};

/**
 * Pure function: coordinator output in, one SSE entry per confirmed
 * technique out (report-scoped single entry when Tier 2 produced none). No
 * I/O, no ES calls. The hunt child workflow's step calls this after
 * `hunt_coordinator` returns and fans out over the result with
 * `ai.attachment.add`, one call per entry.
 *
 * Each technique-scoped entry's `security_knowledge_indicators` AND
 * `hunt_result.tier2.behaviors` are filtered to that technique alone. The
 * SSE is 1:1 with a Proposal, so the T1078.004 entry must not carry
 * T1552.001's behavior/rule name in either place. `events`/`entities`/
 * `hunt_result.tier1` stay shared: Tier 1 doesn't attribute hits to a
 * specific technique (see `buildEvents`).
 */
export const buildSseData = (
  result: HuntCoordinatorResult,
  reportId: string,
  options: SseMapperOptions
): SseEntry[] => {
  const entities = buildEntities(result);
  const events = buildEvents(result);

  const techniqueIds = result.tier2?.behaviors.map((behavior) => behavior.technique_id) ?? [];

  if (techniqueIds.length === 0) {
    return [
      {
        attachment_id: buildSseAttachmentId({ spaceId: options.spaceId, reportId }),
        data: {
          source_watch: SOURCE_WATCH_MANAGED_ID,
          capability: CAPABILITY_ID,
          run_id: result.runId,
          report_id: reportId,
          security_knowledge_indicators: buildSecurityKnowledgeIndicators(result),
          entities,
          events,
          hunt_result: buildHuntResult(result),
        },
      },
    ];
  }

  return techniqueIds.map((techniqueId) => ({
    attachment_id: buildSseAttachmentId({ spaceId: options.spaceId, reportId, techniqueId }),
    data: {
      source_watch: SOURCE_WATCH_MANAGED_ID,
      capability: CAPABILITY_ID,
      run_id: result.runId,
      report_id: reportId,
      security_knowledge_indicators: buildSecurityKnowledgeIndicators(result, techniqueId),
      entities,
      events,
      hunt_result: buildHuntResult(result, techniqueId),
    },
  }));
};
