/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AnchorIoc {
  type: string;
  value: string;
}

export interface AnchorSet {
  iocs?: AnchorIoc[];
  ioc_set_hash?: string | null;
  actors?: string[];
  technique_ids?: string[];
}

export interface SearchByAnchorsParams {
  anchors?: AnchorSet;
  source_report_id?: string;
  size?: number;
}

export interface AnchorMatchBreakdown {
  ioc_hash_hits: string[];
  ioc_network_hits: string[];
  ioc_set_hash_match: boolean;
  actor_hits: string[];
  technique_hits: string[];
  discriminating_match_count: number;
}

export interface AnchorHit {
  report_id: string;
  score: number | null;
  title: string;
  severity: string;
  source_type: string;
  extracted_at: string;
  match_breakdown: AnchorMatchBreakdown;
}

export interface SearchByAnchorsResult {
  hits: AnchorHit[];
  total: number;
  anchor_summary: {
    hash_ioc_count: number;
    network_ioc_count: number;
    ioc_set_hash: string | null;
    actor_count: number;
    technique_count: number;
    discriminating_anchor_count: number;
  };
}

export type CorrelationEngineStatus = 'matched' | 'no_match' | 'unavailable';

export interface DiamondScore {
  vertex: 'adversary' | 'capability' | 'infrastructure' | 'victim';
  related_report_id: string;
  score: number;
}

export interface CorrelationEngineResult {
  status: CorrelationEngineStatus;
  anchors: AnchorSet;
  matches: AnchorHit[];
  thresholds: { discriminating_min: number };
  self_match_excluded: true;
  /** Empty until PR 3b's diamond phase. */
  diamond_scores: DiamondScore[];
  anchor_summary: SearchByAnchorsResult['anchor_summary'];
}

/** Attachment data shape for `security.hunt_correlation` (PR 1 contract). */
export interface AnchorItem {
  kind: 'hash' | 'ioc_set_hash' | 'actor';
  value: string;
}

/**
 * The `security.hunt_correlation` attachment's own `thresholds` shape
 * (`alertzero/server/agent_builder/attachments/hunt_correlation.ts`, PR 1,
 * kibana#291882): `anchor_match` and `diamond_vertex`, both 0-1. Distinct
 * from this engine's internal `CorrelationEngineResult.thresholds`
 * (`discriminating_min`), which gates the anchors search itself rather than
 * describing what the attachment payload means to a reader.
 */
export interface HuntCorrelationAttachmentThresholds {
  anchor_match: number;
  diamond_vertex: number;
}

export interface HuntCorrelationAttachmentData {
  anchors: AnchorItem[];
  diamond_scores: DiamondScore[];
  thresholds: HuntCorrelationAttachmentThresholds;
  self_match_excluded: true;
  report_revision: string;
}
