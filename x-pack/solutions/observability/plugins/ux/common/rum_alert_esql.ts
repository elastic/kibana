/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';

export const RUM_ALERT_ESQL_MAX_LENGTH = 8000;
export const RUM_ALERT_PROMPT_MAX_LENGTH = 2000;

const FORBIDDEN_COMMAND = /\b(ENRICH|LOOKUP|SHOW|EXPLAIN|SET|METRICS|TSGRAPH)\b/i;

const DURATION_TO_ESQL: Record<string, string> = {
  ms: 'milliseconds',
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
};

export const RUM_ALERT_AI_SYSTEM_PROMPT = `You write Alerting v2 standalone ES|QL breach queries for Elastic RUM (EDOT Browser / OTel).

Return JSON only:
{"query":"<esql>","description":"<one line>"}

Rules:
- The query MUST return rows only when the user's condition is true (a breach). Last command is a WHERE on an aggregated metric.
- Put FROM on its own line. Never put | commands on the FROM line.
- FROM only these exact patterns (no quotes, no METADATA, no cluster prefix), comma-separated if needed: traces-*.otel-*, logs-*.otel-*, ux-rum-sessions-*
- Do not use ENRICH, LOOKUP, SHOW, SET, DATE_EXTRACT, DAY_OF_WEEK, or any other index pattern.
- Do not add a time or weekday filter; the rule executor applies lookback on @timestamp (events) or start_time (session index).
- If the user asks why / investigates a symptom (errors on Tuesday, slow checkout), write a threshold on that symptom (exception count, p75 LCP, …), not a calendar predicate.
- Backtick dotted field names.
- Prefer STATS aggregations. Integer division must use TO_DOUBLE.
- Known event fields:
  - resource.attributes.service.name
  - resource.attributes.browser.name
  - attributes.page.url.path
  - attributes.url.full
  - attributes.session.id
  - event_name (logs): browser.web_vital, exception, browser.frustration.rage_click, browser.frustration.dead_click, browser.frustration.error_click, browser.navigation
  - name (traces): documentLoad, exception
  - attributes.browser.web_vital.name (lcp|inp|cls)
  - attributes.browser.web_vital.value
  - attributes.exception.type
  - attributes.exception.message
- Known session-index fields (FROM ux-rum-sessions-*):
  - start_time, service.name, entry_page, user.key, error_count, rage_click_count, dead_click_count, page_count
- Web vitals and exceptions live on logs-*.otel-*. Page views may need traces-*.otel-* (name == "documentLoad") union logs. Session outcomes live on ux-rum-sessions-*.
- If grouping by page, STATS ... BY page = COALESCE(\`attributes.page.url.path\`, \`attributes.url.full\`) and only then.
- Example JSON query value (newlines in the string):
FROM logs-*.otel-*
| WHERE \`event_name\` == "exception"
| STATS errors = COUNT(*)
| WHERE errors >= 10`;

export const esqlLookbackLiteral = (lookback: string): string => {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(lookback);
  if (!match) {
    return '15 minutes';
  }
  return `${match[1]} ${DURATION_TO_ESQL[match[2]]}`;
};

export const stripRumAlertEsqlFence = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:esql|sql)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();

export const extractRumAlertEsqlFromLlm = (
  text: string
): { query: string; description?: string } => {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { query?: unknown; description?: unknown };
      if (typeof parsed.query === 'string' && parsed.query.trim()) {
        return {
          query: stripRumAlertEsqlFence(parsed.query),
          description:
            typeof parsed.description === 'string' ? parsed.description.trim() : undefined,
        };
      }
    } catch {
      // fall through to fence / FROM extraction
    }
  }
  const fence = trimmed.match(/```(?:esql|sql)?\s*([\s\S]*?)```/i);
  if (fence?.[1]?.trim()) {
    return { query: fence[1].trim() };
  }
  const fromIndex = trimmed.search(/^FROM\s/im);
  if (fromIndex >= 0) {
    return { query: trimmed.slice(fromIndex).trim() };
  }
  throw new Error('The model did not return an ES|QL query');
};

const fromClauseOf = (
  query: string
): { sources: string[]; fromIndex: number; remainder: string } => {
  const lines = query.split('\n');
  const fromIndex = lines.findIndex((line) => /^\s*FROM\s+/i.test(line));
  if (fromIndex < 0) {
    throw new Error(
      'ES|QL must start with FROM traces-*.otel-*, logs-*.otel-*, and/or ux-rum-sessions-*'
    );
  }
  const first = lines[fromIndex].trim();
  const match = first.match(/^FROM\s+(.+)$/i);
  if (!match) {
    throw new Error(
      'ES|QL must start with FROM traces-*.otel-*, logs-*.otel-*, and/or ux-rum-sessions-*'
    );
  }
  // Pipes after FROM are commands, not sources. DATE_EXTRACT(..., @timestamp) commas
  // must not be treated as extra FROM indexes.
  const pipeAt = match[1].indexOf('|');
  const fromArgs = (pipeAt >= 0 ? match[1].slice(0, pipeAt) : match[1])
    .replace(/\s+METADATA\b[\s\S]*$/i, '')
    .trim();
  const remainder = pipeAt >= 0 ? match[1].slice(pipeAt).trim() : '';
  const sources = fromArgs
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean);
  if (sources.length === 0) {
    throw new Error('ES|QL query is empty');
  }
  return { sources, fromIndex, remainder };
};

/** Map LLM/CCS FROM sources onto the two RUM OTel patterns. */
export const normalizeRumAlertFromSource = (raw: string): string | undefined => {
  let source = raw.trim().replace(/^["'`]+|["'`]+$/g, '');
  source = source.replace(/\s+METADATA\b[\s\S]*$/i, '').trim();
  source = source.replace(/^[^:]+:/, '');
  const lower = source.toLowerCase();
  if (lower === 'logs-*' || /^logs-.*otel/.test(lower)) {
    return 'logs-*.otel-*';
  }
  if (lower === 'traces-*' || /^traces-.*otel/.test(lower)) {
    return 'traces-*.otel-*';
  }
  if (/^ux-rum-sessions/.test(lower)) {
    return 'ux-rum-sessions-*';
  }
  return undefined;
};

export const rewriteRumAlertFrom = (query: string): string => {
  const { sources, fromIndex, remainder } = fromClauseOf(query);
  const mapped = sources.map((source) => ({
    raw: source,
    value: normalizeRumAlertFromSource(source),
  }));
  const unknown = mapped.filter((item) => !item.value).map((item) => item.raw);
  if (unknown.length > 0) {
    throw new Error(
      `ES|QL must FROM traces-*.otel-*, logs-*.otel-*, and/or ux-rum-sessions-* only (got ${unknown.join(
        ', '
      )})`
    );
  }
  const unique = [...new Set(mapped.map((item) => item.value).filter(Boolean))];
  const lines = query.split('\n');
  lines[fromIndex] = `FROM ${unique.join(', ')}`;
  if (remainder) {
    const remainderLine = remainder.startsWith('|') ? remainder : `| ${remainder}`;
    lines.splice(fromIndex + 1, 0, remainderLine);
  }
  return lines.join('\n');
};

const splitEsqlLines = (query: string): string[] =>
  query.split('\n').flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return [];
    }
    if (/^FROM\s+/i.test(trimmed) || !trimmed.includes('|')) {
      return [trimmed];
    }
    return trimmed
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => `| ${part}`);
  });

const isCalendarFilterLine = (line: string): boolean =>
  /^\|\s*EVAL\s+.+\bDATE_EXTRACT\s*\(\s*['"]DAY_OF_WEEK['"]/i.test(line) ||
  /^\|\s*WHERE\s+day_of_week\b/i.test(line);

/** Drop weekday DATE_EXTRACT filters; lookback is applied by the executor. */
export const stripRumAlertCalendarFilters = (query: string): string =>
  splitEsqlLines(query)
    .filter((line) => !isCalendarFilterLine(line))
    .join('\n');

export const assertRumAlertEsql = (raw: string): string => {
  const query = stripRumAlertCalendarFilters(rewriteRumAlertFrom(stripRumAlertEsqlFence(raw)));
  if (!query) {
    throw new Error('ES|QL query is empty');
  }
  if (query.length > RUM_ALERT_ESQL_MAX_LENGTH) {
    throw new Error(`ES|QL query exceeds ${RUM_ALERT_ESQL_MAX_LENGTH} characters`);
  }
  if (FORBIDDEN_COMMAND.test(query)) {
    throw new Error('ES|QL may not use ENRICH, LOOKUP, SHOW, EXPLAIN, or SET');
  }
  const parseError = validateEsqlQuery(query);
  if (parseError) {
    throw new Error(parseError);
  }
  return query;
};

export const rumAlertGroupingFieldsFromQuery = (query: string): string[] =>
  /\bBY\s+page\b/i.test(query) ? ['page'] : [];

/** Drop the last `| WHERE ...` so the preview chart shows the metric, not only breaches. */
export const stripFinalWhere = (query: string): string => {
  const lines = query
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, all) => line.trim().length > 0 || index < all.length - 1);
  const last = lines.at(-1)?.trim() ?? '';
  if (/^\|\s*WHERE\s+/i.test(last) && lines.length > 1) {
    return lines.slice(0, -1).join('\n');
  }
  return query;
};

export const rumAlertTimeField = (query: string): string =>
  /^\s*FROM\s+(?:[A-Za-z0-9_\-*]+:)?ux-rum-sessions/im.test(query) ? 'start_time' : '@timestamp';

const esqlQuote = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export const injectLookbackAfterFrom = (
  query: string,
  lookback: string,
  options?: { watermark?: string }
): string => {
  const literal = esqlLookbackLiteral(lookback);
  const lines = query.split('\n');
  const fromIndex = lines.findIndex((line) => /^\s*FROM\s+/i.test(line));
  if (fromIndex < 0) {
    return query;
  }
  const already = lines.some((line) => /NOW\(\)\s*-/.test(line));
  if (already) {
    return query;
  }
  const timeField = rumAlertTimeField(query);
  const clauses = [`\`${timeField}\` >= NOW() - ${literal}`];
  if (options?.watermark && timeField === 'start_time') {
    clauses.push(`\`${timeField}\` <= ${esqlQuote(options.watermark)}`);
  }
  lines.splice(fromIndex + 1, 0, `| WHERE ${clauses.join(' AND ')}`);
  return lines.join('\n');
};

export const isPlaceholderRumAlertEsql = (query: string): boolean =>
  /\|\s*WHERE\s+false\s*$/im.test(query.trim());
