/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEntitySummary,
  buildProposalText,
  buildVarietySummary,
  PROPOSAL_TEXT_FIELDS,
} from './proposal_text';
import { buildPatternKeys } from './pattern_key';
import { PARITY_ALERTS } from './pattern_key_parity_fixture';

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

// A revise loads only PROPOSAL_TEXT_FIELDS of each alert. A field that the keys or the text read but
// the list misses would change them silently, so the trimmed alerts must give the same result.
describe('PROPOSAL_TEXT_FIELDS', () => {
  type Doc = Record<string, unknown>;
  const pick = (doc: Doc, path: string): Doc => {
    if (path in doc) return { [path]: doc[path] };
    const [head, ...rest] = path.split('.');
    const child = doc[head];
    if (rest.length === 0 || typeof child !== 'object' || child === null) {
      return rest.length === 0 && head in doc ? { [head]: child } : {};
    }
    const picked = pick(child as Doc, rest.join('.'));
    return Object.keys(picked).length > 0 ? { [head]: picked } : {};
  };
  const merge = (target: Doc, source: Doc): Doc => {
    Object.entries(source).forEach(([key, value]) => {
      const current = target[key];
      target[key] =
        typeof value === 'object' && value !== null && !Array.isArray(value) && current
          ? merge(current as Doc, value as Doc)
          : value;
    });
    return target;
  };
  const trim = (doc: Doc): Doc =>
    PROPOSAL_TEXT_FIELDS.reduce<Doc>((acc, path) => merge(acc, pick(doc, path)), {});

  it('gives the same keys and proposal text as the full alerts', () => {
    const docs = PARITY_ALERTS.map(({ doc }) => ({ ...doc, 'process.args': ['x'], noise: 'y' }));
    const trimmed = docs.map(trim);
    expect(trimmed.map(buildPatternKeys)).toEqual(docs.map(buildPatternKeys));
    const text = (alerts: Doc[]) =>
      buildProposalText({ alerts, ruleName: 'R', confidenceFloor: 0.8, kind: 'keyed' });
    expect(text(trimmed)).toEqual(text(docs));
  });
});
