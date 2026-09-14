/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/**
 * Resource categories used across Synthetics to bucket browser network requests.
 *
 * The browser engine's own resource type (`synthetics.payload.type`) is stored in
 * `_source` but not indexed (the `synthetics.payload` object is mapped
 * `enabled: false`), so it cannot be filtered or aggregated on. The queryable
 * signal is the response Content-Type (`http.response.mime_type`), which the step
 * waterfall already folds into these categories — the certificates page resource
 * filter reuses the same taxonomy so both views stay consistent.
 */
export enum MimeType {
  Html = 'html',
  Script = 'script',
  Stylesheet = 'stylesheet',
  Media = 'media',
  Image = 'image',
  Font = 'font',
  XHR = 'xhr',
  Other = 'other',
}

// NOTE: This list tries to cover the standard spec compliant mime types,
// and a few popular non-standard ones, but it isn't exhaustive. Anything not
// listed here falls into `MimeType.Other`.
export const MimeTypesMap: Record<string, MimeType> = {
  'text/html': MimeType.Html,
  'application/javascript': MimeType.Script,
  'application/x-javascript': MimeType.Script,
  'text/javascript': MimeType.Script,
  'text/css': MimeType.Stylesheet,

  // Images
  'image/apng': MimeType.Image,
  'image/bmp': MimeType.Image,
  'image/gif': MimeType.Image,
  'image/x-icon': MimeType.Image,
  'image/jpeg': MimeType.Image,
  'image/png': MimeType.Image,
  'image/svg+xml': MimeType.Image,
  'image/tiff': MimeType.Image,
  'image/webp': MimeType.Image,

  // Common audio / video formats
  'audio/wave': MimeType.Media,
  'audio/wav': MimeType.Media,
  'audio/x-wav': MimeType.Media,
  'audio/x-pn-wav': MimeType.Media,
  'audio/webm': MimeType.Media,
  'video/webm': MimeType.Media,
  'video/mp4': MimeType.Media,
  'audio/ogg': MimeType.Media,
  'video/ogg': MimeType.Media,
  'application/ogg': MimeType.Media,

  // Fonts
  'font/otf': MimeType.Font,
  'font/ttf': MimeType.Font,
  'font/woff': MimeType.Font,
  'font/woff2': MimeType.Font,
  'application/x-font-opentype': MimeType.Font,
  'application/font-woff': MimeType.Font,
  'application/font-woff2': MimeType.Font,
  'application/vnd.ms-fontobject': MimeType.Font,
  'application/font-sfnt': MimeType.Font,

  // XHR
  'application/json': MimeType.XHR,
};

// Display / filter order shared by the certificates page resource filter and the
// step waterfall object list.
export const MIME_TYPE_CATEGORIES = [
  MimeType.Html,
  MimeType.Stylesheet,
  MimeType.Font,
  MimeType.Script,
  MimeType.Image,
  MimeType.Media,
  MimeType.XHR,
  MimeType.Other,
] as const;

// Indexed field that carries the queryable content type for browser network events.
export const MIME_TYPE_FIELD = 'http.response.mime_type';

// Reverse of `MimeTypesMap`: category -> the mime types that resolve to it.
// `MimeType.Other` is intentionally absent (it is the fallback, matched by
// exclusion rather than an explicit mime list).
export const MIME_TYPES_BY_CATEGORY: Record<string, string[]> = Object.entries(MimeTypesMap).reduce(
  (acc, [mime, category]) => {
    (acc[category] ||= []).push(mime);
    return acc;
  },
  {} as Record<string, string[]>
);

// Every mime type we explicitly categorize; anything else is treated as "Other".
export const KNOWN_MIME_TYPES = Object.keys(MimeTypesMap);

/**
 * Elasticsearch query matching browser network events whose response content type
 * belongs to a single resource category. "Other" is everything that has a mime
 * type but isn't one of the explicitly categorized ones.
 */
export const mimeCategoryQuery = (category: string): estypes.QueryDslQueryContainer => {
  if (category === MimeType.Other) {
    return {
      bool: {
        filter: [{ exists: { field: MIME_TYPE_FIELD } }],
        must_not: [{ terms: { [MIME_TYPE_FIELD]: KNOWN_MIME_TYPES } }],
      },
    };
  }
  return { terms: { [MIME_TYPE_FIELD]: MIME_TYPES_BY_CATEGORY[category] ?? [] } };
};

/**
 * Combines the selected resource categories into a single OR filter, for use in
 * the certificates query when the resource-type quick filter is active.
 */
export const selectedMimeCategoriesQuery = (
  categories: string[]
): estypes.QueryDslQueryContainer => ({
  bool: {
    minimum_should_match: 1,
    should: categories.map(mimeCategoryQuery),
  },
});
