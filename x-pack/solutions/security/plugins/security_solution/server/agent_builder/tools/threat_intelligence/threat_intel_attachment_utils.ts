/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/logging';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import {
  THREAT_INTEL_ATTACHMENT_TYPES,
  formatTimeRangeLabel,
  mapSearchReportHitToTableRow,
  type MitreHeatmapPayload,
  type ReportTablePayload,
  type ThreatIntelAttachmentType,
} from '../../../../common/threat_intelligence/hub';
import type { CoverageGapParams } from '../../../threat_intelligence/services/coverage_gap';
import type {
  SearchReportsParams,
  SearchReportsResult,
} from '../../../threat_intelligence/services/search_reports';

export { formatTimeRangeLabel, mapSearchReportHitToTableRow };

export const buildDigestReportTableAttachmentId = (params: SearchReportsParams): string => {
  const seed = JSON.stringify({
    query: params.query,
    categories: params.categories ?? [],
    time_range: params.time_range ?? null,
    sort_by: params.sort_by ?? 'relevance',
  });
  const digest = createHash('sha256').update(seed).digest('hex').slice(0, 16);
  return `${THREAT_INTEL_ATTACHMENT_TYPES.reportTable}:digest:${digest}`;
};

export const buildCoverageGapHeatmapAttachmentId = (params: CoverageGapParams): string => {
  const seed = JSON.stringify({
    time_range: params.time_range,
    tags: params.tags ?? [],
    source_types: params.source_types ?? [],
    min_severity: params.min_severity ?? null,
    max_techniques: params.max_techniques ?? 50,
  });
  const digest = createHash('sha256').update(seed).digest('hex').slice(0, 16);
  return `${THREAT_INTEL_ATTACHMENT_TYPES.mitreHeatmap}:coverage:${digest}`;
};

export const buildRenderAttachmentTag = ({
  attachmentId,
  version,
}: {
  attachmentId: string;
  version: number;
}): string => {
  const { tagName } = renderAttachmentElement;
  const { attachmentId: idAttr, version: versionAttr } = renderAttachmentElement.attributes;
  return `<${tagName} ${idAttr}="${attachmentId}" ${versionAttr}="${version}" />`;
};

/**
 * Stores (or refreshes) a read-only threat-intel attachment via the runner's
 * `AttachmentStateManager`. Bypasses the `attachments.add` agent tool, which
 * rejects read-only attachment types even for initial creation.
 */
const ensureThreatIntelAttachment = async <TPayload>({
  attachments,
  id,
  type,
  payload,
  description,
  logger,
}: {
  attachments: AttachmentStateManager;
  id: string;
  type: ThreatIntelAttachmentType;
  payload: TPayload;
  description: string;
  logger: Logger;
}): Promise<{ attachmentId: string; version: number } | null> => {
  try {
    const existing = attachments.getAttachmentRecord(id);
    if (existing) {
      const updated = await attachments.update(id, { data: payload, description });
      if (!updated) {
        return null;
      }
      return { attachmentId: updated.id, version: updated.current_version };
    }

    const created = await attachments.add({
      id,
      type,
      data: payload,
      description,
    });
    return { attachmentId: created.id, version: created.current_version };
  } catch (error) {
    logger.warn(
      `Failed to persist ${type} attachment: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
};

/** @see ensureThreatIntelAttachment */
export const ensureReportTableAttachment = async ({
  attachments,
  id,
  payload,
  description,
  logger,
}: {
  attachments: AttachmentStateManager;
  id: string;
  payload: ReportTablePayload;
  description: string;
  logger: Logger;
}): Promise<{ attachmentId: string; version: number } | null> =>
  ensureThreatIntelAttachment({
    attachments,
    id,
    type: THREAT_INTEL_ATTACHMENT_TYPES.reportTable,
    payload,
    description,
    logger,
  });

/** @see ensureThreatIntelAttachment */
export const ensureMitreHeatmapAttachment = async ({
  attachments,
  id,
  payload,
  description,
  logger,
}: {
  attachments: AttachmentStateManager;
  id: string;
  payload: MitreHeatmapPayload;
  description: string;
  logger: Logger;
}): Promise<{ attachmentId: string; version: number } | null> =>
  ensureThreatIntelAttachment({
    attachments,
    id,
    type: THREAT_INTEL_ATTACHMENT_TYPES.mitreHeatmap,
    payload,
    description,
    logger,
  });

// Preserve type used by search_reports tool handler
export type { SearchReportsResult };
