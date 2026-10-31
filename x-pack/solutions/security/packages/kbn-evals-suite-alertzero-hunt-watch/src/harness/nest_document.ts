/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Expands dotted field paths (`'content.body_text'`) into nested objects.
 *
 * Elasticsearch accepts either spelling at index time, but it returns `_source` exactly as it
 * was indexed, and the hunt's `loadReportHuntContext` reads the nested form
 * (`source.content?.body_text`, `source.extracted?.iocs`). A report indexed with flat dotted
 * keys therefore looks empty to the hunt: Tier 1 answers `no_searchable_terms` and Tier 2
 * `no_report_text`, and every cell scores zero. The corpus keeps dotted paths because they
 * are the field names the pin test checks; they are nested only at the ingest boundary.
 */
export const nestDottedKeys = (flat: Record<string, unknown>): Record<string, unknown> => {
  const nested: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const segments = path.split('.');
    let cursor = nested;
    for (const segment of segments.slice(0, -1)) {
      const next = cursor[segment];
      if (typeof next === 'object' && next !== null && !Array.isArray(next)) {
        cursor = next as Record<string, unknown>;
      } else {
        const created: Record<string, unknown> = {};
        cursor[segment] = created;
        cursor = created;
      }
    }
    cursor[segments[segments.length - 1]] = value;
  }
  return nested;
};
