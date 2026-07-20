/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DashboardOverviewResponse,
  ReportTablePayload,
  SeverityLevel,
  ThreatCategory,
} from '../../../../common/threat_intelligence/hub';
import type { ThreatReportFeedItem } from './types';
import { SEVERITY_RANK, type ReportFeedSort } from './constants';

/**
 * Whether Hub should render `source.url` as an external link.
 * Allows http(s) and offline fixture articles (`data:text/html` only).
 * Other `data:` MIME types (svg, javascript, …) stay hidden.
 */
export const isBrowsableReportUrl = (url: string | undefined): url is string => {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    if (protocol === 'http:' || protocol === 'https:') return true;
    if (protocol !== 'data:') return false;
    const commaIdx = url.indexOf(',');
    if (commaIdx === -1) return false;
    const meta = url.slice('data:'.length, commaIdx).toLowerCase();
    const mime = meta.split(';')[0] ?? '';
    return mime === 'text/html';
  } catch {
    return false;
  }
};

export const getSourceFaviconUrl = (sourceUrl?: string): string | undefined => {
  if (!sourceUrl) return undefined;
  try {
    const { protocol, hostname } = new URL(sourceUrl);
    if (protocol !== 'http:' && protocol !== 'https:') return undefined;
    if (!hostname) return undefined;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;
  } catch {
    return undefined;
  }
};

export const fromDashboardArticle = (
  article: DashboardOverviewResponse['recent_articles'][number]
): ThreatReportFeedItem => ({
  reportId: article.report_id,
  title: article.title || article.report_id,
  sourceName: article.source_name || 'unknown',
  sourceUrl: article.source_url,
  severity: article.severity,
  publishedAt: article['@timestamp'],
  categories: article.categories,
  environmentHitsTotal: article.environment_hits_total,
});

export const fromReportTableRow = (
  row: ReportTablePayload['reports'][number]
): ThreatReportFeedItem => ({
  reportId: row.report_id,
  title: row.title,
  sourceName: row.source.name,
  sourceUrl: row.source.url,
  severity: row.severity,
  publishedAt: row.published_at,
  categories: row.categories ?? [],
  environmentHitsTotal: row.environment_hits_total,
  techniques: row.techniques,
  iocCount: row.iocs.length,
  relatedReportCount: row.related_reports?.count,
});

export const countSeverities = (items: ThreatReportFeedItem[]): Record<SeverityLevel, number> => {
  const counts: Record<SeverityLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const item of items) {
    counts[item.severity] = (counts[item.severity] ?? 0) + 1;
  }
  return counts;
};

export const countCategoriesFromItems = (
  items: ThreatReportFeedItem[]
): Map<ThreatCategory, number> => {
  const map = new Map<ThreatCategory, number>();
  for (const item of items) {
    for (const category of item.categories) {
      map.set(category, (map.get(category) ?? 0) + 1);
    }
  }
  return map;
};

export const filterAndSortFeedItems = ({
  items,
  selectedSeverities,
  selectedCategories,
  sortBy,
}: {
  items: ThreatReportFeedItem[];
  selectedSeverities: SeverityLevel[];
  selectedCategories: ThreatCategory[];
  sortBy: ReportFeedSort;
}): ThreatReportFeedItem[] => {
  let next = items;
  if (selectedSeverities.length > 0) {
    next = next.filter((item) => selectedSeverities.includes(item.severity));
  }
  if (selectedCategories.length > 0) {
    next = next.filter((item) =>
      item.categories.some((category) => selectedCategories.includes(category))
    );
  }
  if (sortBy === 'date') {
    next = [...next].sort((a, b) => {
      const aTs = a.publishedAt ?? '';
      const bTs = b.publishedAt ?? '';
      return bTs.localeCompare(aTs);
    });
  } else if (sortBy === 'severity') {
    next = [...next].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  }
  return next;
};
