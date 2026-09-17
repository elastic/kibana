/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';

/**
 * Payload shape captured server-side by `threatAttachmentDataSchema`
 * (`server/agent_builder/attachments/threat.ts`). The server only validates
 * and formats this reference + fallback snapshot; the live document is
 * resolved client-side, space-projected, by the renderer below.
 */
export interface ThreatAttachmentData {
  attachmentLabel?: string;
  report_id: string;
  title?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
}

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

/** Live report projection the renderer reads off the internal read-API response. */
export interface ThreatReportLiveData {
  title?: string;
  severityLevel?: string;
  severityScore?: number;
  sourceName?: string;
}
