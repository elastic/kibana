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
  type ReportTablePayload,
} from '../../../../common/threat_intelligence/hub';
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
 * Stores (or refreshes) a `threat-intel-report-table` attachment via the runner's
 * `AttachmentStateManager`. Bypasses the `attachments.add` agent tool, which
 * rejects read-only attachment types even for initial creation.
 */
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
      type: THREAT_INTEL_ATTACHMENT_TYPES.reportTable,
      data: payload,
      description,
    });
    return { attachmentId: created.id, version: created.current_version };
  } catch (error) {
    logger.warn(
      `Failed to persist ${THREAT_INTEL_ATTACHMENT_TYPES.reportTable} attachment: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
};

// Preserve type used by search_reports tool handler
export type { SearchReportsResult };
