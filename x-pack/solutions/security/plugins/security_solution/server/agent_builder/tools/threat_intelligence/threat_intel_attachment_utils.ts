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
  SEVERITY_LEVELS,
  THREAT_CATEGORIES,
  type ReportTablePayload,
  type SearchReportsParams,
  type SearchReportsResult,
  type SeverityLevel,
  type ThreatCategory,
} from '../../../../common/threat_intelligence/hub';
import { ATTACHMENT_TYPES } from '../../attachments/threat_intelligence_attachment_types';

const isSeverityLevel = (value: unknown): value is SeverityLevel =>
  typeof value === 'string' && (SEVERITY_LEVELS as readonly string[]).includes(value);

const isThreatCategory = (value: unknown): value is ThreatCategory =>
  typeof value === 'string' && (THREAT_CATEGORIES as readonly string[]).includes(value);

/**
 * Map a `search_reports` hit (ES `_source` + `report_id`) into the
 * `threat-intel-report-table` row shape.
 */
export const mapSearchReportHitToTableRow = (
  hit: SearchReportsResult['reports'][number]
): ReportTablePayload['reports'][number] => {
  const title =
    typeof hit.content === 'object' &&
    hit.content !== null &&
    'title' in hit.content &&
    typeof (hit.content as { title?: unknown }).title === 'string'
      ? (hit.content as { title: string }).title
      : 'Untitled report';

  const source =
    typeof hit.source === 'object' && hit.source !== null
      ? (hit.source as { type?: string; name?: string; url?: string })
      : {};

  const severityRaw =
    typeof hit.severity === 'object' &&
    hit.severity !== null &&
    'level' in hit.severity
      ? (hit.severity as { level?: unknown }).level
      : undefined;

  const extracted =
    typeof hit.extracted === 'object' && hit.extracted !== null
      ? (hit.extracted as {
          ttps?: { techniques?: unknown };
        })
      : undefined;

  const techniquesRaw = extracted?.ttps?.techniques;
  const techniques = Array.isArray(techniquesRaw)
    ? techniquesRaw.filter((t): t is string => typeof t === 'string')
    : [];

  const categoriesRaw =
    typeof hit.extracted === 'object' &&
    hit.extracted !== null &&
    'categories' in hit.extracted
      ? (hit.extracted as { categories?: unknown }).categories
      : undefined;
  const categories = Array.isArray(categoriesRaw)
    ? categoriesRaw.filter(isThreatCategory)
    : undefined;

  const publishedAt =
    typeof hit['@timestamp'] === 'string' ? hit['@timestamp'] : undefined;

  return {
    report_id: String(hit.report_id ?? ''),
    title,
    source: {
      type: typeof source.type === 'string' ? source.type : 'unknown',
      name: typeof source.name === 'string' ? source.name : 'Unknown source',
      ...(typeof source.url === 'string' ? { url: source.url } : {}),
    },
    severity: isSeverityLevel(severityRaw) ? severityRaw : 'medium',
    ...(publishedAt ? { published_at: publishedAt } : {}),
    ...(categories && categories.length > 0 ? { categories } : {}),
    techniques,
    iocs: [],
  };
};

export const formatTimeRangeLabel = (timeRange?: SearchReportsParams['time_range']): string => {
  if (!timeRange) {
    return 'All time';
  }
  if (timeRange.from === 'now-7d' && (timeRange.to === 'now' || !timeRange.to)) {
    return 'Last 7 days';
  }
  return `${timeRange.from} → ${timeRange.to}`;
};

export const buildDigestReportTableAttachmentId = (params: SearchReportsParams): string => {
  const seed = JSON.stringify({
    query: params.query,
    categories: params.categories ?? [],
    time_range: params.time_range ?? null,
    sort_by: params.sort_by ?? 'relevance',
  });
  const digest = createHash('sha256').update(seed).digest('hex').slice(0, 16);
  return `threat-intel-report-table:digest:${digest}`;
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
      type: ATTACHMENT_TYPES.reportTable,
      data: payload,
      description,
    });
    return { attachmentId: created.id, version: created.current_version };
  } catch (error) {
    logger.warn(
      `Failed to persist ${ATTACHMENT_TYPES.reportTable} attachment: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
};
