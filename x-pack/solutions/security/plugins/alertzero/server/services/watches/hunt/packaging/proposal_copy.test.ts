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
import type { CurrentRunHost, CurrentRunState, ProcessSelector, Subject } from './types';

const host: CurrentRunHost = {
  name: 'WIN-ANALYST01',
  enrolled: true,
  agentId: 'agent-1',
  capabilities: [],
};
const hostSubject: Subject = { kind: 'host', value: host.name, reachable: true, host };
const processSubject = (processSelector: ProcessSelector): Subject => ({
  kind: 'process',
  value: processSelector.processName,
  reachable: true,
  host,
  processSelector,
});
const actionInput = { endpoint_ids: ['agent-1'] };
const userSubject: Subject = { kind: 'user', value: 'dev-user', reachable: true };
const serviceSubject: Subject = { kind: 'service', value: 'escalated-role', reachable: true };

const setAssetCriticality: ActionCatalogEntry = {
  workflowId: 'system-alertzero-action-set-asset-criticality',
  name: 'Set asset criticality',
  category: 'respond',
  subjects: ['user', 'service'],
};

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

const memoryDump: ActionCatalogEntry = {
  workflowId: 'system-alertzero-action-memory-dump',
  name: 'Dump memory of process',
  category: 'investigate',
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
  iocMatched: false,
};

const withEntityOnly: ProcessSelector = {
  entityId: 'ent-9',
  processKey: 'entity_id:ent-9',
  hostName: host.name,
  processName: 'aws.exe',
  iocMatched: false,
};

const withTechnique: ProcessSelector = {
  ...withPid,
  techniqueId: 'T1059.001',
};

const baseState = (overrides: Partial<CurrentRunState> = {}): CurrentRunState => ({
  runId: 'run-1',
  reportId: 'rpt-1',
  sseCount: 1,
  hasConfirmedHit: true,
  severity: 'high',
  confidence: 0.7,
  titles: ['Hunt: PowerShell (T1059.001) [ti-repor]'],
  evidenceLines: [],
  techniques: ['T1059.001'],
  findings: [],
  techniqueNames: {},
  users: [],
  corroboratedTechniques: ['T1059.001'],
  hosts: [host],
  processSelectors: [],
  services: [],
  hasIocIndicator: false,
  hasUnnamedIdentityEntity: false,
  allEventsActionable: true,
  hasProcessBearingEvent: false,
  manualRemediation: [],
  evidence: { tier1HitCount: 4, tier2Confirmed: [] },
  ...overrides,
});

describe('buildProposalTitle', () => {
  it('names the process and pid when the selector has a pid', () => {
    expect(
      buildProposalTitle({ entry: killProcess, subject: processSubject(withPid), actionInput })
    ).toBe('Kill powershell.exe (PID 4212) on WIN-ANALYST01');
  });

  it('names the process only when the selector has no pid', () => {
    expect(
      buildProposalTitle({
        entry: suspendProcess,
        subject: processSubject(withEntityOnly),
        actionInput,
      })
    ).toBe('Suspend aws.exe on WIN-ANALYST01');
  });

  it('builds a host-scoped title for a host action', () => {
    expect(buildProposalTitle({ entry: isolateHost, subject: hostSubject, actionInput })).toBe(
      'Isolate host WIN-ANALYST01'
    );
  });

  it('falls back to a generic "on host" title for any other action', () => {
    expect(
      buildProposalTitle({ entry: configureSomething, subject: hostSubject, actionInput })
    ).toBe('Configure something on WIN-ANALYST01');
  });

  it('gives two processes on the same host distinct titles', () => {
    const titleA = buildProposalTitle({
      entry: killProcess,
      subject: processSubject(withPid),
      actionInput,
    });
    const titleB = buildProposalTitle({
      entry: killProcess,
      subject: processSubject(withEntityOnly),
      actionInput,
    });
    expect(titleA).not.toBe(titleB);
  });

  it('names the identity and the level for an asset-criticality proposal', () => {
    expect(
      buildProposalTitle({
        entry: setAssetCriticality,
        subject: userSubject,
        actionInput: {
          id_field: 'user.name',
          id_value: 'dev-user',
          criticality_level: 'high_impact',
        },
      })
    ).toBe('Mark user dev-user high impact');
    expect(
      buildProposalTitle({
        entry: setAssetCriticality,
        subject: serviceSubject,
        actionInput: {
          id_field: 'service.name',
          id_value: 'escalated-role',
          criticality_level: 'extreme_impact',
        },
      })
    ).toBe('Mark service escalated-role extreme impact');
  });

  it('falls back to a generic "for <kind> <value>" title for an identity action without a level', () => {
    expect(
      buildProposalTitle({
        entry: { ...setAssetCriticality, name: 'Suspend Okta user' },
        subject: userSubject,
        actionInput: { id_field: 'user.name', id_value: 'dev-user' },
      })
    ).toBe('Suspend Okta user for user dev-user');
  });

  it('caps the title at 256 characters', () => {
    const longSelector: ProcessSelector = {
      ...withPid,
      processName: 'p'.repeat(400),
    };
    const title = buildProposalTitle({
      entry: killProcess,
      subject: processSubject(longSelector),
      actionInput,
    });
    expect(title.length).toBeLessThanOrEqual(256);
  });
});

describe('buildProposalComment', () => {
  it('builds the Action / Why body for a process-scoped action with no technique attribution', () => {
    const state = baseState();
    const comment = buildProposalComment({
      entry: killProcess,
      subject: processSubject(withPid),
      state,
      actionInput,
    });

    expect(comment).toContain(
      '**Action:** Kill `powershell.exe` (PID 4212) on **WIN-ANALYST01** with Elastic Defend.'
    );
    expect(comment).toContain('**Why**');
    expect(comment).toContain(
      "Observed during the report's confirmed hunt window (Tier 1 matched 4 events)."
    );
    expect(comment).toContain('`powershell.exe` (PID 4212) last seen 2026-09-27T16:34:41.000Z');
    expect(comment).toContain('Killing it stops execution immediately.');
    // A process-scoped Why should not fall back to the host-wide hunt summary.
    expect(comment).not.toContain('Hunt Watch confirmed');
  });

  it('names the one technique a process is implicated in, not every technique on the host', () => {
    const state = baseState({
      evidence: {
        tier1HitCount: 4,
        tier2Confirmed: [
          { techniqueId: 'T1059.001', rowCount: 3, techniqueName: 'PowerShell' },
          { techniqueId: 'T1078.004', rowCount: 4, techniqueName: 'Cloud Accounts' },
        ],
      },
    });
    const comment = buildProposalComment({
      entry: killProcess,
      subject: processSubject(withTechnique),
      state,
      actionInput,
    });
    expect(comment).toContain(
      'Implicated in T1059.001 (PowerShell): 3 rows of matching activity confirmed in the hunt window.'
    );
    expect(comment).not.toContain('T1078.004');
  });

  it('gives kill and suspend proposals for the same process distinct action rationale', () => {
    const state = baseState();
    const killComment = buildProposalComment({
      entry: killProcess,
      subject: processSubject(withPid),
      state,
      actionInput,
    });
    const suspendComment = buildProposalComment({
      entry: suspendProcess,
      subject: processSubject(withPid),
      state,
      actionInput,
    });
    expect(killComment).toContain('Killing it stops execution immediately.');
    expect(suspendComment).toContain(
      'Suspending it pauses execution without terminating the process, preserving state for investigation.'
    );
  });

  it('builds the Action / Why body for a host-scoped action', () => {
    const state = baseState();
    const comment = buildProposalComment({
      entry: isolateHost,
      subject: hostSubject,
      state,
      actionInput,
    });
    expect(comment).toContain('**Action:** Isolate host **WIN-ANALYST01** with Elastic Defend.');
    expect(comment).toContain(
      'Hunt Watch confirmed *Hunt: PowerShell (T1059.001) [ti-repor]* on WIN-ANALYST01.'
    );
    expect(comment).toContain(
      'Isolating the host cuts off its network access, stopping further command-and-control, lateral movement, or data exfiltration while this activity is investigated.'
    );
  });

  it('gives a kill proposal and an isolate proposal on the same host distinct Why text', () => {
    const state = baseState();
    const killComment = buildProposalComment({
      entry: killProcess,
      subject: processSubject(withPid),
      state,
      actionInput,
    });
    const isolateComment = buildProposalComment({
      entry: isolateHost,
      subject: hostSubject,
      state,
      actionInput,
    });
    expect(killComment).not.toBe(isolateComment);
    expect(killComment).toContain('Killing it stops execution immediately.');
    expect(isolateComment).toContain('Isolating the host cuts off its network access');
  });

  it('includes exactly one Tier 1 line even when three SSEs carried the same evidence', () => {
    const state = baseState({
      titles: ['Hunt: PowerShell (T1059.001) [ti-repor]'],
      evidence: { tier1HitCount: 4, tier2Confirmed: [] },
    });
    const comment = buildProposalComment({
      entry: killProcess,
      subject: processSubject(withPid),
      state,
      actionInput,
    });
    const tier1Lines = comment.split('\n').filter((line) => line.includes('Tier 1 matched'));
    expect(tier1Lines).toHaveLength(1);
  });

  it('never quotes the raw hunt_result.tier1.per_index text', () => {
    const state = baseState();
    const comment = buildProposalComment({
      entry: killProcess,
      subject: processSubject(withPid),
      state,
      actionInput,
    });
    expect(comment).not.toContain('per_index');
    expect(comment).not.toContain('hunt_result');
  });

  it('summarizes confirmed Tier 2 techniques on a host-scoped proposal when present', () => {
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
      entry: isolateHost,
      subject: hostSubject,
      state,
      actionInput,
    });
    expect(comment).toContain('Tier 2 confirmed T1059.001 (3 rows) and T1078.004 (4 rows)');
  });

  it('falls back to the plain technique list on a host-scoped proposal when no Tier 2 behavior is confirmed', () => {
    const state = baseState({ techniques: ['T1078.004'], evidence: { tier2Confirmed: [] } });
    const comment = buildProposalComment({
      entry: isolateHost,
      subject: hostSubject,
      state,
      actionInput,
    });
    expect(comment).toContain('Techniques: T1078.004');
  });

  it('builds the Action / Why body for an identity proposal without a host suffix', () => {
    const state = baseState({ titles: ['Shadow admin AssumeRole'] });
    const comment = buildProposalComment({
      entry: setAssetCriticality,
      subject: userSubject,
      state,
      actionInput: {
        id_field: 'user.name',
        id_value: 'dev-user',
        criticality_level: 'high_impact',
      },
    });
    expect(comment).toContain(
      '**Action:** Set asset criticality for user **dev-user** to high_impact.'
    );
    expect(comment).toContain('Hunt Watch confirmed *Shadow admin AssumeRole*.');
    expect(comment).not.toContain('on WIN-ANALYST01');
    expect(comment).toContain('Tier 1 matched 4 events');
    expect(comment).toContain('Raising its asset criticality lifts its risk score');
    expect(comment).not.toContain('Elastic Defend');
  });

  it('omits the process last-seen line when there is no process selector', () => {
    const state = baseState();
    const comment = buildProposalComment({
      entry: isolateHost,
      subject: hostSubject,
      state,
      actionInput,
    });
    expect(comment).not.toContain('last seen');
  });

  it('renders the selection rule as the first Why bullet when given', () => {
    const comment = buildProposalComment({
      entry: suspendProcess,
      host,
      state: baseState(),
      processSelector: withPid,
      ruleLine: 'Rule: suspend_only (no destructive technique, no memdump_process capability)',
    });
    const lines = comment.split('\n');
    const whyIndex = lines.indexOf('**Why**');
    expect(lines[whyIndex + 1]).toBe(
      '- Rule: suspend_only (no destructive technique, no memdump_process capability).'
    );
  });

  it('gives a memory dump proposal its own action line and rationale', () => {
    const comment = buildProposalComment({
      entry: memoryDump,
      host,
      state: baseState(),
      processSelector: withPid,
    });
    expect(comment).toContain(
      '**Action:** Dump memory of `powershell.exe` (PID 4212) on **WIN-ANALYST01** with Elastic Defend.'
    );
    expect(comment).toContain(
      'Dumping its memory captures volatile evidence for offline analysis without changing the process.'
    );
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
    expect(comment).not.toContain('Held back');
  });

  it('renders held-back lines between Why and Recommended steps', () => {
    const comment = buildRecommendationComment({
      reasonLines: ['Not every Defend action was proposed for this finding; see Held back.'],
      heldBackLines: [
        'Isolate host WIN-ANALYST01 was not proposed: 1 suspicious process, no lateral movement, C2, or exfiltration technique confirmed, severity high',
      ],
      manualRemediation: ['Rotate credentials for role X.'],
      state: baseState(),
    });
    expect(comment).toContain('**Held back**');
    expect(comment).toContain(
      '- Isolate host WIN-ANALYST01 was not proposed: 1 suspicious process'
    );
    expect(comment.indexOf('**Why**')).toBeLessThan(comment.indexOf('**Held back**'));
    expect(comment.indexOf('**Held back**')).toBeLessThan(comment.indexOf('**Recommended steps**'));
  });
});
