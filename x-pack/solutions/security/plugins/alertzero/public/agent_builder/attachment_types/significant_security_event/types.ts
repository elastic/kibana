/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';

export interface SecurityKnowledgeIndicator {
  type: string;
  value: string;
  confidence?: number;
}

export interface TimelineEntry {
  at: string;
  what: string;
}

export interface SignificantSecurityEventRef {
  event_id: string;
  source_index: string;
}

export interface MapsToProposal {
  category?: string;
  impact?: string;
  confidence?: number;
  actionWorkflowId?: string;
  actionInput?: Record<string, unknown>;
  manual_remediation?: string[];
}

/** Mirrors `significantSecurityEventAttachmentDataSchema` (server/agent_builder/attachments/significant_security_event.ts). */
export interface SignificantSecurityEventAttachmentData {
  attachmentLabel?: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status: string;
  source_watch: string;
  capability: string;
  run_id: string;
  security_knowledge_indicators: SecurityKnowledgeIndicator[];
  entities: string[];
  alerts?: string[];
  events?: SignificantSecurityEventRef[];
  timeline: TimelineEntry[];
  hypothesis_tested: string;
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
      typeof (candidate as SecurityKnowledgeIndicator).value === 'string'
  );

const isValidEventRef = (candidate: unknown): candidate is SignificantSecurityEventRef =>
  Boolean(
    candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as SignificantSecurityEventRef).event_id === 'string' &&
      typeof (candidate as SignificantSecurityEventRef).source_index === 'string'
  );

/**
 * Structural, defensive parser: the server already validates this payload against
 * `significantSecurityEventAttachmentDataSchema` on write, but the renderer must not throw
 * on a malformed or stale attachment — it drops malformed array entries and falls back to
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
  hypothesisTested?: string;
  timeline: TimelineEntry[];
  entities: string[];
  alerts: string[];
  events: SignificantSecurityEventRef[];
  indicators: SecurityKnowledgeIndicator[];
  evidenceForCount: number;
  evidenceAgainstCount: number;
}

export const parseSignificantSecurityEventData = (
  candidate: unknown
): ParsedSignificantSecurityEvent | undefined => {
  if (!candidate || typeof candidate !== 'object') return undefined;
  const record = candidate as Record<string, unknown>;
  if (typeof record.title !== 'string' || record.title.length === 0) return undefined;

  return {
    title: record.title,
    severity: typeof record.severity === 'string' ? record.severity : 'unknown',
    confidence: typeof record.confidence === 'number' ? record.confidence : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    sourceWatch: typeof record.source_watch === 'string' ? record.source_watch : undefined,
    capability: typeof record.capability === 'string' ? record.capability : undefined,
    runId: typeof record.run_id === 'string' ? record.run_id : undefined,
    hypothesisTested:
      typeof record.hypothesis_tested === 'string' ? record.hypothesis_tested : undefined,
    timeline: Array.isArray(record.timeline) ? record.timeline.filter(isValidTimelineEntry) : [],
    entities: Array.isArray(record.entities)
      ? record.entities.filter((entity): entity is string => typeof entity === 'string')
      : [],
    alerts: Array.isArray(record.alerts)
      ? record.alerts.filter((alert): alert is string => typeof alert === 'string')
      : [],
    events: Array.isArray(record.events) ? record.events.filter(isValidEventRef) : [],
    indicators: Array.isArray(record.security_knowledge_indicators)
      ? record.security_knowledge_indicators.filter(isValidIndicator)
      : [],
    evidenceForCount: Array.isArray(record.evidence_for) ? record.evidence_for.length : 0,
    evidenceAgainstCount: Array.isArray(record.evidence_against)
      ? record.evidence_against.length
      : 0,
  };
};
