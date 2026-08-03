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
  ThreatRegion,
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

/**
 * Decode a browsable `data:text/html` article URL to HTML.
 * Returns undefined when the URL is not a data:text/html payload.
 */
export const decodeDataHtmlReportUrl = (url: string): string | undefined => {
  if (!isBrowsableReportUrl(url) || !url.startsWith('data:')) return undefined;
  const commaIdx = url.indexOf(',');
  if (commaIdx === -1) return undefined;
  const meta = url.slice('data:'.length, commaIdx).toLowerCase();
  const payload = url.slice(commaIdx + 1);
  try {
    return meta.includes(';base64') ? atob(payload) : decodeURIComponent(payload);
  } catch {
    return undefined;
  }
};

export interface OpenDataHtmlReportUrlDeps {
  readonly createObjectURL?: (blob: Blob) => string;
  readonly open?: (url: string, target?: string, features?: string) => Window | null;
  readonly revokeObjectURL?: (url: string) => void;
  readonly setTimeoutFn?: (handler: () => void, timeout: number) => number;
}

/**
 * Chrome blocks top-frame navigations to `data:` URLs from page links, which
 * yields a blank tab. Open offline HTML articles via a blob: URL instead.
 * http(s) links should keep native `<a href>` navigation.
 */
export const openDataHtmlReportUrl = (url: string, deps: OpenDataHtmlReportUrlDeps = {}): void => {
  const html = decodeDataHtmlReportUrl(url);
  if (!html) return;
  const createObjectURL = deps.createObjectURL ?? ((blob) => URL.createObjectURL(blob));
  const open = deps.open ?? ((href, target, features) => window.open(href, target, features));
  const revokeObjectURL = deps.revokeObjectURL ?? ((href) => URL.revokeObjectURL(href));
  const setTimeoutFn =
    deps.setTimeoutFn ?? ((handler, timeout) => window.setTimeout(handler, timeout));

  const blobUrl = createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const opened = open(blobUrl, '_blank', 'noopener,noreferrer');
  // Give the new tab time to load before revoking the object URL.
  setTimeoutFn(() => revokeObjectURL(blobUrl), opened ? 60_000 : 0);
};

/** Call from link onClick: intercept data:text/html, leave http(s) alone. */
export const onBrowsableReportUrlClick = (
  event: { preventDefault: () => void },
  url: string,
  deps?: OpenDataHtmlReportUrlDeps
): void => {
  if (!url.startsWith('data:')) return;
  event.preventDefault();
  openDataHtmlReportUrl(url, deps);
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
  regions: article.regions,
  bodyText: article.body_text,
  environmentHitsTotal: article.environment_hits_total,
});

/** Map a `find_threat_reports` hit into the shared card grid row. */
export const fromFindThreatReportHit = (hit: {
  report_id?: string;
  '@timestamp'?: string;
  source?: { name?: string; url?: string };
  content?: { title?: string; body_text?: string };
  severity?: { level?: SeverityLevel };
  extracted?: { categories?: ThreatCategory[] };
  geography?: { regions?: ThreatRegion[] };
  attribution?: { environment_hits_total?: number };
}): ThreatReportFeedItem => {
  const reportId = hit.report_id ?? '';
  const severity = hit.severity?.level ?? 'medium';
  return {
    reportId,
    title: hit.content?.title || reportId || '(untitled)',
    sourceName: hit.source?.name || 'unknown',
    sourceUrl: hit.source?.url,
    severity,
    publishedAt: hit['@timestamp'],
    categories: hit.extracted?.categories ?? [],
    regions: hit.geography?.regions,
    bodyText: hit.content?.body_text,
    environmentHitsTotal: hit.attribution?.environment_hits_total,
  };
};

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
