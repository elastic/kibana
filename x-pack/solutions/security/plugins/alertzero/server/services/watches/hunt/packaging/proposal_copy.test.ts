/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_HANDOFF_CONTEXT_LENGTH,
  buildHandoffComment,
  buildHandoffContext,
  buildHandoffTitle,
  buildRecommendationComment,
} from './proposal_copy';
import type { CurrentRunHost, CurrentRunState } from './types';

const host: CurrentRunHost = { name: 'WIN-ANALYST01' };
const reportId = 'rpt-1';

const baseState = (overrides: Partial<CurrentRunState> = {}): CurrentRunState => ({
  runId: 'run-1',
  reportId,
  hasConfirmedHit: true,
  titles: ['Hunt: PowerShell (T1059.001) [ti-repor]'],
  evidenceLines: [],
  techniques: ['T1059.001'],
  corroboratedTechniques: ['T1059.001'],
  hosts: [host],
  hasNonHostEntity: false,
  hasIocIndicator: false,
  manualRemediation: [],
  evidence: { tier1HitCount: 4, tier2Confirmed: [] },
  huntWindow: { from: '2026-09-25T00:00:00.000Z', to: '2026-10-25T00:00:00.000Z' },
  ...overrides,
});

describe('buildHandoffTitle', () => {
  it('names the host, verb first', () => {
    expect(buildHandoffTitle({ host })).toBe('Run a deep forensics investigation on WIN-ANALYST01');
  });

  it('caps the title at 256 characters', () => {
    const title = buildHandoffTitle({ host: { name: 'h'.repeat(300) } });

    expect(title).toHaveLength(256);
  });
});

describe('buildHandoffComment', () => {
  it('builds the Action / Why / Approve-Dismiss body for a host', () => {
    const comment = buildHandoffComment({ host, state: baseState(), reportId });

    expect(comment).toContain(
      '**Action:** Hand **WIN-ANALYST01** to Forensics Watch for a deep forensics investigation.'
    );
    expect(comment).toContain('**Why**');
    expect(comment).toContain(
      '- Hunt Watch confirmed *Hunt: PowerShell (T1059.001) [ti-repor]* on WIN-ANALYST01.'
    );
    expect(comment).toContain('- Tier 1 matched 4 events; Techniques: T1059.001.');
    expect(comment).toContain('- Threat report `rpt-1` is the source');
    expect(comment).toContain('**Approve** to **run a deep forensics investigation**');
    expect(comment).toContain('stays open for the forensic report');
    expect(comment).toContain('**Dismiss**');
  });

  // The Proposal must not promise a response the handoff does not run: nothing touches the
  // host until Forensics Watch proposes something and an analyst approves it.
  it('never names a Defend response action as the thing being approved', () => {
    const comment = buildHandoffComment({ host, state: baseState(), reportId });

    expect(comment).not.toMatch(/isolat|kill|suspend/i);
    expect(comment).toContain('Nothing runs on the host until an analyst approves');
  });

  it('includes exactly one Tier 1 line even when three SSEs carried the same evidence', () => {
    const comment = buildHandoffComment({
      host,
      state: baseState({
        titles: ['A', 'B', 'C'],
        evidenceLines: ['Tier 1 matched 4 events', 'Tier 1 matched 4 events'],
      }),
      reportId,
    });

    expect(comment.split('\n').filter((line) => line.includes('Tier 1 matched'))).toHaveLength(1);
  });

  it('summarizes confirmed Tier 2 techniques when present', () => {
    const comment = buildHandoffComment({
      host,
      state: baseState({
        evidence: {
          tier1HitCount: 4,
          tier2Confirmed: [{ techniqueId: 'T1059.001', techniqueName: 'PowerShell', rowCount: 3 }],
        },
      }),
      reportId,
    });

    expect(comment).toContain('Tier 2 confirmed T1059.001 (3 rows)');
  });

  it('caps the comment at the proposal limit', () => {
    const comment = buildHandoffComment({
      host,
      state: baseState({ titles: ['x'.repeat(10000)] }),
      reportId,
    });

    expect(comment.length).toBeLessThanOrEqual(8192);
  });
});

describe('buildHandoffContext', () => {
  it('is plain text naming the host, report, evidence, window, and techniques', () => {
    const context = buildHandoffContext({ host, state: baseState(), reportId });

    expect(context).toBe(
      'Hunt Watch confirmed Hunt: PowerShell (T1059.001) [ti-repor] on WIN-ANALYST01. ' +
        'The source is threat report rpt-1. Tier 1 matched 4 events; Techniques: T1059.001. ' +
        'The hunt window was 2026-09-25T00:00:00.000Z to 2026-10-25T00:00:00.000Z. ' +
        'Corroborated ATT&CK techniques: T1059.001.'
    );
    expect(context).not.toContain('*');
    expect(context).not.toContain('`');
  });

  it('still names the host when the run carried no title, window, or technique', () => {
    const context = buildHandoffContext({
      host,
      state: baseState({
        titles: [],
        techniques: [],
        corroboratedTechniques: [],
        huntWindow: undefined,
        evidence: { tier2Confirmed: [] },
      }),
      reportId,
    });

    expect(context).toBe(
      'Hunt Watch confirmed activity on WIN-ANALYST01. The source is threat report rpt-1.'
    );
  });

  it('stays within the handoff action input bound', () => {
    const context = buildHandoffContext({
      host,
      state: baseState({ titles: ['x'.repeat(5000)] }),
      reportId,
    });

    expect(context.length).toBeLessThanOrEqual(MAX_HANDOFF_CONTEXT_LENGTH);
  });
});

describe('buildRecommendationComment', () => {
  it('builds the Action / Why / Recommended steps / context shape', () => {
    const comment = buildRecommendationComment({
      reasonLines: ['No host was observed in this finding.'],
      manualRemediation: ['Rotate the exposed key.'],
      state: baseState(),
    });

    expect(comment).toBe(
      [
        '**Action:** Analyst follow-up. No automated action is proposed.',
        '',
        '**Why**',
        '- No host was observed in this finding.',
        '',
        '**Recommended steps**',
        '- Rotate the exposed key.',
        '',
        'Hunt Watch confirmed *Hunt: PowerShell (T1059.001) [ti-repor]*; Tier 1 matched 4 events; Techniques: T1059.001.',
      ].join('\n')
    );
  });

  it('omits the Recommended steps section when there is no manual remediation', () => {
    const comment = buildRecommendationComment({
      reasonLines: ['A reason.'],
      manualRemediation: [],
      state: baseState(),
    });

    expect(comment).not.toContain('**Recommended steps**');
  });
});
