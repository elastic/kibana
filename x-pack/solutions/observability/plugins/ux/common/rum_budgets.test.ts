/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  budgetAppliesToPage,
  buildRumBudgetSlo,
  kqlQuote,
  parseRumBudgetTemplate,
  parseRumBudgetThreshold,
  rumBudgetBreachKuery,
  rumBudgetInvestigatePatch,
  rumBudgetPageFromFilter,
  rumBudgetTags,
  toRumBudgetItem,
} from './rum_budgets';

describe('kqlQuote', () => {
  it('escapes quotes and backslashes', () => {
    expect(kqlQuote('a"b\\c')).toBe('"a\\"b\\\\c"');
  });
});

describe('buildRumBudgetSlo', () => {
  it('builds an app-wide LCP occurrences SLO with Google-good defaults', () => {
    const built = buildRumBudgetSlo({
      templateId: 'lcp',
      threshold: 2500,
      target: 0.95,
      scope: 'app',
      filters: { serviceName: 'shop' },
    });
    expect(built.slo.indicator.type).toBe('sli.kql.custom');
    expect(built.slo.indicator.params.index).toBe('logs-*.otel-*');
    expect(built.slo.indicator.params.filter).toContain('event_name: "browser.web_vital"');
    expect(built.slo.indicator.params.filter).toContain('attributes.browser.web_vital.name: "lcp"');
    expect(built.slo.indicator.params.filter).toContain('resource.attributes.service.name: "shop"');
    expect(built.slo.indicator.params.good).toBe('attributes.browser.web_vital.value <= 2500');
    expect(built.slo.budgetingMethod).toBe('occurrences');
    expect(built.slo.objective.target).toBe(0.95);
    expect(built.slo.timeWindow).toEqual({ duration: '30d', type: 'rolling' });
    expect(built.slo.tags).toEqual(['ux-rum-budget', 'ux-rum-budget:lcp']);
    expect(built.slo.groupBy).toBeUndefined();
    expect(built.slo.name).toContain('shop');
  });

  it('scopes a page budget to the current path', () => {
    const built = buildRumBudgetSlo({
      templateId: 'inp',
      threshold: 200,
      target: 0.99,
      scope: 'page',
      filters: { pageUrl: '/checkout' },
    });
    expect(built.slo.indicator.params.filter).toContain('attributes.page.url.path: "/checkout"');
    expect(built.slo.objective.target).toBe(0.99);
    expect(built.slo.groupBy).toBeUndefined();
  });

  it('adds a path groupBy for per-page budgets', () => {
    const built = buildRumBudgetSlo({
      templateId: 'cls',
      threshold: 0.1,
      target: 0.95,
      scope: 'groupByPage',
      filters: { serviceName: 'shop' },
    });
    expect(built.slo.groupBy).toEqual(['attributes.page.url.path']);
    expect(built.slo.indicator.params.filter).not.toContain('attributes.page.url.path: "');
  });

  it('builds an error-rate budget over exceptions and page loads', () => {
    const built = buildRumBudgetSlo({
      templateId: 'error_rate',
      threshold: 0,
      target: 0.95,
      scope: 'app',
      filters: {},
    });
    expect(built.slo.indicator.params.filter).toContain('event_name: "exception"');
    expect(built.slo.indicator.params.filter).toContain('name: "documentLoad"');
    expect(built.slo.indicator.params.good).toBe('not event_name: "exception"');
    expect(built.slo.indicator.params.index).toBe('traces-*.otel-*,logs-*.otel-*');
  });

  it('builds an FCP vital budget', () => {
    const built = buildRumBudgetSlo({
      templateId: 'fcp',
      threshold: 1800,
      target: 0.95,
      scope: 'app',
      filters: {},
    });
    expect(built.slo.indicator.params.filter).toContain('attributes.browser.web_vital.name: "fcp"');
    expect(built.slo.indicator.params.good).toBe('attributes.browser.web_vital.value <= 1800');
  });

  it('builds a page-load budget on documentLoad duration', () => {
    const built = buildRumBudgetSlo({
      templateId: 'page_load',
      threshold: 3000,
      target: 0.95,
      scope: 'app',
      filters: {},
    });
    expect(built.slo.indicator.params.index).toBe('traces-*.otel-*');
    expect(built.slo.indicator.params.filter).toContain('name: "documentLoad"');
    expect(built.slo.indicator.params.good).toContain(
      'attributes.transaction.duration.us <= 3000000'
    );
    expect(built.slo.indicator.params.good).toContain('duration <= 3000000000');
  });

  it('builds a frustration budget over clicks and page views', () => {
    const built = buildRumBudgetSlo({
      templateId: 'frustration',
      threshold: 0,
      target: 0.95,
      scope: 'app',
      filters: {},
    });
    expect(built.slo.indicator.params.filter).toContain('browser.frustration.rage_click');
    expect(built.slo.indicator.params.good).toContain('not event_name:');
    expect(built.slo.indicator.params.good).toContain('browser.frustration.dead_click');
  });

  it('builds session-outcome budgets on the session index', () => {
    const errorFree = buildRumBudgetSlo({
      templateId: 'session_error_free',
      threshold: 0,
      target: 0.95,
      scope: 'app',
      filters: { serviceName: 'shop' },
    });
    expect(errorFree.slo.indicator.params.index).toBe('ux-rum-sessions-*');
    expect(errorFree.slo.indicator.params.timestampField).toBe('start_time');
    expect(errorFree.slo.indicator.params.filter).toContain('service.name: "shop"');
    expect(errorFree.slo.indicator.params.good).toBe('error_count: 0');
    expect(errorFree.slo.groupBy).toBeUndefined();

    const rageFree = buildRumBudgetSlo({
      templateId: 'session_rage_free',
      threshold: 0,
      target: 0.95,
      scope: 'page',
      filters: { pageUrl: '/checkout' },
    });
    expect(rageFree.slo.indicator.params.good).toBe('rage_click_count: 0 and dead_click_count: 0');
    expect(rageFree.slo.indicator.params.filter).toContain('entry_page: "/checkout"');

    const bounce = buildRumBudgetSlo({
      templateId: 'session_bounce',
      threshold: 0,
      target: 0.95,
      scope: 'groupByPage',
      filters: {},
    });
    expect(bounce.slo.indicator.params.good).toBe('page_count > 1');
    expect(bounce.slo.groupBy).toBeUndefined();
  });

  it('uses generated KQL for an AI budget', () => {
    const built = buildRumBudgetSlo({
      templateId: 'ai',
      threshold: 0,
      target: 0.95,
      scope: 'app',
      filters: { serviceName: 'shop' },
      prompt: 'Checkout loads under 2s',
      filter: 'name: "documentLoad"',
      good: 'attributes.transaction.duration.us <= 2000000',
      index: 'traces-*.otel-*',
    });
    expect(built.slo.indicator.params.index).toBe('traces-*.otel-*');
    expect(built.slo.indicator.params.filter).toContain('name: "documentLoad"');
    expect(built.slo.indicator.params.filter).toContain('resource.attributes.service.name: "shop"');
    expect(built.slo.indicator.params.good).toBe('attributes.transaction.duration.us <= 2000000');
    expect(built.slo.name).toContain('Checkout loads under 2s');
  });
});

describe('parsers', () => {
  it('reads the template tag', () => {
    expect(parseRumBudgetTemplate(rumBudgetTags('ttfb'))).toBe('ttfb');
    expect(parseRumBudgetTemplate(['other'])).toBeNull();
  });

  it('parses the good-event threshold', () => {
    expect(parseRumBudgetThreshold('attributes.browser.web_vital.value <= 2500')).toBe(2500);
    expect(parseRumBudgetThreshold('attributes.browser.web_vital.value <= 0.1')).toBe(0.1);
    expect(parseRumBudgetThreshold('not event_name: "exception"')).toBeNull();
    expect(parseRumBudgetThreshold('duration <= 3000000000', 'page_load')).toBe(3000);
  });

  it('extracts a page path from the SLO filter', () => {
    expect(
      rumBudgetPageFromFilter(
        'event_name: "browser.web_vital" and attributes.page.url.path: "/checkout"'
      )
    ).toBe('/checkout');
    expect(rumBudgetPageFromFilter('session.id: * and entry_page: "/checkout"')).toBe('/checkout');
  });
});

describe('toRumBudgetItem', () => {
  it('maps an SLO summary onto a budget row', () => {
    const item = toRumBudgetItem({
      id: 'slo-1',
      instanceId: '*',
      name: 'LCP budget — shop',
      description: 'desc',
      tags: rumBudgetTags('lcp'),
      indicator: {
        type: 'sli.kql.custom',
        params: {
          filter: 'event_name: "browser.web_vital" and attributes.browser.web_vital.name: "lcp"',
          good: 'attributes.browser.web_vital.value <= 2500',
        },
      },
      objective: { target: 0.95 },
      timeWindow: { duration: '30d' },
      summary: {
        status: 'DEGRADING',
        sliValue: 0.92,
        errorBudget: { remaining: 0.4, consumed: 0.6 },
        fiveMinuteBurnRate: 2,
        oneHourBurnRate: 1.1,
        oneDayBurnRate: 0.8,
      },
    });
    expect(item.templateId).toBe('lcp');
    expect(item.status).toBe('DEGRADING');
    expect(item.threshold).toBe(2500);
    expect(item.errorBudgetRemaining).toBe(0.4);
  });
});

describe('investigation helpers', () => {
  it('builds a breach kuery for a vital budget', () => {
    expect(rumBudgetBreachKuery({ templateId: 'lcp', threshold: 2500 })).toBe(
      'event_name: "browser.web_vital" and attributes.browser.web_vital.name: "lcp" and attributes.browser.web_vital.value > 2500'
    );
  });

  it('builds a breach kuery for page load and frustration', () => {
    expect(rumBudgetBreachKuery({ templateId: 'page_load', threshold: 3000 })).toContain(
      'name: "documentLoad"'
    );
    expect(rumBudgetBreachKuery({ templateId: 'frustration', threshold: 0 })).toContain(
      'browser.frustration.rage_click'
    );
  });

  it('routes session-outcome budgets to session list filters', () => {
    expect(rumBudgetInvestigatePatch({ templateId: 'session_error_free' })).toEqual({
      pageUrl: '',
      frustration: 'error',
      kuery: '',
    });
    expect(
      rumBudgetInvestigatePatch({ templateId: 'session_rage_free', pagePath: '/checkout' })
    ).toEqual({
      pageUrl: '/checkout',
      frustration: 'rage',
      kuery: '',
    });
    expect(rumBudgetInvestigatePatch({ templateId: 'lcp', threshold: 2500 }).kuery).toContain(
      'browser.web_vital'
    );
  });

  it('hides app-wide budgets on a page row when asked', () => {
    const appWide = { pagePath: undefined } as ReturnType<typeof toRumBudgetItem>;
    expect(budgetAppliesToPage(appWide, '/checkout')).toBe(true);
    expect(budgetAppliesToPage(appWide, '/checkout', { includeAppWide: false })).toBe(false);
    expect(
      budgetAppliesToPage(
        { pagePath: '/checkout' } as ReturnType<typeof toRumBudgetItem>,
        '/checkout'
      )
    ).toBe(true);
  });
});
