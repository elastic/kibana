/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { HUNT_COVERAGE_AI_INDEX_ID } from '../../../../../common/step_types/package_report';
import {
  HUNT_HANDOFF_ACTION_WORKFLOW_ID,
  HUNT_HANDOFF_CLASSIFICATION,
  HUNT_HANDOFF_PRODUCER,
  HUNT_HANDOFF_WATCH_ID,
  MAX_HANDOFF_HOST_NAME_LENGTH,
  buildHandoffSubjectId,
  buildProposalSubjectKey,
  decidePackageReport,
} from './decide_package_report';
import type { CurrentRunState } from './types';

const conversationId = 'conv-1';
const spaceId = 'default';
const reportId = 'rpt-1';
const runId = 'run-1';

const baseHitState = (overrides: Partial<CurrentRunState> = {}): CurrentRunState => ({
  runId,
  reportId,
  hasConfirmedHit: true,
  titles: ['Shadow admin AssumeRole'],
  evidenceLines: ['Tier 1 hits in cloudtrail'],
  techniques: ['T1078.004'],
  corroboratedTechniques: ['T1078.004'],
  hosts: [{ name: 'host-a' }],
  // Fully host-scoped defaults: no recommendation trigger fires unless a test overrides one.
  hasNonHostEntity: false,
  hasIocIndicator: false,
  manualRemediation: [],
  evidence: { tier1HitCount: 4, tier2Confirmed: [] },
  huntWindow: { from: '2026-09-25T00:00:00.000Z', to: '2026-10-25T00:00:00.000Z' },
  ...overrides,
});

const decide = (state: CurrentRunState) =>
  decidePackageReport({ conversationId, spaceId, reportId, runId, state });

/** The keys `action_handoff_to_forensics.yaml` declares under `actionInput.properties`. */
const HANDOFF_ACTION_INPUT_KEYS = [
  'ai_index_id',
  'classification',
  'context',
  'host_name',
  'investigation_id',
  'producer',
  'report_id',
  'subject_id',
  'watch_id',
  'workflow_execution_id',
];

describe('decidePackageReport', () => {
  it('dismisses a clean run with no proposals', () => {
    const result = decide(baseHitState({ hasConfirmedHit: false, hosts: [] }));

    expect(result.dismiss).toBe(true);
    expect(result.proposals).toEqual([]);
    expect(result.closureSummary).toContain('No confirmed hits');
  });

  it('mints exactly one Forensics handoff per confirmed host', () => {
    const result = decide(baseHitState({ hosts: [{ name: 'host-a' }, { name: 'host-b' }] }));

    expect(result.dismiss).toBe(false);
    expect(result.proposals.map((p) => p.hostName)).toEqual(['host-a', 'host-b']);
    for (const proposal of result.proposals) {
      expect(proposal.actionWorkflowId).toBe(HUNT_HANDOFF_ACTION_WORKFLOW_ID);
      expect(proposal.category).toBe('investigate');
      expect(proposal.impact).toBe('high');
      expect(proposal.title).toBe(`Run a deep forensics investigation on ${proposal.hostName}`);
    }
  });

  // The same action the Attack Discovery review hands off through, so Forensics Watch's
  // sweep sees one indicator shape whichever Watch produced it.
  it('hands off through the shared forensics handoff action', () => {
    expect(HUNT_HANDOFF_ACTION_WORKFLOW_ID).toBe(ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID);
  });

  // The handoff action closes `actionInput` to additional properties, so an extra key here is
  // a validation failure at approval time, and a missing required one a proposal that can
  // never run. Pinned to the declared key set, not a loose `toMatchObject`.
  it('fills exactly the keys the handoff action declares, and never a Defend endpoint id', () => {
    const [proposal] = decide(baseHitState()).proposals;

    expect(Object.keys(proposal.actionInput ?? {}).sort()).toEqual(HANDOFF_ACTION_INPUT_KEYS);
    expect(proposal.actionInput).toMatchObject({
      ai_index_id: HUNT_COVERAGE_AI_INDEX_ID,
      host_name: 'host-a',
      report_id: reportId,
      investigation_id: conversationId,
      classification: HUNT_HANDOFF_CLASSIFICATION,
      workflow_execution_id: runId,
      producer: HUNT_HANDOFF_PRODUCER,
      watch_id: HUNT_HANDOFF_WATCH_ID,
      subject_id: buildHandoffSubjectId({ spaceId, reportId, hostName: 'host-a' }),
    });
    expect(proposal.actionInput).not.toHaveProperty('endpoint_ids');
    expect(proposal.actionInput).not.toHaveProperty('parameters');
    expect(proposal.actionInput).not.toHaveProperty('attack_discovery_id');
  });

  it('gives the forensic agent plain-text context naming the host, report, and window', () => {
    const [proposal] = decide(baseHitState()).proposals;
    const context = String(proposal.actionInput?.context);

    expect(context).toContain('host-a');
    expect(context).toContain(reportId);
    expect(context).toContain('2026-09-25T00:00:00.000Z');
    expect(context).toContain('T1078.004');
    expect(context).not.toContain('*');
    expect(context.length).toBeLessThanOrEqual(2000);
  });

  it('dedupes a host the SSEs named more than once', () => {
    const result = decide(baseHitState({ hosts: [{ name: 'host-a' }, { name: 'host-a' }] }));

    expect(result.proposals.map((p) => p.hostName)).toEqual(['host-a']);
  });

  it('mints a recommendation instead of a handoff when the hit is hostless', () => {
    const result = decide(baseHitState({ hosts: [] }));

    expect(result.dismiss).toBe(false);
    expect(result.proposals).toHaveLength(1);
    const [recommendation] = result.proposals;
    expect(recommendation.title).toBe('Analyst recommendation');
    expect(recommendation.actionWorkflowId).toBeUndefined();
    expect(recommendation.actionInput).toBeUndefined();
    expect(recommendation.comment).toContain('nothing to hand to Forensics Watch');
  });

  it.each([
    ['a non-host entity', { hasNonHostEntity: true }],
    ['an IOC indicator', { hasIocIndicator: true }],
  ])('mints the handoffs plus a recommendation when the evidence carries %s', (_case, flags) => {
    const result = decide(baseHitState(flags));

    expect(result.proposals.map((p) => p.title)).toEqual([
      'Run a deep forensics investigation on host-a',
      'Analyst recommendation',
    ]);
    expect(result.proposals[1].comment).toContain('not host-scoped');
    expect(result.proposals[1].comment).not.toContain('nothing to hand to Forensics Watch');
  });

  // An SSE entity value may be 2048 characters; the action's `host_name` is bounded at 256,
  // and a Proposal whose approval fails validation is worse than no Proposal.
  it('leaves a host whose name exceeds the handoff bound to the recommendation', () => {
    const tooLong = 'h'.repeat(MAX_HANDOFF_HOST_NAME_LENGTH + 1);
    const result = decide(baseHitState({ hosts: [{ name: 'host-a' }, { name: tooLong }] }));

    expect(result.proposals.map((p) => p.title)).toEqual([
      'Run a deep forensics investigation on host-a',
      'Analyst recommendation',
    ]);
    expect(result.proposals[1].comment).toContain('longer than a handoff accepts');
    expect(result.proposals[1].comment).not.toContain('nothing to hand to Forensics Watch');
  });

  it('mints no recommendation when every finding is host-scoped', () => {
    const result = decide(baseHitState());

    expect(result.proposals.map((p) => p.title)).toEqual([
      'Run a deep forensics investigation on host-a',
    ]);
  });

  it('never mints a Defend response action', () => {
    const result = decide(
      baseHitState({ hosts: [{ name: 'host-a' }, { name: 'host-b' }], hasIocIndicator: true })
    );

    for (const proposal of result.proposals) {
      // Either the handoff, or the no-action recommendation; never a Defend action id.
      expect(proposal.actionWorkflowId ?? HUNT_HANDOFF_ACTION_WORKFLOW_ID).toBe(
        HUNT_HANDOFF_ACTION_WORKFLOW_ID
      );
      expect(proposal.actionWorkflowId ?? '').not.toMatch(/isolate|kill|suspend/);
    }
  });

  it('lifts manual_remediation lines into the recommendation comment', () => {
    const result = decide(
      baseHitState({ hosts: [], manualRemediation: ['Rotate credentials for role X.'] })
    );

    expect(result.proposals[0].comment).toContain('Rotate credentials for role X.');
  });

  it('mints the same recommendation subject key on a rerun of the same conversation', () => {
    const first = decide(baseHitState({ hosts: [] }));
    const second = decide(baseHitState({ hosts: [], runId: 'run-2' }));

    expect(first.proposals[0].subjectKey).toBe(second.proposals[0].subjectKey);
  });

  it('names the hosts it handed off in the closure summary', () => {
    const result = decide(baseHitState({ hosts: [{ name: 'host-a' }, { name: 'host-b' }] }));

    expect(result.closureSummary).toContain('Hosts handed to Forensics Watch: host-a, host-b');
  });
});

describe('buildProposalSubjectKey', () => {
  it('is stable for the same conversation, host, and action', () => {
    const input = { conversationId, hostName: 'host-a', actionWorkflowId: 'wf' };

    expect(buildProposalSubjectKey(input)).toBe(buildProposalSubjectKey({ ...input }));
  });

  it('differs by host and by conversation', () => {
    const base = { conversationId, hostName: 'host-a', actionWorkflowId: 'wf' };

    expect(buildProposalSubjectKey(base)).not.toBe(
      buildProposalSubjectKey({ ...base, hostName: 'host-b' })
    );
    expect(buildProposalSubjectKey(base)).not.toBe(
      buildProposalSubjectKey({ ...base, conversationId: 'conv-2' })
    );
  });
});

describe('buildHandoffSubjectId', () => {
  it('is stable per (space, report, host) so a re-approved handoff replaces its indicator', () => {
    const input = { spaceId, reportId, hostName: 'host-a' };

    expect(buildHandoffSubjectId(input)).toBe(buildHandoffSubjectId({ ...input }));
    expect(buildHandoffSubjectId(input)).toMatch(/^hunt-rpt-1-[0-9a-f]{16}$/);
  });

  it('differs by host and by space, since every space shares one indicator index', () => {
    const base = { spaceId, reportId, hostName: 'host-a' };

    expect(buildHandoffSubjectId(base)).not.toBe(
      buildHandoffSubjectId({ ...base, hostName: 'host-b' })
    );
    expect(buildHandoffSubjectId(base)).not.toBe(
      buildHandoffSubjectId({ ...base, spaceId: 'other' })
    );
  });
});
