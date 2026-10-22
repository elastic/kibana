/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Plain-text report content helpers shared by every ingest path.
 *
 * MVP stores bounded plain text only. Markup never reaches this module: the RSS
 * adapter converts embedded feed fragments to text before calling
 * `buildReportContent`, and no path stores raw HTML.
 */

/** Collapses visible whitespace into the storage representation. */
export const collapseWhitespace = (input: string): string => input.replace(/\s+/g, ' ').trim();

/** Truncates text without splitting a surrogate pair. */
export const truncate = (input: string, maxLength: number): string => {
  if (input.length <= maxLength) return input;
  if (maxLength <= 0) return '';
  const contentLength = maxLength - 1;
  const rawSlice = input.slice(0, contentLength);
  const slice = /[\uD800-\uDBFF]$/.test(rawSlice) ? rawSlice.slice(0, -1) : rawSlice;
  const lastBoundary = slice.lastIndexOf(' ');
  return lastBoundary > contentLength * 0.6
    ? `${slice.slice(0, lastBoundary).trimEnd()}…`
    : `${slice.trimEnd()}…`;
};

export interface ReportContentDocument {
  title: string;
  body_text: string;
  language: string;
}

/** Builds the bounded plain-text content block written by every ingest path. */
export const buildReportContent = ({
  title,
  bodyText,
  language = 'en',
}: {
  title: string;
  bodyText: string;
  language?: string;
}): ReportContentDocument => {
  const hasBody = bodyText.trim().length > 0;
  return {
    title,
    body_text: hasBody ? bodyText : title,
    language,
  };
};
