/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncateAtWord } from './coverage_text';
import type { ReportHuntContext } from './load_report_hunt_context';

/** `rule_creation`'s `gap_description` caps at 2000, and Detection maps this field onto it. */
export const MAX_THREAT_SUMMARY_CHARS = 2000;

/** IOCs named in the summary before the remainder is counted. */
const MAX_SUMMARY_IOCS = 10;
/** An extract shorter than this is thin enough to earn a body lead-in. */
const THIN_EXTRACT_CHARS = 200;
/** The lead-in is a hint at the story, not the article; `content` carries the longer excerpt. */
const BODY_LEAD_IN_CHARS = 600;

const iocSummary = (iocs: NonNullable<ReportHuntContext['iocs']>): string => {
  const shown = iocs.slice(0, MAX_SUMMARY_IOCS).map(({ type, value }) => `${type}: ${value}`);
  const more = iocs.length - shown.length;
  return `Indicators: ${shown.join(', ')}${more > 0 ? ` (+${more} more)` : ''}`;
};

/**
 * The structured extract of a report: its title, the techniques and indicators it names, and
 * the vendor and product. Cheaper and denser than a slice of the article, so it leads.
 */
export const buildReportExtract = ({
  report,
  techniqueIds = [],
}: {
  report?: ReportHuntContext;
  techniqueIds?: string[];
}): string[] => {
  if (!report) return [];
  const techniques = [...new Set([...techniqueIds, ...(report.techniques ?? [])])];
  const vendorProduct = [report.vendor, report.product].filter(Boolean).join(' ');
  return [
    ...(report.title ? [report.title] : []),
    ...(techniques.length > 0 ? [`Techniques: ${techniques.join(', ')}`] : []),
    ...(report.iocs && report.iocs.length > 0 ? [iocSummary(report.iocs)] : []),
    ...(vendorProduct ? [`Vendor/product: ${vendorProduct}`] : []),
  ];
};

/**
 * The threat story, at most {@link MAX_THREAT_SUMMARY_CHARS}. A hit uses what the finding
 * tested (its hypothesis, else the report quote the behavior came from, else the report
 * title). A run with no hit has no finding, so it leads with the top executed behavior's
 * report quote and then the structured extract, and only borrows a short body lead-in when
 * both are thin.
 */
export const buildThreatSummary = ({
  hasConfirmedHit,
  hypothesis,
  evidenceQuote,
  report,
  techniqueIds,
  fallbackTitle,
}: {
  hasConfirmedHit: boolean;
  hypothesis?: string;
  evidenceQuote?: string;
  report?: ReportHuntContext;
  techniqueIds?: string[];
  fallbackTitle?: string;
}): string => {
  if (hasConfirmedHit) {
    const story = hypothesis ?? evidenceQuote ?? report?.title ?? fallbackTitle ?? '';
    return truncateAtWord(story, MAX_THREAT_SUMMARY_CHARS);
  }

  const extract = buildReportExtract({ report, techniqueIds });
  const lines = [...(evidenceQuote ? [evidenceQuote] : []), ...extract];
  const thin = evidenceQuote === undefined && extract.join('\n').length < THIN_EXTRACT_CHARS;
  if (thin && report?.bodyText) {
    lines.push(truncateAtWord(report.bodyText, BODY_LEAD_IN_CHARS));
  }
  return truncateAtWord(lines.join('\n'), MAX_THREAT_SUMMARY_CHARS);
};
