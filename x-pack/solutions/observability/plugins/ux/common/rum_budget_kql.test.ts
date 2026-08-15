/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertRumBudgetKql,
  extractRumBudgetKqlFromLlm,
  isPlaceholderRumBudgetKql,
  normalizeRumBudgetIndex,
} from './rum_budget_kql';

describe('assertRumBudgetKql', () => {
  it('accepts a vital filter', () => {
    expect(
      assertRumBudgetKql(
        'event_name: "browser.web_vital" and attributes.browser.web_vital.name: "lcp"',
        'filter'
      )
    ).toContain('browser.web_vital');
  });

  it('rejects ES|QL', () => {
    expect(() => assertRumBudgetKql('FROM logs-*.otel-*\n| WHERE true', 'filter')).toThrow(/KQL/);
  });
});

describe('normalizeRumBudgetIndex', () => {
  it('rewrites logs-* and CCS prefixes', () => {
    expect(normalizeRumBudgetIndex('logs-*')).toBe('logs-*.otel-*');
    expect(normalizeRumBudgetIndex('*:traces-*.otel-*')).toBe('traces-*.otel-*');
  });

  it('rejects other patterns', () => {
    expect(() => normalizeRumBudgetIndex('.kibana-*')).toThrow(/ux-rum-sessions-\*/);
  });

  it('accepts the session index', () => {
    expect(normalizeRumBudgetIndex('ux-rum-sessions-2')).toBe('ux-rum-sessions-*');
    expect(normalizeRumBudgetIndex('*:ux-rum-sessions-*')).toBe('ux-rum-sessions-*');
  });
});

describe('extractRumBudgetKqlFromLlm', () => {
  it('reads JSON', () => {
    const extracted = extractRumBudgetKqlFromLlm(
      'Here\n{"filter":"name: \\"documentLoad\\"","good":"duration <= 3000000000","index":"traces-*","description":"load"}'
    );
    expect(extracted.filter).toContain('documentLoad');
    expect(extracted.good).toContain('duration');
    expect(extracted.index).toBe('traces-*.otel-*');
    expect(extracted.description).toBe('load');
  });

  it('rejects missing filter/good', () => {
    expect(() => extractRumBudgetKqlFromLlm('{"index":"logs-*.otel-*"}')).toThrow(
      /filter and good/
    );
  });
});

describe('isPlaceholderRumBudgetKql', () => {
  it('treats empty or false good as a placeholder', () => {
    expect(isPlaceholderRumBudgetKql('', 'false')).toBe(true);
    expect(isPlaceholderRumBudgetKql('name: "documentLoad"', 'duration <= 1')).toBe(false);
  });
});
