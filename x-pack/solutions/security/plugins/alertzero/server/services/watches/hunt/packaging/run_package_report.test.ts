/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { buildHuntInvestigationConversationId } from '../common/hunt_investigation_id';
import { HUNT_HANDOFF_ACTION_WORKFLOW_ID } from './decide_package_report';
import { PackageReportIdentityError, runPackageReport } from './run_package_report';
import type { RunPackageReportDeps } from './run_package_report';

const reportId = 'rpt-package-1';
const conversationId = buildHuntInvestigationConversationId(reportId);
const runId = 'run-abc';

const sseAttachment = ({
  hit,
  hostNames = [],
  attachmentId = 'sse-1',
}: {
  hit: boolean;
  hostNames?: string[];
  attachmentId?: string;
}): VersionedAttachment => ({
  id: attachmentId,
  type: 'security.significant_security_event',
  current_version: 1,
  versions: [
    {
      version: 1,
      created_at: '2026-09-25T00:00:00.000Z',
      content_hash: 'abc',
      data: {
        title: 'Test SSE',
        severity: 'high',
        confidence: 0.9,
        status: 'open',
        source_watch: 'system-security-hunt-continuous-threat-hunt',
        capability: 'continuous_threat_hunt',
        run_id: runId,
        report_id: reportId,
        security_knowledge_indicators: hit
          ? [{ type: 'technique', value: 'T1078.004', technique_id: 'T1078.004' }]
          : [],
        entities: hostNames.map((value) => ({ field: 'host.name', value })),
        timeline: [],
        hypothesis_tested: 'test',
        evidence_for: hit ? ['Tier 1 hit'] : [],
        evidence_against: [],
        evaluation_record_ref: 'eval-1',
        hunt_result: hit
          ? {
              has_confirmed_hit: true,
              hit_sources: ['tier1'],
              time_range: {
                from: '2026-09-25T00:00:00.000Z',
                to: '2026-09-25T01:00:00.000Z',
              },
              tier1: {
                status: 'environment_hits_found',
                counts: {
                  total_hits: 1,
                  returned_hits: 1,
                  affected_hosts: 1,
                  affected_users: 0,
                },
                per_index: [
                  {
                    index: 'logs-endpoint.events*',
                    hit_count: 1,
                    required: true,
                  },
                ],
                resolved_iocs: [],
              },
            }
          : {
              has_confirmed_hit: false,
              hit_sources: [],
              time_range: {
                from: '2026-09-25T00:00:00.000Z',
                to: '2026-09-25T01:00:00.000Z',
              },
              tier1: {
                status: 'no_environment_hits',
                counts: {
                  total_hits: 0,
                  returned_hits: 0,
                  affected_hosts: 0,
                  affected_users: 0,
                },
                per_index: [
                  {
                    index: 'logs-endpoint.events*',
                    hit_count: 0,
                    required: true,
                  },
                ],
                resolved_iocs: [],
              },
            },
      },
    },
  ],
});

const deps = (overrides: Partial<RunPackageReportDeps> = {}): RunPackageReportDeps => ({
  writeCoverageKis: async (subjects) => ({
    written: subjects.map((s) => ({ kiId: s.kiId, subject: s.reportId })),
    skipped: [],
  }),
  countExistingProposals: async () => 0,
  ...overrides,
});

const run = (
  overrides: Partial<Parameters<typeof runPackageReport>[0]> = {}
): ReturnType<typeof runPackageReport> =>
  runPackageReport({
    spaceId: 'default',
    reportId,
    investigationConversationId: conversationId,
    runId,
    huntStatus: 'success',
    hasConfirmedHit: true,
    attachments: [sseAttachment({ hit: true, hostNames: ['host-a'] })],
    deps: deps(),
    ...overrides,
  });

describe('runPackageReport', () => {
  it('rejects identity binding mismatches', async () => {
    await expect(run({ investigationConversationId: 'wrong-id' })).rejects.toBeInstanceOf(
      PackageReportIdentityError
    );
  });

  // A hunt that confirmed no hit writes no SSE attachment at all, so this is the shape of
  // every no-hit run in production, not an edge case. It must close the Investigation.
  it('packages a completed no-hit run as a dismissal', async () => {
    const result = await run({ hasConfirmedHit: false, attachments: [] });

    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    expect(result.dismiss).toBe(true);
    expect(result.proposals).toEqual([]);
    expect(result.closureSummary).toContain('no confirmed hits');
    expect(result.mintSuppression).toBe('none');
    expect(result.dismissSuppression).toBe('none');
    // The coordinator never emits an SSE for a clean run, so this is the real clean path --
    // not the synthetic clean-with-SSE case below -- and it must still write coverage.
    expect(result.coverage.written.length).toBeGreaterThan(0);
    expect(result.coverage.skipped).toEqual([]);
  });

  // A manual replay bypasses the hunt-once gate, so a report whose earlier run confirmed a hit
  // and handed a host to Forensics Watch can be hunted again and come back clean. Closing then
  // would shut the Investigation under a forensic report still being written into it.
  describe('a clean run on an Investigation that already has a Proposal', () => {
    it.each([
      ['no SSE at all', [] as VersionedAttachment[]],
      ['an SSE that cleared no hit', [sseAttachment({ hit: false })]],
    ])('leaves it open when the run has %s', async (_case, attachments) => {
      const result = await run({
        hasConfirmedHit: false,
        attachments,
        deps: deps({ countExistingProposals: async () => 1 }),
      });

      expect(result.status).toBe('packaged');
      if (result.status !== 'packaged') {
        return;
      }
      expect(result.dismiss).toBe(false);
      expect(result.dismissSuppression).toBe('existing_proposals');
      expect(result.proposals).toEqual([]);
      expect(result.mintSuppression).toBe('none');
      // Coverage is still recorded: the sweep did look, whatever the close decision.
      expect(result.coverage.written.length).toBeGreaterThan(0);
    });

    it('fails closed, leaving it open, when the lookup itself throws', async () => {
      const result = await run({
        hasConfirmedHit: false,
        attachments: [],
        deps: deps({
          countExistingProposals: async () => {
            throw new Error('proposals index unavailable');
          },
        }),
      });

      expect(result.status).toBe('packaged');
      if (result.status !== 'packaged') {
        return;
      }
      expect(result.dismiss).toBe(false);
      expect(result.dismissSuppression).toBe('check_failed');
    });
  });

  // A hunt that did not complete may leave its report eligible, in which case a later sweep
  // hunts it again — into this same Investigation. Closing it here would mean those findings
  // land in a conversation already closed, so an unfinished run must not dismiss.
  it.each(['partial', 'failed'] as const)(
    'leaves the Investigation open when a no-hit run was %s',
    async (huntStatus) => {
      const result = await run({ huntStatus, hasConfirmedHit: false, attachments: [] });

      expect(result).toEqual({
        status: 'run_incomplete',
        reason: expect.stringContaining(huntStatus),
      });
    }
  );

  // Only reachable when the run said it confirmed a hit: the attachment should exist and
  // does not, so the sweep has to report itself partial rather than close the Investigation.
  it('returns run_incomplete when a confirmed hit has no current-run SSE', async () => {
    const result = await run({ attachments: [] });

    expect(result).toEqual({
      status: 'run_incomplete',
      reason: expect.stringContaining(runId),
    });
  });

  it('packages a clean run: dismiss, coverage written, no proposals', async () => {
    const result = await run({
      hasConfirmedHit: false,
      attachments: [sseAttachment({ hit: false })],
    });

    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    expect(result.dismiss).toBe(true);
    expect(result.dismissSuppression).toBe('none');
    expect(result.proposals).toEqual([]);
    expect(result.coverage.written.length).toBeGreaterThan(0);
  });

  it('packages a hit: one Forensics handoff per host, coverage written', async () => {
    const result = await run({
      attachments: [sseAttachment({ hit: true, hostNames: ['host-a', 'host-b'] })],
    });

    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    expect(result.dismiss).toBe(false);
    expect(result.proposals.map((p) => p.hostName)).toEqual(['host-a', 'host-b']);
    for (const proposal of result.proposals) {
      expect(proposal.actionWorkflowId).toBe(HUNT_HANDOFF_ACTION_WORKFLOW_ID);
      expect(proposal.actionInput).toMatchObject({
        investigation_id: conversationId,
        report_id: reportId,
        workflow_execution_id: runId,
      });
    }
    expect(result.mintSuppression).toBe('none');
    expect(result.coverage.written.length).toBeGreaterThan(0);
  });

  it('mints only a recommendation when the hit names no host', async () => {
    const result = await run({ attachments: [sseAttachment({ hit: true })] });

    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    expect(result.dismiss).toBe(false);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].actionWorkflowId).toBeUndefined();
    expect(result.proposals[0].title).toBe('Analyst recommendation');
  });

  // Phase 1 of the Proposals-side dedup Sergi/Astra raised: a rerun that lands back on an
  // Investigation that already has a Proposal (any status, including settled) must not mint a
  // second, independent chain for what may be the same finding.
  describe('existing-Proposals guard', () => {
    it('suppresses the mint when the Investigation already has a Proposal, but leaves it open', async () => {
      const result = await run({ deps: deps({ countExistingProposals: async () => 1 }) });

      expect(result.status).toBe('packaged');
      if (result.status !== 'packaged') {
        return;
      }
      expect(result.proposals).toEqual([]);
      expect(result.mintSuppression).toBe('existing_proposals');
      // Not a benign dismissal: this run found a real hit, so the Investigation has to stay
      // open for the analyst the summary tells to go review the existing Proposal.
      expect(result.dismiss).toBe(false);
    });

    // Fails closed: a lookup failure must never risk letting a duplicate mint through. But it
    // is not "a Proposal already exists" either, so the two stay distinguishable in the output.
    it('fails closed when the lookup itself throws, and marks it as a check failure', async () => {
      const result = await run({
        deps: deps({
          countExistingProposals: async () => {
            throw new Error('proposals index unavailable');
          },
        }),
      });

      expect(result.status).toBe('packaged');
      if (result.status !== 'packaged') {
        return;
      }
      expect(result.proposals).toEqual([]);
      expect(result.mintSuppression).toBe('check_failed');
      expect(result.dismiss).toBe(false);
    });

    it('never suppresses a mint on a clean run: there is nothing to suppress', async () => {
      const countExistingProposals = jest.fn(async () => 0);
      const result = await run({
        hasConfirmedHit: false,
        attachments: [sseAttachment({ hit: false })],
        deps: deps({ countExistingProposals }),
      });

      expect(result.status).toBe('packaged');
      if (result.status !== 'packaged') {
        return;
      }
      expect(result.dismiss).toBe(true);
      expect(result.mintSuppression).toBe('none');
      // One lookup, for the close decision, never a second for a mint that cannot happen.
      expect(countExistingProposals).toHaveBeenCalledTimes(1);
    });
  });
});
