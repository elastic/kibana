/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnchorIoc,
  AnchorItem,
  AnchorSet,
  CorrelationEngineStatus,
  DiamondScore,
  HuntCorrelationAttachmentData,
  HuntCorrelationAttachmentThresholds,
} from '@kbn/alertzero-common';

// Re-export package types used by other files in this directory.
export type {
  AnchorIoc,
  AnchorItem,
  AnchorSet,
  CorrelationEngineStatus,
  DiamondScore,
  HuntCorrelationAttachmentData,
  HuntCorrelationAttachmentThresholds,
};

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
  /** The anchors the search actually ran with: the caller's, or the source report's when only `source_report_id` was given. */
  anchors: AnchorSet;
  anchor_summary: {
    hash_ioc_count: number;
    network_ioc_count: number;
    ioc_set_hash: string | null;
    actor_count: number;
    technique_count: number;
    discriminating_anchor_count: number;
  };
}

export interface CorrelationEngineResult {
  status: CorrelationEngineStatus;
  anchors: AnchorSet;
  matches: AnchorHit[];
  thresholds: { discriminating_min: number };
  self_match_excluded: boolean;
  diamond_scores: DiamondScore[];
  anchor_summary: SearchByAnchorsResult['anchor_summary'];
}
