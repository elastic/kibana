/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';

export interface Anchor {
  kind: 'hash' | 'ioc_set_hash' | 'actor';
  value: string;
}

export interface DiamondScore {
  vertex: 'adversary' | 'capability' | 'infrastructure' | 'victim';
  related_report_id: string;
  score: number;
}

export interface Thresholds {
  anchor_match: number;
  diamond_vertex: number;
}

/** Mirrors `huntCorrelationAttachmentDataSchema` (server/agent_builder/attachments/hunt_correlation.ts). */
export interface HuntCorrelationAttachmentData {
  attachmentLabel?: string;
  anchors: Anchor[];
  diamond_scores: DiamondScore[];
  thresholds: Thresholds;
  self_match_excluded: true;
  report_revision?: string;
}

export type HuntCorrelationAttachment = Attachment<string, HuntCorrelationAttachmentData>;

const isValidAnchor = (candidate: unknown): candidate is Anchor =>
  Boolean(
    candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as Anchor).kind === 'string' &&
      typeof (candidate as Anchor).value === 'string'
  );

const isValidDiamondScore = (candidate: unknown): candidate is DiamondScore =>
  Boolean(
    candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as DiamondScore).vertex === 'string' &&
      typeof (candidate as DiamondScore).related_report_id === 'string' &&
      typeof (candidate as DiamondScore).score === 'number'
  );

export interface ParsedHuntCorrelation {
  anchors: Anchor[];
  diamondScores: DiamondScore[];
  thresholds?: Thresholds;
}

/**
 * Structural, defensive parser mirroring the SSE type's approach: the server already validates
 * this payload on write, but the renderer drops malformed array entries rather than throwing.
 */
export const parseHuntCorrelationData = (candidate: unknown): ParsedHuntCorrelation | undefined => {
  if (!candidate || typeof candidate !== 'object') return undefined;
  const record = candidate as Record<string, unknown>;

  const thresholdsCandidate = record.thresholds as Record<string, unknown> | undefined;
  const thresholds =
    thresholdsCandidate &&
    typeof thresholdsCandidate.anchor_match === 'number' &&
    typeof thresholdsCandidate.diamond_vertex === 'number'
      ? {
          anchor_match: thresholdsCandidate.anchor_match,
          diamond_vertex: thresholdsCandidate.diamond_vertex,
        }
      : undefined;

  if (!Array.isArray(record.anchors) && !Array.isArray(record.diamond_scores) && !thresholds) {
    return undefined;
  }

  return {
    anchors: Array.isArray(record.anchors) ? record.anchors.filter(isValidAnchor) : [],
    diamondScores: Array.isArray(record.diamond_scores)
      ? record.diamond_scores.filter(isValidDiamondScore)
      : [],
    thresholds,
  };
};
