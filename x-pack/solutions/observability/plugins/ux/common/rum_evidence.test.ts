/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rumAppFromBucket } from './rum_apps';
import {
  buildEvidenceFacts,
  evidenceAnalystFollowUp,
  evidenceAnalystPrompt,
  evidenceSummaryPrompt,
  parseEvidenceSummary,
  topErrorGroups,
  visibleEvidenceSummary,
  worstPagesByLcp,
} from './rum_evidence';
import type { RumErrorGroup, RumPageRow } from './rum_app';

const shop = rumAppFromBucket({
  name: 'shop',
  sessions: 20,
  pageViews: 40,
  errorSessions: 2,
  p75Lcp: 2000,
  platformKeys: ['web'],
});

describe('buildEvidenceFacts', () => {
  it('leads with firing, then score and opportunity', () => {
    const facts = buildEvidenceFacts({ ...shop, score: 76, scoreDelta: -8, opportunity: 12 }, true);
    expect(facts.map((fact) => fact.id)).toEqual(['firing', 'score', 'opportunity']);
    expect(facts[1].description).toContain('76');
    expect(facts[1].description).toContain('-8');
  });

  it('omits a zero score delta', () => {
    const facts = buildEvidenceFacts({ ...shop, score: 76, scoreDelta: 0, opportunity: 14 }, false);
    expect(facts[0].description).toBe('76 of 100');
  });
});

describe('worstPagesByLcp', () => {
  it('orders by p75 LCP and drops pages without LCP', () => {
    const pages = [
      { path: '/a', views: 10, p75Lcp: 1000 },
      { path: '/b', views: 10, p75Lcp: null },
      { path: '/c', views: 10, p75Lcp: 4000 },
    ] as RumPageRow[];
    expect(worstPagesByLcp(pages).map((page) => page.path)).toEqual(['/c', '/a']);
  });
});

describe('topErrorGroups', () => {
  it('orders by session count', () => {
    const groups = [
      { type: 'A', sessionCount: 2 },
      { type: 'B', sessionCount: 9 },
    ] as RumErrorGroup[];
    expect(topErrorGroups(groups).map((group) => group.type)).toEqual(['B', 'A']);
  });
});

describe('evidenceAnalystPrompt', () => {
  it('names the app and includes session IDs from the pack', () => {
    const prompt = evidenceAnalystPrompt({
      app: { ...shop, score: 76, opportunity: 12 },
      rangeFrom: 'now-24h',
      rangeTo: 'now',
      facts: buildEvidenceFacts({ ...shop, score: 76, opportunity: 12 }, false),
      pages: [],
      errors: [],
      sessions: [{ sessionId: 's-1' } as never],
    });
    expect(prompt).toContain('shop');
    expect(prompt).toContain('s-1');
    expect(prompt).toContain('Do not invent');
  });
});

describe('evidenceSummaryPrompt', () => {
  it('asks for a fileIssue trailer and includes the pack', () => {
    const prompt = evidenceSummaryPrompt({
      app: { ...shop, score: 40, opportunity: 20 },
      rangeFrom: 'now-24h',
      rangeTo: 'now',
      facts: buildEvidenceFacts({ ...shop, score: 40, opportunity: 20 }, false),
      pages: [],
      errors: [{ type: 'TypeError', message: 'boom', sessionCount: 3 } as never],
      sessions: [{ sessionId: 's-1' } as never],
    });
    expect(prompt).toContain('```evidence');
    expect(prompt).toContain('fileIssue');
    expect(prompt).toContain('TypeError');
  });
});

describe('parseEvidenceSummary', () => {
  it('reads fileIssue and strips the fence from markdown', () => {
    const parsed = parseEvidenceSummary(
      'Checkout is throwing.\n\n```evidence\n{"fileIssue": true, "issueTitle": "TypeError on checkout"}\n```\n'
    );
    expect(parsed.markdown).toBe('Checkout is throwing.');
    expect(parsed.fileIssue).toBe(true);
    expect(parsed.issueTitle).toBe('TypeError on checkout');
  });

  it('defaults to not filing when the fence is missing or invalid', () => {
    expect(parseEvidenceSummary('Looks healthy.').fileIssue).toBe(false);
    expect(parseEvidenceSummary('x\n```evidence\nnot-json\n```').fileIssue).toBe(false);
    expect(
      parseEvidenceSummary('Looks healthy.\n\n```evidence\n{"fileIssue": false}\n```').fileIssue
    ).toBe(false);
  });
});

describe('visibleEvidenceSummary', () => {
  it('hides a partial trailer while streaming', () => {
    expect(visibleEvidenceSummary('Brief\n\n```evidence\n{"fileIss')).toBe('Brief');
  });
});

describe('evidenceAnalystFollowUp', () => {
  it('includes the on-screen summary', () => {
    const followUp = evidenceAnalystFollowUp(
      {
        app: shop,
        rangeFrom: 'now-24h',
        rangeTo: 'now',
        facts: [],
        pages: [],
        errors: [],
        sessions: [],
      },
      'Checkout is throwing.'
    );
    expect(followUp).toContain('Checkout is throwing.');
    expect(followUp).toContain('Continue from that summary');
  });
});
