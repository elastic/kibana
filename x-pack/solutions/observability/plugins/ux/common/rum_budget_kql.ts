/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RUM_BUDGET_KQL_MAX_LENGTH = 4096;
export const RUM_BUDGET_PROMPT_MAX_LENGTH = 2000;
export const RUM_BUDGET_AI_PLACEHOLDER_GOOD = 'false';

export const RUM_BUDGET_AI_SYSTEM_PROMPT = `You write Custom KQL SLO indicators for Elastic RUM (EDOT Browser / OTel).

Return JSON only:
{"filter":"<kql>","good":"<kql>","index":"logs-*.otel-*","description":"<one line>"}

Rules:
- This is an occurrences SLO: filter selects the population, good selects successful events in that population.
- KQL only. No ES|QL, no FROM, no pipes, no aggregations, no scripts.
- index must be logs-*.otel-*, traces-*.otel-*, and/or ux-rum-sessions-* (comma-separated). No other patterns.
- Known event fields:
  - resource.attributes.service.name
  - resource.attributes.browser.name
  - attributes.page.url.path
  - attributes.url.full
  - event_name (logs): browser.web_vital, exception, browser.frustration.rage_click, browser.frustration.dead_click, browser.frustration.error_click, browser.navigation
  - name (traces): documentLoad, longtask, exception
  - attributes.browser.web_vital.name (lcp|inp|cls|fcp|ttfb)
  - attributes.browser.web_vital.value (LCP/INP/FCP/TTFB in ms, CLS unitless)
  - attributes.exception.type
  - attributes.exception.message
  - attributes.transaction.duration.us (page-load duration, microseconds)
  - duration (OTel span duration, nanoseconds)
  - attributes.longtask.duration (ms)
- Known session-index fields (ux-rum-sessions-*, timestamp start_time):
  - service.name, entry_page, user.key, error_count, rage_click_count, dead_click_count, page_count, duration_ms
- Web vitals live on logs-*.otel-*. Page loads live on traces-*.otel-* (name: "documentLoad"). Session outcomes live on ux-rum-sessions-*.
- Do not invent fields. Quote string values.
- Examples:
  - LCP: filter event_name: "browser.web_vital" and attributes.browser.web_vital.name: "lcp"; good attributes.browser.web_vital.value <= 2500; index logs-*.otel-*
  - Page load: filter name: "documentLoad"; good attributes.transaction.duration.us <= 3000000; index traces-*.otel-*
  - JS errors: filter (event_name: "exception" or name: "documentLoad"); good not event_name: "exception"; index logs-*.otel-*,traces-*.otel-*
  - Error-free sessions: filter session.id: *; good error_count: 0; index ux-rum-sessions-*`;

export const isPlaceholderRumBudgetKql = (filter: string, good: string): boolean =>
  !filter.trim() || !good.trim() || good.trim() === RUM_BUDGET_AI_PLACEHOLDER_GOOD;

export const normalizeRumBudgetIndex = (raw: string): string => {
  const sources = raw
    .split(',')
    .map((source) => {
      let value = source.trim().replace(/^["'`]+|["'`]+$/g, '');
      value = value.replace(/^[^:]+:/, '');
      const lower = value.toLowerCase();
      if (lower === 'logs-*' || /^logs-.*otel/.test(lower)) {
        return 'logs-*.otel-*' as const;
      }
      if (lower === 'traces-*' || /^traces-.*otel/.test(lower)) {
        return 'traces-*.otel-*' as const;
      }
      if (/^ux-rum-sessions/.test(lower)) {
        return 'ux-rum-sessions-*' as const;
      }
      return undefined;
    })
    .filter(
      (source): source is 'logs-*.otel-*' | 'traces-*.otel-*' | 'ux-rum-sessions-*' =>
        source != null
    );
  const unique = [...new Set(sources)];
  if (unique.length === 0) {
    throw new Error('Index must be logs-*.otel-*, traces-*.otel-*, and/or ux-rum-sessions-*');
  }
  return unique.join(',');
};

export const assertRumBudgetKql = (kql: string, field: 'filter' | 'good'): string => {
  const trimmed = kql.trim();
  if (!trimmed) {
    throw new Error(`${field} KQL is empty`);
  }
  if (trimmed.length > RUM_BUDGET_KQL_MAX_LENGTH) {
    throw new Error(`${field} KQL exceeds ${RUM_BUDGET_KQL_MAX_LENGTH} characters`);
  }
  if (/\bFROM\b/i.test(trimmed) || trimmed.includes('|')) {
    throw new Error(`${field} must be KQL, not ES|QL`);
  }
  if (/\b(ENRICH|LOOKUP JOIN)\b/i.test(trimmed)) {
    throw new Error(`${field} KQL must not use ENRICH or LOOKUP`);
  }
  return trimmed;
};

export const extractRumBudgetKqlFromLlm = (
  text: string
): { filter: string; good: string; index: string; description?: string } => {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('The model did not return a KQL SLO');
  }
  let parsed: { filter?: unknown; good?: unknown; index?: unknown; description?: unknown };
  try {
    parsed = JSON.parse(jsonMatch[0]) as {
      filter?: unknown;
      good?: unknown;
      index?: unknown;
      description?: unknown;
    };
  } catch {
    throw new Error('The model did not return a KQL SLO');
  }
  if (typeof parsed.filter !== 'string' || typeof parsed.good !== 'string') {
    throw new Error('The model did not return filter and good KQL');
  }
  const index =
    typeof parsed.index === 'string' && parsed.index.trim()
      ? normalizeRumBudgetIndex(parsed.index)
      : 'logs-*.otel-*';
  return {
    filter: assertRumBudgetKql(parsed.filter, 'filter'),
    good: assertRumBudgetKql(parsed.good, 'good'),
    index,
    description: typeof parsed.description === 'string' ? parsed.description.trim() : undefined,
  };
};
