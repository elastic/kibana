/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emptyErrorImpact, emptyPageImpact, emptyVitalAttribution } from './rum_app';
import type {
  RumClientsReport,
  RumErrorsReport,
  RumPagesReport,
  RumScorecardReport,
} from './rum_report';
import {
  defaultReportInstructions,
  describeRumScope,
  investigationPrompt,
  reportAnalystFollowUp,
  reportToPromptContext,
} from './rum_llm';

const meta = {
  title: 'Weekly UX scorecard',
  serviceName: 'shop',
  rangeFrom: '2026-08-03T00:00:00.000Z',
  rangeTo: '2026-08-10T00:00:00.000Z',
  compareFrom: '2026-07-27T00:00:00.000Z',
  compareTo: '2026-08-03T00:00:00.000Z',
  generatedAt: '2026-08-14T00:00:00.000Z',
  noPreviousPeriod: false,
};

const page = {
  path: '/checkout',
  views: 4,
  errorCount: 1,
  p75Lcp: 5100,
  p75Inp: 300,
  p75Cls: 0.1,
  avgDurationMs: null,
  ...emptyPageImpact(),
  attribution: emptyVitalAttribution(),
  resources: [],
  viewsDelta: { current: 4, previous: null, abs: null, pct: null },
  p75LcpDelta: { current: 5100, previous: null, abs: null, pct: null },
};

const scorecard: RumScorecardReport = {
  ...meta,
  templateId: 'scorecard',
  kpis: {
    sessions: { current: 10, previous: 8, abs: 2, pct: 0.25 },
    pageViews: { current: 20, previous: 20, abs: 0, pct: 0 },
    errorRate: { current: 0.1, previous: 0.2, abs: -0.1, pct: -0.5 },
    bounceRate: { current: 0.4, previous: 0.5, abs: -0.1, pct: -0.2 },
    p75LoadMs: { current: 1200, previous: 1000, abs: 200, pct: 0.2 },
    p75Inp: { current: 180, previous: 200, abs: -20, pct: -0.1 },
  },
  vitals: {
    lcp: { p75: 5000, ranks: { good: 10, ni: 20, poor: 70 }, samples: 10 },
    inp: { p75: null, ranks: null, samples: 0 },
    cls: { p75: null, ranks: null, samples: 0 },
    fcp: { p75: null, ranks: null, samples: 0 },
  },
  vitalsPrevious: null,
  trends: [],
  frustration: {
    rageSessions: 1,
    errorSessions: 2,
    deadClickSessions: 0,
    rageClicks: 1,
    deadClicks: 0,
    errorClicks: 0,
  },
  frustrationPrevious: null,
  topPages: [page],
  errorGroups: [
    {
      key: 'TypeError|x',
      type: 'TypeError',
      message: 'x is not defined',
      count: 3,
      sessionCount: 2,
      userCount: 1,
      sampleStack: null,
      groupingKey: null,
      trend: [],
      ...emptyErrorImpact(),
      samplePage: null,
      sampleAction: null,
      sampleTraceId: null,
      countDelta: { current: 3, previous: null, abs: null, pct: null },
    },
  ],
  sampleSessions: [],
  browsers: [],
  os: [],
  countries: [
    {
      isoCode: 'DE',
      name: 'Germany',
      pageViews: 21,
      sessions: 6,
      errorCount: 1,
      p75Lcp: 43,
      pageViewsDelta: { current: 21, previous: 10, abs: 11, pct: 1.1 },
      sessionsDelta: { current: 6, previous: 4, abs: 2, pct: 0.5 },
      errorCountDelta: { current: 1, previous: 0, abs: 1, pct: null },
    },
  ],
};

describe('reportToPromptContext', () => {
  it('keeps scorecard numbers and countries and omits emails', () => {
    const md = reportToPromptContext(scorecard);
    expect(md).toContain('10');
    expect(md).toContain('/checkout');
    expect(md).toContain('TypeError');
    expect(md).toContain('Germany');
    expect(md).not.toContain('@');
    expect(md.length).toBeLessThan(8000);
  });

  it('serializes pages with LCP', () => {
    const report: RumPagesReport = {
      ...meta,
      templateId: 'pages',
      title: 'Page performance',
      kpis: {
        pageViews: { current: 20, previous: 10, abs: 10, pct: 1 },
        distinctPaths: { current: 3, previous: 2, abs: 1, pct: 0.5 },
        poorLcpPct: { current: 0.5, previous: 0.2, abs: 0.3, pct: 1.5 },
      },
      mostViewed: [page],
      slowest: [page],
      sampleSessions: [],
      worstPath: '/checkout',
    };
    const md = reportToPromptContext(report);
    expect(md).toContain('/checkout');
    expect(md).toContain('5.10s');
    expect(md).toContain('+100%');
  });

  it('serializes error groups', () => {
    const report: RumErrorsReport = {
      ...meta,
      templateId: 'errors',
      title: 'Error impact',
      kpis: {
        errorSessions: { current: 4, previous: 2, abs: 2, pct: 1 },
        errorRate: { current: 0.2, previous: 0.1, abs: 0.1, pct: 1 },
        distinctGroups: { current: 1, previous: 1, abs: 0, pct: 0 },
        identifiedUsers: { current: 1, previous: 0, abs: 1, pct: null },
      },
      groups: scorecard.errorGroups,
      sampleSessions: [],
      topGroupKey: 'TypeError|x',
    };
    expect(reportToPromptContext(report)).toContain('x is not defined');
  });

  it('serializes client mix', () => {
    const report: RumClientsReport = {
      ...meta,
      templateId: 'clients',
      title: 'Browser / OS / device mix',
      browsers: [{ key: 'Chrome', count: 8 }],
      os: [{ key: 'macOS', count: 5 }],
      countries: [
        { isoCode: 'DE', name: 'Germany', pageViews: 21, sessions: 6, errorCount: 1, p75Lcp: 43 },
      ],
      nested: [{ browser: 'Chrome', os: 'macOS', sessions: 5, errorSessions: 1 }],
      mobileSessions: 2,
      desktopSessions: 8,
      sampleSessions: [],
    };
    const md = reportToPromptContext(report);
    expect(md).toContain('Chrome');
    expect(md).toContain('Germany');
  });
});

describe('investigationPrompt', () => {
  it('embeds the current scope', () => {
    const prompt = investigationPrompt('slow_users', {
      rangeFrom: 'now-24h',
      rangeTo: 'now',
      serviceName: 'shop',
      location: 'DE',
    });
    expect(prompt).toContain('shop');
    expect(prompt).toContain('DE');
    expect(prompt).toContain('find_sessions');
  });
});

describe('reportAnalystFollowUp', () => {
  it('embeds the narrative and asks the agent to investigate next steps', () => {
    const prompt = reportAnalystFollowUp(scorecard, '## Findings\n- errors up');
    expect(prompt).toContain('shop');
    expect(prompt).toContain('## Findings');
    expect(prompt).toContain('recommended next steps');
  });

  it('falls back to a tool-based investigation when there is no narrative', () => {
    const prompt = reportAnalystFollowUp(scorecard);
    expect(prompt).toContain('Investigate this Weekly UX scorecard');
    expect(prompt).not.toContain('Narrative:');
  });
});

describe('defaultReportInstructions / describeRumScope', () => {
  it('returns a non-empty instruction per template', () => {
    expect(defaultReportInstructions('scorecard').length).toBeGreaterThan(20);
    expect(defaultReportInstructions('users').length).toBeGreaterThan(20);
  });

  it('omits empty optional filters', () => {
    expect(describeRumScope({ rangeFrom: 'now-1h', rangeTo: 'now' })).toContain('Service: all');
    expect(describeRumScope({ rangeFrom: 'now-1h', rangeTo: 'now' })).not.toContain('KQL');
  });
});
