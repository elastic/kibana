/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import {
  buildProposalComment,
  buildProposalTitle,
  buildRecommendationComment,
} from './proposal_copy';
import type { CurrentRunHost, CurrentRunState, ProcessSelector } from './types';

const host: CurrentRunHost = { name: 'WIN-ANALYST01', enrolled: true, agentId: 'agent-1' };

const killProcess: ActionCatalogEntry = {
  workflowId: 'system-security-action-kill-process',
  name: 'Kill process',
  category: 'respond',
};

const suspendProcess: ActionCatalogEntry = {
  workflowId: 'system-security-action-suspend-process',
  name: 'Suspend process',
  category: 'respond',
};

const isolateHost: ActionCatalogEntry = {
  workflowId: 'system-security-action-isolate-host',
  name: 'Isolate host',
  category: 'respond',
};

const configureSomething: ActionCatalogEntry = {
  workflowId: 'system-security-action-configure-something',
  name: 'Configure something',
  category: 'configure',
};

const withPid: ProcessSelector = {
  pid: 4212,
  processKey: 'pid:4212',
  hostName: host.name,
  processName: 'powershell.exe',
  observedAt: '2026-09-27T16:34:41.000Z',
};

const withEntityOnly: ProcessSelector = {
  entityId: 'ent-9',
  processKey: 'entity_id:ent-9',
  hostName: host.name,
  processName: 'aws.exe',
};

const baseState = (overrides: Partial<CurrentRunState> = {}): CurrentRunState => ({
  runId: 'run-1',
  reportId: 'rpt-1',
  hasConfirmedHit: true,
  titles: ['Hunt: PowerShell (T1059.001) [ti-repor]'],
  evidenceLines: [],
  techniques: ['T1059.001'],
  hosts: [host],
  processSelectors: [],
  hasNonHostEntity: false,
  hasIocIndicator: false,
  allEventsActionable: true,
  hasProcessBearingEvent: false,
  manualRemediation: [],
  evidence: { tier1HitCount: 4, tier2Confirmed: [] },
  ...overrides,
});

describe('buildProposalTitle', () => {
  it('names the process and pid when the selector has a pid', () => {
    expect(buildProposalTitle({ entry: killProcess, host, processSelector: withPid })).toBe(
      'Kill powershell.exe (PID 4212) on WIN-ANALYST01'
    );
  });

  it('names the process only when the selector has no pid', () => {
    expect(
      buildProposalTitle({ entry: suspendProcess, host, processSelector: withEntityOnly })
    ).toBe('Suspend aws.exe on WIN-ANALYST01');
  });

  it('builds a host-scoped title for a host action', () => {
    expect(buildProposalTitle({ entry: isolateHost, host })).toBe('Isolate host WIN-ANALYST01');
  });

  it('falls back to a generic "on host" title for any other action', () => {
    expect(buildProposalTitle({ entry: configureSomething, host })).toBe(
      'Configure something on WIN-ANALYST01'
    );
  });

  it('gives two processes on the same host distinct titles', () => {
    const titleA = buildProposalTitle({ entry: killProcess, host, processSelector: withPid });
    const titleB = buildProposalTitle({
      entry: killProcess,
      host,
      processSelector: withEntityOnly,
    });
    expect(titleA).not.toBe(titleB);
  });

  it('caps the title at 256 characters', () => {
    const longSelector: ProcessSelector = {
      ...withPid,
      processName: 'p'.repeat(400),
    };
    const title = buildProposalTitle({ entry: killProcess, host, processSelector: longSelector });
    expect(title.length).toBeLessThanOrEqual(256);
  });
});

describe('buildProposalComment', () => {
  it('builds the Action / Why body for a process-scoped action', () => {
    const state = baseState();
    const comment = buildProposalComment({
      entry: killProcess,
      host,
      state,
      processSelector: withPid,
    });

    expect(comment).toContain(
      '**Action:** Kill `powershell.exe` (PID 4212) on **WIN-ANALYST01** with Elastic Defend.'
    );
    expect(comment).toContain('**Why**');
    expect(comment).toContain(
      'Hunt Watch confirmed *Hunt: PowerShell (T1059.001) [ti-repor]* on WIN-ANALYST01.'
    );
    expect(comment).toContain('Tier 1 matched 4 events');
    expect(comment).toContain('`powershell.exe` (PID 4212) last seen 2026-09-27T16:34:41.000Z');
  });

  it('builds the Action line for a host-scoped action', () => {
    const state = baseState();
    const comment = buildProposalComment({ entry: isolateHost, host, state });
    expect(comment).toContain('**Action:** Isolate host **WIN-ANALYST01** with Elastic Defend.');
  });

  it('includes exactly one Tier 1 line even when three SSEs carried the same evidence', () => {
    const state = baseState({
      titles: ['Hunt: PowerShell (T1059.001) [ti-repor]'],
      evidence: { tier1HitCount: 4, tier2Confirmed: [] },
    });
    const comment = buildProposalComment({
      entry: killProcess,
      host,
      state,
      processSelector: withPid,
    });
    const tier1Lines = comment.split('\n').filter((line) => line.includes('Tier 1 matched'));
    expect(tier1Lines).toHaveLength(1);
  });

  it('never quotes the raw hunt_result.tier1.per_index text', () => {
    const state = baseState();
    const comment = buildProposalComment({
      entry: killProcess,
      host,
      state,
      processSelector: withPid,
    });
    expect(comment).not.toContain('per_index');
    expect(comment).not.toContain('hunt_result');
  });

  it('summarizes confirmed Tier 2 techniques when present', () => {
    const state = baseState({
      evidence: {
        tier1HitCount: 4,
        tier2Confirmed: [
          { techniqueId: 'T1059.001', rowCount: 3 },
          { techniqueId: 'T1078.004', rowCount: 4 },
        ],
      },
    });
    const comment = buildProposalComment({
      entry: killProcess,
      host,
      state,
      processSelector: withPid,
    });
    expect(comment).toContain('Tier 2 confirmed T1059.001 (3 rows) and T1078.004 (4 rows)');
  });

  it('falls back to the plain technique list when no Tier 2 behavior is confirmed', () => {
    const state = baseState({ techniques: ['T1078.004'], evidence: { tier2Confirmed: [] } });
    const comment = buildProposalComment({
      entry: killProcess,
      host,
      state,
      processSelector: withPid,
    });
    expect(comment).toContain('Techniques: T1078.004');
  });

  it('omits the process last-seen line when there is no process selector', () => {
    const state = baseState();
    const comment = buildProposalComment({ entry: isolateHost, host, state });
    expect(comment).not.toContain('last seen');
  });
});

describe('buildRecommendationComment', () => {
  it('builds the Action / Why / Recommended steps / context shape', () => {
    const state = baseState({
      titles: ['Shadow admin AssumeRole'],
      techniques: [],
      evidence: { tier1HitCount: 12, tier2Confirmed: [] },
    });
    const comment = buildRecommendationComment({
      reasonLines: [
        'Host ghost is not enrolled, so no Defend action reaches it.',
        'Part of the evidence is not host-scoped, so a host action would not close it.',
      ],
      manualRemediation: ['Rotate credentials for role X.'],
      state,
    });

    expect(comment).toContain('**Action:** Analyst follow-up. No automated action is proposed.');
    expect(comment).toContain('**Why**');
    expect(comment).toContain('- Host ghost is not enrolled, so no Defend action reaches it.');
    expect(comment).toContain('**Recommended steps**');
    expect(comment).toContain('- Rotate credentials for role X.');
    expect(comment).toContain(
      'Hunt Watch confirmed *Shadow admin AssumeRole*; Tier 1 matched 12 events.'
    );
  });

  it('omits the Recommended steps section when there is no manual remediation', () => {
    const state = baseState();
    const comment = buildRecommendationComment({
      reasonLines: ['No respond action could be filled for this finding.'],
      manualRemediation: [],
      state,
    });
    expect(comment).not.toContain('Recommended steps');
  });
});
