/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntitySummary, buildProposalText, buildVarietySummary } from './proposal_text';

const alert = (host?: string, user?: string, exe?: string) => ({
  ...(host ? { host: { name: host } } : {}),
  ...(user ? { user: { name: user } } : {}),
  ...(exe ? { process: { executable: exe } } : {}),
});

describe('buildEntitySummary', () => {
  it('names hosts with their users', () => {
    expect(buildEntitySummary([alert('build-01', 'svc')])).toBe('on build-01 (svc)');
  });

  it('shows the first two names and a count of the rest', () => {
    const docs = ['a', 'b', 'c', 'd'].map((host) => alert(host));
    expect(buildEntitySummary(docs)).toBe('on a, b +2');
  });

  it('collapses more than five names to a count', () => {
    const docs = ['a', 'b', 'c', 'd', 'e', 'f'].map((host) => alert(host));
    expect(buildEntitySummary(docs)).toBe('on 6 hosts');
  });

  it('is empty when no alert names a host or user', () => {
    expect(buildEntitySummary([alert()])).toBe('');
  });
});

describe('buildVarietySummary', () => {
  it('counts what is inside, so a reviewer can see a mixed proposal', () => {
    const docs = [
      alert('h1', 'u1', 'C:\\Windows\\a.exe'),
      alert('h2', 'u1', '/usr/bin/b'),
      alert('h2', 'u1', '/usr/bin/b'),
    ];
    expect(buildVarietySummary(docs, 'keyed')).toBe(
      '3 alerts · 2 hosts · 1 user · 2 distinct programs'
    );
  });

  it('says a proposal groups by rule only when no alert has an identifying field', () => {
    expect(buildVarietySummary([alert('h1')], 'keyed')).toContain('group by rule only');
  });

  it('says a pooled proposal is pooled', () => {
    expect(buildVarietySummary([alert('h1', undefined, '/bin/a')], 'pooled')).toContain('pooled');
  });
});

describe('buildProposalText', () => {
  it('titles a single alert with its entity and the comment carries the summary', () => {
    const { title, comment } = buildProposalText({
      alerts: [alert('h1', undefined, '/bin/a')],
      ruleName: 'Rule A',
      confidenceFloor: 0.85,
      kind: 'keyed',
    });
    expect(title).toBe('Close alert on h1 as false positive');
    expect(comment).toContain('1 alert from rule "Rule A" was classified');
    expect(comment).toContain('1 alert · 1 host · 1 distinct program');
  });

  describe('earlier verdicts of the pattern', () => {
    const textWith = (history?: { falsePositive: number; truePositive: number }) =>
      buildProposalText({
        alerts: [alert('h1', undefined, '/bin/a')],
        ruleName: 'Rule A',
        confidenceFloor: 0.85,
        kind: 'keyed',
        history,
      }).comment;

    it('shows them when some were true positives', () => {
      expect(textWith({ falsePositive: 9, truePositive: 3 })).toContain(
        '12 earlier alerts with the same pattern in the last 30 days: 9 false positive, 3 true positive.'
      );
    });

    it('says "alert" for one', () => {
      expect(textWith({ falsePositive: 0, truePositive: 1 })).toContain('1 earlier alert with');
    });

    it('leaves them out when the pattern was only ever a false positive, or has no history', () => {
      expect(textWith({ falsePositive: 9, truePositive: 0 })).not.toContain('earlier alert');
      expect(textWith()).not.toContain('earlier alert');
    });
  });
});
