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
 * This is the schema lock for hunt-plans plan 7 (SSE durability): once PR 1
 * lands, `SseAttachmentData` below is replaced by an import of
 * `significantSecurityEventAttachmentDataSchema`'s inferred type from
 * `alertzero/common/`, and `sse_mapper.test.ts` runs the coordinator's real
 * output through that schema directly (no cast) so a drift between the two
 * PRs fails a test instead of surfacing at demo time. Until PR 1 merges or
 * is integration-branched, this file defines a local mirror of that contract
 * so PR 3 has something concrete to build and test against.
 *
 * Amended 2026-09-21 (plan 7, report-to-Investigation join revision): the
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

/** Every index Tier 1 checked as `required` for the resolved technology, so the mapper
 * can flag `per_index[].required` without re-deriving it from the coordinator's raw hit list.
 * Pulled from `HuntCoordinatorResult.requiredIndexPatterns`, not re-resolved. */
export interface SseMapperOptions {
  spaceId: string;
  requiredIndices: string[];
}

const isRequired = (index: string, requiredIndices: string[]): boolean =>
  requiredIndices.includes(index);

const buildSecurityKnowledgeIndicators = (
  result: HuntCoordinatorResult,
  reportId: string
): SseSecurityKnowledgeIndicator[] => {
  const { tier1, tier2 } = result;
  const indicators: SseSecurityKnowledgeIndicator[] = [
    { type: 'threat', value: reportId },
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

const buildEvents = (result: HuntCoordinatorResult): SseEventRef[] =>
  result.tier1.hits.map((hit) => ({
    event_id: hit.id,
    source_index: hit.index,
  }));

const buildHuntResult = (
  result: HuntCoordinatorResult,
  requiredIndices: string[]
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
        required: isRequired(entry.index, requiredIndices),
      })),
      resolved_iocs: tier1.resolvedIocs.map((ioc) => ({ type: ioc.type, value: ioc.value })),
    },
    tier2: tier2
      ? {
          status: tier2.status,
          behaviors: tier2.behaviors.map((behavior) => ({
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
 * I/O, no ES calls — the hunt child workflow's step calls this after
 * `hunt_coordinator` returns and fans out over the result with
 * `ai.attachment.add`, one call per entry.
 */
export const buildSseData = (
  result: HuntCoordinatorResult,
  reportId: string,
  options: SseMapperOptions
): SseEntry[] => {
  const data: SseAttachmentData = {
    source_watch: SOURCE_WATCH_MANAGED_ID,
    capability: CAPABILITY_ID,
    run_id: result.runId,
    report_id: reportId,
    security_knowledge_indicators: buildSecurityKnowledgeIndicators(result, reportId),
    entities: buildEntities(result),
    events: buildEvents(result),
    hunt_result: buildHuntResult(result, options.requiredIndices),
  };

  const techniqueIds = result.tier2?.behaviors.map((behavior) => behavior.technique_id) ?? [];

  if (techniqueIds.length === 0) {
    return [
      {
        attachment_id: buildSseAttachmentId({ spaceId: options.spaceId, reportId }),
        data,
      },
    ];
  }

  return techniqueIds.map((techniqueId) => ({
    attachment_id: buildSseAttachmentId({ spaceId: options.spaceId, reportId, techniqueId }),
    data,
  }));
};
