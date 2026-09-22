/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ThreatAttachmentData } from '../../../../common/threat_attachment_schema';

export type { ThreatAttachmentData } from '../../../../common/threat_attachment_schema';

export type ThreatAttachment = Attachment<string, ThreatAttachmentData>;

/**
 * Structural check for the fields the renderer actually reads. Deliberately
 * permissive on the optional captured fields (old/malformed attachments
 * should still render with whatever fallback data is usable) but requires a
 * non-empty `report_id`, since that is the only field the live fetch needs.
 */
export const isValidThreatAttachmentData = (
  candidate: unknown
): candidate is ThreatAttachmentData => {
  if (!candidate || typeof candidate !== 'object') return false;
  const record = candidate as Record<string, unknown>;
  return typeof record.report_id === 'string' && record.report_id.length > 0;
};

export interface ThreatReportIoc {
  type: string;
  value: string;
  severity?: string;
  tier?: string;
}

export interface ThreatReportTtps {
  tactics: string[];
  techniques: string[];
}

export interface ThreatReportDiamondVertex {
  vertex: 'adversary' | 'capability' | 'infrastructure' | 'victim';
  signal?: string;
  summary?: string;
}

export interface ThreatReportDiamond {
  vertices: ThreatReportDiamondVertex[];
  signalCount?: number;
  suitable?: boolean;
}

export interface ThreatReportExternalReference {
  sourceName?: string;
  url?: string;
  externalId?: string;
}

export interface ThreatReportEvidence {
  alertHitsTotal?: number;
  lastHuntStatus?: string;
  lastHuntedAt?: string;
  lastHuntRunId?: string;
  corroboratedRankScore?: number;
}

/** Live report projection the renderer reads off the internal read-API response. */
export interface ThreatReportLiveData {
  title?: string;
  severityLevel?: string;
  severityScore?: number;
  sourceName?: string;
  iocs?: ThreatReportIoc[];
  ttps?: ThreatReportTtps;
  diamond?: ThreatReportDiamond;
  categories?: string[];
  regions?: string[];
  corroboratedRankScore?: number;
  evidence?: ThreatReportEvidence;
  externalReferences?: ThreatReportExternalReference[];
}
