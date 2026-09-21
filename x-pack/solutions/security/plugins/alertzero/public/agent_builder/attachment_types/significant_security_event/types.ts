/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  isAttachmentEntityRef,
  type AttachmentEntityRef,
} from '../../../../common/attachment_entity_string';

export interface SecurityKnowledgeIndicator {
  type: string;
  value: string;
  confidence?: number;
  technique_id?: string;
  ioc?: { type: string; value: string };
}

export interface TimelineEntry {
  at: string;
  what: string;
}

export interface SignificantSecurityEventRef {
  event_id: string;
  source_index: string;
  timestamp?: string;
}

export interface SignificantSecurityAlertRef {
  alert_id: string;
  index: string;
  timestamp?: string;
}

export interface MapsToProposal {
  category?: string;
  impact?: string;
  confidence?: number;
  actionWorkflowId?: string;
  actionInput?: Record<string, unknown>;
  manual_remediation?: string[];
}

export interface HuntIoc {
  type: string;
  value: string;
}

export interface HuntResultPerIndex {
  index: string;
  hitCount: number;
  required: boolean;
}

export interface HuntResultTier1Counts {
  totalHits: number;
  returnedHits: number;
  affectedHosts: number;
  affectedUsers: number;
}

export interface HuntResultTier1 {
  status: string;
  counts: HuntResultTier1Counts;
  perIndex: HuntResultPerIndex[];
  resolvedIocs: HuntIoc[];
}

export interface HuntResultTier2Behavior {
  techniqueId: string;
  tacticIds: string[];
  confidence: number;
  ruleName: string;
}

export interface HuntResultTier2 {
  status: string;
  behaviors: HuntResultTier2Behavior[];
}

export interface ParsedHuntResult {
  hasConfirmedHit: boolean;
  timeRange: { from: string; to: string };
  tier1: HuntResultTier1;
  tier2?: HuntResultTier2;
}

export interface HuntResultRaw {
  has_confirmed_hit: boolean;
  time_range: { from: string; to: string };
  tier1: {
    status: string;
    counts: {
      total_hits: number;
      returned_hits: number;
      affected_hosts: number;
      affected_users: number;
    };
    per_index: Array<{ index: string; hit_count: number; required: boolean }>;
    resolved_iocs: HuntIoc[];
  };
  tier2?: {
    status: string;
    behaviors: Array<{
      technique_id: string;
      tactic_ids: string[];
      confidence: number;
      rule_name: string;
    }>;
  };
}

/** Mirrors `significantSecurityEventAttachmentDataSchema` (server/agent_builder/attachments/significant_security_event.ts). */
export interface SignificantSecurityEventAttachmentData {
  attachmentLabel?: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  source_watch: string;
  capability: string;
  run_id: string;
  security_knowledge_indicators: SecurityKnowledgeIndicator[];
  entities: AttachmentEntityRef[];
  alerts?: SignificantSecurityAlertRef[];
  events?: SignificantSecurityEventRef[];
  timeline: TimelineEntry[];
  hypothesis_tested: string;
  hunt_result?: HuntResultRaw;
  evidence_for: string[];
  evidence_against: string[];
  maps_to_proposal?: MapsToProposal;
  evaluation_record_ref: string;
  truncated?: boolean;
  truncated_original_count?: number;
  report_revision?: string;
}

export type SignificantSecurityEventAttachment = Attachment<
  string,
  SignificantSecurityEventAttachmentData
>;

const isValidTimelineEntry = (candidate: unknown): candidate is TimelineEntry =>
  Boolean(
    candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as TimelineEntry).at === 'string' &&
      typeof (candidate as TimelineEntry).what === 'string'
  );

const isValidIndicator = (candidate: unknown): candidate is SecurityKnowledgeIndicator =>
  Boolean(
    candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as SecurityKnowledgeIndicator).type === 'string' &&
      typeof (candidate as SecurityKnowledgeIndicator).value === 'string' &&
      (candidate as SecurityKnowledgeIndicator).type.length > 0 &&
      (candidate as SecurityKnowledgeIndicator).value.length > 0
  );

const isValidEventRef = (candidate: unknown): candidate is SignificantSecurityEventRef =>
  Boolean(
    candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as SignificantSecurityEventRef).event_id === 'string' &&
      typeof (candidate as SignificantSecurityEventRef).source_index === 'string' &&
      (candidate as SignificantSecurityEventRef).event_id.length > 0 &&
      (candidate as SignificantSecurityEventRef).source_index.length > 0
  );

const isValidAlertRef = (candidate: unknown): candidate is SignificantSecurityAlertRef =>
  Boolean(
    candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as SignificantSecurityAlertRef).alert_id === 'string' &&
      typeof (candidate as SignificantSecurityAlertRef).index === 'string' &&
      (candidate as SignificantSecurityAlertRef).alert_id.length > 0 &&
      (candidate as SignificantSecurityAlertRef).index.length > 0
  );

const isValidHuntIoc = (candidate: unknown): candidate is HuntIoc =>
  Boolean(
    candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as HuntIoc).type === 'string' &&
      typeof (candidate as HuntIoc).value === 'string' &&
      (candidate as HuntIoc).type.length > 0 &&
      (candidate as HuntIoc).value.length > 0
  );

const isValidPerIndex = (candidate: unknown): candidate is HuntResultPerIndex => {
  if (!candidate || typeof candidate !== 'object') return false;
  const record = candidate as Record<string, unknown>;
  return (
    typeof record.index === 'string' &&
    record.index.length > 0 &&
    typeof record.hit_count === 'number' &&
    typeof record.required === 'boolean'
  );
};

const parsePerIndex = (candidate: unknown): HuntResultPerIndex | undefined => {
  if (!isValidPerIndex(candidate)) return undefined;
  const record = candidate as unknown as Record<string, unknown>;
  return {
    index: record.index as string,
    hitCount: record.hit_count as number,
    required: record.required as boolean,
  };
};

const isValidTier2Behavior = (candidate: unknown): boolean => {
  if (!candidate || typeof candidate !== 'object') return false;
  const record = candidate as Record<string, unknown>;
  return (
    typeof record.technique_id === 'string' &&
    record.technique_id.length > 0 &&
    Array.isArray(record.tactic_ids) &&
    record.tactic_ids.every((tacticId) => typeof tacticId === 'string') &&
    typeof record.confidence === 'number' &&
    typeof record.rule_name === 'string' &&
    record.rule_name.length > 0
  );
};

const parseTier2Behavior = (candidate: unknown): HuntResultTier2Behavior | undefined => {
  if (!isValidTier2Behavior(candidate)) return undefined;
  const record = candidate as Record<string, unknown>;
  return {
    techniqueId: record.technique_id as string,
    tacticIds: (record.tactic_ids as unknown[]).filter(
      (tacticId): tacticId is string => typeof tacticId === 'string'
    ),
    confidence: record.confidence as number,
    ruleName: record.rule_name as string,
  };
};

const parseTier1 = (candidate: unknown): HuntResultTier1 | undefined => {
  if (!candidate || typeof candidate !== 'object') return undefined;
  const record = candidate as Record<string, unknown>;
  if (typeof record.status !== 'string') return undefined;
  const counts = record.counts;
  if (!counts || typeof counts !== 'object') return undefined;
  const countsRecord = counts as Record<string, unknown>;
  if (
    typeof countsRecord.total_hits !== 'number' ||
    typeof countsRecord.returned_hits !== 'number' ||
    typeof countsRecord.affected_hosts !== 'number' ||
    typeof countsRecord.affected_users !== 'number'
  ) {
    return undefined;
  }

  return {
    status: record.status,
    counts: {
      totalHits: countsRecord.total_hits,
      returnedHits: countsRecord.returned_hits,
      affectedHosts: countsRecord.affected_hosts,
      affectedUsers: countsRecord.affected_users,
    },
    perIndex: Array.isArray(record.per_index)
      ? record.per_index.map(parsePerIndex).filter((entry): entry is HuntResultPerIndex => !!entry)
      : [],
    resolvedIocs: Array.isArray(record.resolved_iocs)
      ? record.resolved_iocs.filter(isValidHuntIoc)
      : [],
  };
};

const parseTier2 = (candidate: unknown): HuntResultTier2 | undefined => {
  if (!candidate || typeof candidate !== 'object') return undefined;
  const record = candidate as Record<string, unknown>;
  if (typeof record.status !== 'string') return undefined;

  return {
    status: record.status,
    behaviors: Array.isArray(record.behaviors)
      ? record.behaviors
          .map(parseTier2Behavior)
          .filter((behavior): behavior is HuntResultTier2Behavior => !!behavior)
      : [],
  };
};

/**
 * Structural, defensive parser for `hunt_result`: mirrors `huntResultSchema`
 * (`common/significant_security_event_schema.ts`). Drops the whole block on
 * a malformed `tier1` (a hunt result without a valid tier1 is not
 * renderable), but tolerates a malformed `tier2` by dropping it since it is
 * optional in the schema.
 */
const parseHuntResult = (candidate: unknown): ParsedHuntResult | undefined => {
  if (!candidate || typeof candidate !== 'object') return undefined;
  const record = candidate as Record<string, unknown>;
  if (typeof record.has_confirmed_hit !== 'boolean') return undefined;

  const timeRange = record.time_range;
  if (!timeRange || typeof timeRange !== 'object') return undefined;
  const timeRangeRecord = timeRange as Record<string, unknown>;
  if (typeof timeRangeRecord.from !== 'string' || typeof timeRangeRecord.to !== 'string') {
    return undefined;
  }

  const tier1 = parseTier1(record.tier1);
  if (!tier1) return undefined;

  const tier2 = record.tier2 !== undefined ? parseTier2(record.tier2) : undefined;

  return {
    hasConfirmedHit: record.has_confirmed_hit,
    timeRange: { from: timeRangeRecord.from, to: timeRangeRecord.to },
    tier1,
    tier2,
  };
};

/**
 * Structural, defensive parser: the server already validates this payload against
 * `significantSecurityEventAttachmentDataSchema` on write, but the renderer must not throw
 * on a malformed or stale attachment: it drops malformed array entries and falls back to
 * empty-state sentinels that match the server-side text formatter.
 */
export interface ParsedSignificantSecurityEvent {
  title: string;
  severity: string;
  confidence?: number;
  status?: string;
  sourceWatch?: string;
  capability?: string;
  runId?: string;
  reportId?: string;
  hypothesisTested?: string;
  timeline: TimelineEntry[];
  entities: AttachmentEntityRef[];
  alerts: SignificantSecurityAlertRef[];
  events: SignificantSecurityEventRef[];
  indicators: SecurityKnowledgeIndicator[];
  evidenceFor: string[];
  evidenceAgainst: string[];
  evidenceForCount: number;
  evidenceAgainstCount: number;
  huntResult?: ParsedHuntResult;
  truncated?: boolean;
  truncatedOriginalCount?: number;
}

export const parseSignificantSecurityEventData = (
  candidate: unknown
): ParsedSignificantSecurityEvent | undefined => {
  if (!candidate || typeof candidate !== 'object') return undefined;
  const record = candidate as Record<string, unknown>;
  if (typeof record.title !== 'string' || record.title.length === 0) return undefined;

  const evidenceFor = Array.isArray(record.evidence_for)
    ? record.evidence_for.filter((item): item is string => typeof item === 'string')
    : [];
  const evidenceAgainst = Array.isArray(record.evidence_against)
    ? record.evidence_against.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    title: record.title,
    severity: typeof record.severity === 'string' ? record.severity : 'unknown',
    confidence: typeof record.confidence === 'number' ? record.confidence : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    sourceWatch: typeof record.source_watch === 'string' ? record.source_watch : undefined,
    capability: typeof record.capability === 'string' ? record.capability : undefined,
    runId: typeof record.run_id === 'string' ? record.run_id : undefined,
    reportId: typeof record.report_id === 'string' ? record.report_id : undefined,
    hypothesisTested:
      typeof record.hypothesis_tested === 'string' ? record.hypothesis_tested : undefined,
    timeline: Array.isArray(record.timeline) ? record.timeline.filter(isValidTimelineEntry) : [],
    entities: Array.isArray(record.entities) ? record.entities.filter(isAttachmentEntityRef) : [],
    alerts: Array.isArray(record.alerts) ? record.alerts.filter(isValidAlertRef) : [],
    events: Array.isArray(record.events) ? record.events.filter(isValidEventRef) : [],
    indicators: Array.isArray(record.security_knowledge_indicators)
      ? record.security_knowledge_indicators.filter(isValidIndicator)
      : [],
    evidenceFor,
    evidenceAgainst,
    evidenceForCount: evidenceFor.length,
    evidenceAgainstCount: evidenceAgainst.length,
    huntResult: record.hunt_result !== undefined ? parseHuntResult(record.hunt_result) : undefined,
    truncated: record.truncated === true ? true : undefined,
    truncatedOriginalCount:
      typeof record.truncated_original_count === 'number'
        ? record.truncated_original_count
        : undefined,
  };
};
