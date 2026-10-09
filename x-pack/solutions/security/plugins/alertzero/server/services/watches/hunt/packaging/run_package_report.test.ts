/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { buildHuntInvestigationConversationId } from '../common/hunt_investigation_id';
import {
  PackageReportIdentityError,
  computeExpectedProposalCount,
  runPackageReport,
} from './run_package_report';
import type { RunPackageReportDeps } from './run_package_report';
import type { CoverageSubject } from './types';

const reportId = 'rpt-package-1';
const conversationId = buildHuntInvestigationConversationId(reportId);
const runId = 'run-abc';

const isolateHost: ActionCatalogEntry = {
  workflowId: 'system-security-action-isolate-host',
  name: 'Isolate host',
  category: 'respond',
  inputSchema: {
    type: 'object',
    properties: {
      endpoint_ids: { type: 'array', items: { type: 'string' } },
    },
    required: ['endpoint_ids'],
  },
};

const killProcess: ActionCatalogEntry = {
  workflowId: 'system-security-action-kill-process',
  name: 'Kill process',
  category: 'respond',
  inputSchema: {
    type: 'object',
    properties: {
      endpoint_ids: { type: 'array', items: { type: 'string' } },
      parameters: { type: 'object' },
    },
    required: ['endpoint_ids', 'parameters'],
  },
};

const suspendProcess: ActionCatalogEntry = {
  workflowId: 'system-security-action-suspend-process',
  name: 'Suspend process',
  category: 'respond',
  inputSchema: {
    type: 'object',
    properties: {
      endpoint_ids: { type: 'array', items: { type: 'string' } },
      parameters: { type: 'object' },
    },
    required: ['endpoint_ids', 'parameters'],
  },
};

const sseAttachment = ({
  hit,
  hostName,
  hypothesis = 'test',
}: {
  hit: boolean;
  hostName?: string;
  hypothesis?: string;
}): VersionedAttachment => ({
  id: 'sse-1',
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
        entities: hostName ? [{ field: 'host.name', value: hostName }] : [],
        timeline: [],
        hypothesis_tested: hypothesis,
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
  listRespondActions: async () => ({ ok: true, actions: [isolateHost] }),
  writeCoverageKis: async (subjects) => ({
    written: subjects.map((s) => ({ kiId: s.kiId, subject: s.reportId })),
    skipped: [],
  }),
  resolveHostEnrollment: async () => ({ enrolled: true, agentId: 'agent-1' }),
  rehydrateProcessSelectors: async () => [],
  countExistingProposals: async () => 0,
  hasOpenProposal: async () => false,
  ...overrides,
});

describe('runPackageReport', () => {
  it('rejects identity binding mismatches', async () => {
    await expect(
      runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: 'wrong-id',
        runId,
        huntStatus: 'success',
        hasConfirmedHit: true,
        attachments: [sseAttachment({ hit: true, hostName: 'h1' })],
        expectedSseCount: 1,
        deps: deps(),
      })
    ).rejects.toBeInstanceOf(PackageReportIdentityError);
  });

  // A hunt that confirmed no hit writes no SSE attachment at all, so this is the shape of
  // every no-hit run in production, not an edge case. It must close the Investigation.
  it('packages a completed no-hit run as a dismissal', async () => {
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      huntStatus: 'success',
      hasConfirmedHit: false,
      attachments: [],
      expectedSseCount: 0,
      deps: deps(),
    });

    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    expect(result.dismiss).toBe(true);
    expect(result.proposals).toEqual([]);
    expect(result.expectedProposalCount).toBe(0);
    expect(result.closureSummary).toContain('no confirmed hits');
    expect(result.mintSuppression).toBe('none');
    // The coordinator never emits an SSE for a clean run, so this is the real clean path --
    // not the synthetic clean-with-SSE case below -- and it must still write coverage.
    expect(result.coverage.written.length).toBeGreaterThan(0);
    expect(result.coverage.skipped).toEqual([]);
  });

  describe('coverage subjects', () => {
    const writeCoverageKis = jest.fn(async (subjects: CoverageSubject[]) => ({
      written: subjects.map((s) => ({ kiId: s.kiId, subject: s.reportId })),
      skipped: [],
    }));
    const getEsReportContextClient = jest.fn(() => ({
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                content: { title: 'CloudTrail brief', body_text: 'AssumeRole into a shadow role.' },
                severity: { level: 'medium' },
              },
            },
          ],
        },
      }),
    }));

    beforeEach(() => {
      writeCoverageKis.mockClear();
      getEsReportContextClient.mockClear();
    });

    const cleanRun = () =>
      runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: false,
        attachments: [],
        expectedSseCount: 0,
        coordinator: {
          reportIntentTargets: ['logs-aws.cloudtrail-*'],
          behaviors: [
            {
              technique_id: 'T1110.003',
              technique_name: 'Password Spraying',
              confidence: 0.9,
              validated_esql: 'FROM logs-aws.cloudtrail-* | LIMIT 25',
              execution: { executed: true, row_count: 0, hit: false },
            },
          ],
        },
        deps: deps({ writeCoverageKis, getEsReportContextClient }),
      });

    it('writes a report-scoped subject and one per executed technique on a clean run', async () => {
      await cleanRun();

      expect(writeCoverageKis.mock.calls[0][0].map((s) => s.technique)).toEqual([
        undefined,
        'T1110.003',
      ]);
    });

    it('derives a clean run data source from the coordinator inputs', async () => {
      await cleanRun();

      expect(writeCoverageKis.mock.calls[0][0][0].dataSources).toEqual(['logs-aws.cloudtrail-*']);
    });

    it('carries the executed query on a clean run', async () => {
      await cleanRun();

      expect(writeCoverageKis.mock.calls[0][0][0].esqlStatus).toBe('executed_no_rows');
    });

    it('does not load the report on a hit when the finding has a hypothesis', async () => {
      await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: true,
        attachments: [sseAttachment({ hit: true, hostName: 'h1' })],
        expectedSseCount: 1,
        deps: deps({ writeCoverageKis, getEsReportContextClient }),
      });

      expect(getEsReportContextClient).not.toHaveBeenCalled();
    });

    it('loads the report on a hit when the finding only has the generic hypothesis', async () => {
      await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: true,
        attachments: [
          sseAttachment({
            hit: true,
            hostName: 'h1',
            hypothesis: 'Hunt Watch evaluated report rpt against the environment.',
          }),
        ],
        expectedSseCount: 1,
        deps: deps({ writeCoverageKis, getEsReportContextClient }),
      });

      expect(getEsReportContextClient).toHaveBeenCalledTimes(1);
    });

    it('keeps the SSE severity on a hit even when the report is loaded and has its own', async () => {
      await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: true,
        attachments: [
          sseAttachment({
            hit: true,
            hostName: 'h1',
            hypothesis: 'Hunt Watch evaluated report rpt against the environment.',
          }),
        ],
        expectedSseCount: 1,
        deps: deps({ writeCoverageKis, getEsReportContextClient }),
      });

      expect(getEsReportContextClient).toHaveBeenCalledTimes(1);
      const [subjects] = writeCoverageKis.mock.calls[0];
      expect(subjects.map((subject) => subject.severity)).toEqual(subjects.map(() => 'high'));
    });

    it('keeps the full investigation summary on the written subjects', async () => {
      await cleanRun();

      expect(writeCoverageKis.mock.calls[0][0][0].investigationSummary).toContain(
        'Behaviors executed: Password Spraying (T1110.003) (0 rows)'
      );
    });
  });

  // A hunt that did not complete may leave its report eligible, in which case a later sweep
  // hunts it again — into this same Investigation. Closing it here would mean those findings
  // land in a conversation already closed, so an unfinished run must not dismiss.
  it.each(['partial', 'failed'] as const)(
    'leaves the Investigation open when a no-hit run was %s',
    async (huntStatus) => {
      const result = await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus,
        hasConfirmedHit: false,
        attachments: [],
        expectedSseCount: 0,
        deps: deps(),
      });

      expect(result).toEqual({
        status: 'run_incomplete',
        reason: expect.stringContaining(huntStatus),
      });
    }
  );

  // Only reachable when the run said it confirmed a hit: the attachment should exist and
  // does not, so the sweep has to report itself partial rather than close the Investigation.
  it('returns run_incomplete when a confirmed hit has no current-run SSE', async () => {
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      huntStatus: 'success',
      hasConfirmedHit: true,
      attachments: [],
      expectedSseCount: 1,
      deps: deps(),
    });
    expect(result).toEqual({
      status: 'run_incomplete',
      reason: expect.stringContaining(runId),
    });
  });

  // `attach_sse`'s foreach swallows a per-item attach failure with `continue`, so a shortfall
  // leaves a non-empty but incomplete current-run state -- the gap the all-missing case above
  // cannot see. This must not package off the findings that did land; the dropped one would
  // never get a proposal or a retry.
  it('returns run_incomplete when fewer current-run SSEs are found than the hunt prepared', async () => {
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      huntStatus: 'success',
      hasConfirmedHit: true,
      attachments: [sseAttachment({ hit: true, hostName: 'host-a' })],
      expectedSseCount: 2,
      deps: deps(),
    });
    expect(result).toEqual({
      status: 'run_incomplete',
      reason: expect.stringContaining('1'),
    });
  });

  // An already-installed Worker that has not yet picked up the call site supplying this field
  // (its `yamlTemplate` hash does not cover the imported YAML it renders, so it only updates
  // once its own `version` bumps) must not have its packaging calls start erroring just because
  // this step's schema grew a field it does not send -- that would turn a staleness gap into an
  // outage. Omitting the field has to behave exactly as it did before this check existed.
  it('skips the shortfall check when expectedSseCount is omitted', async () => {
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      huntStatus: 'success',
      hasConfirmedHit: true,
      attachments: [sseAttachment({ hit: true, hostName: 'host-a' })],
      expectedSseCount: undefined,
      deps: deps(),
    });
    expect(result.status).toBe('packaged');
  });

  it('packages a clean run: dismiss, coverage written, no proposals', async () => {
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      huntStatus: 'success',
      hasConfirmedHit: false,
      attachments: [sseAttachment({ hit: false })],
      expectedSseCount: 1,
      deps: deps(),
    });
    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    expect(result.dismiss).toBe(true);
    expect(result.proposals).toEqual([]);
    expect(result.expectedProposalCount).toBe(0);
    expect(result.coverage.written.length).toBeGreaterThan(0);
  });

  it('packages a hit: mints proposals, commits expected count, writes coverage', async () => {
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      huntStatus: 'success',
      hasConfirmedHit: true,
      attachments: [sseAttachment({ hit: true, hostName: 'host-a' })],
      expectedSseCount: 1,
      deps: deps(),
    });
    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    expect(result.dismiss).toBe(false);
    expect(result.proposals.length).toBe(1);
    expect(result.proposals[0].actionWorkflowId).toBe(isolateHost.workflowId);
    expect(result.expectedProposalCount).toBe(1);
    expect(result.mintSuppression).toBe('none');
  });

  it('mints only a recommendation when Fleet is unavailable (no host resolves as enrolled)', async () => {
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      huntStatus: 'success',
      hasConfirmedHit: true,
      attachments: [sseAttachment({ hit: true, hostName: 'host-a' })],
      expectedSseCount: 1,
      deps: deps({ resolveHostEnrollment: async () => ({ enrolled: false }) }),
    });
    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    expect(result.dismiss).toBe(false);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].actionWorkflowId).toBeUndefined();
    expect(result.proposals[0].title).toBe('Analyst recommendation');
    expect(result.proposals[0].comment).toContain('host-a');
  });

  it('mints kill-process and suspend-process from a rehydrated, host-scoped process selector', async () => {
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      huntStatus: 'success',
      hasConfirmedHit: true,
      attachments: [sseAttachment({ hit: true, hostName: 'host-a' })],
      expectedSseCount: 1,
      deps: deps({
        listRespondActions: async () => ({ ok: true, actions: [killProcess, suspendProcess] }),
        rehydrateProcessSelectors: async () => [
          {
            entityId: 'ent-abc',
            processKey: 'entity_id:ent-abc',
            hostName: 'host-a',
            processName: 'powershell.exe',
            observedAt: '2026-09-26T10:00:00.000Z',
          },
        ],
      }),
    });
    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals.map((p) => p.actionWorkflowId).sort()).toEqual(
      [killProcess.workflowId, suspendProcess.workflowId].sort()
    );
    for (const proposal of result.proposals) {
      expect(proposal.hostName).toBe('host-a');
      expect(proposal.actionInput?.parameters).toEqual({ entity_id: 'ent-abc' });
      expect(proposal.actionInput?.endpoint_ids).toEqual(['agent-1']);
    }
  });

  describe('open-Proposal dismiss guard', () => {
    const cleanRun = (hasOpenProposal: RunPackageReportDeps['hasOpenProposal']) =>
      runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: false,
        attachments: [],
        expectedSseCount: 0,
        deps: deps({ hasOpenProposal }),
      });

    it('dismisses a clean run when no Proposal is open', async () => {
      const result = await cleanRun(async () => false);
      expect(result.status === 'packaged' && result.dismiss).toBe(true);
      expect(result.status === 'packaged' && result.dismissHold).toBe('none');
    });

    it('holds a clean run open when a Proposal is still pending or executing', async () => {
      const result = await cleanRun(async () => true);
      expect(result.status).toBe('packaged');
      if (result.status !== 'packaged') {
        return;
      }
      expect(result.dismiss).toBe(false);
      expect(result.dismissHold).toBe('open_proposal');
      // The step output must not claim a closure that did not happen.
      expect(result.closureSummary).not.toContain('Closing');
      expect(result.closureSummary).toContain('Leaving the Investigation open');
      expect(result.proposals).toEqual([]);
      expect(result.expectedProposalCount).toBe(0);
      // Coverage is still recorded: the hunt did look.
      expect(result.coverage.written.length).toBeGreaterThan(0);
    });

    it('fails closed when the open-Proposal lookup throws', async () => {
      const result = await cleanRun(async () => {
        throw new Error('boom');
      });
      expect(result.status === 'packaged' && result.dismiss).toBe(false);
      expect(result.status === 'packaged' && result.dismissHold).toBe('check_failed');
    });

    it('holds the decided clean-with-SSE dismissal too', async () => {
      const result = await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: false,
        attachments: [sseAttachment({ hit: false })],
        expectedSseCount: 1,
        deps: deps({ hasOpenProposal: async () => true }),
      });
      expect(result.status === 'packaged' && result.dismiss).toBe(false);
      expect(result.status === 'packaged' && result.dismissHold).toBe('open_proposal');
    });

    it('does not look up open Proposals for a run that is not a dismissal', async () => {
      const hasOpenProposal = jest.fn().mockResolvedValue(true);
      const result = await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: true,
        attachments: [sseAttachment({ hit: true, hostName: 'host-a' })],
        expectedSseCount: 1,
        deps: deps({ hasOpenProposal }),
      });
      expect(hasOpenProposal).not.toHaveBeenCalled();
      expect(result.status === 'packaged' && result.dismissHold).toBe('none');
    });
  });

  // Phase 1 of the Proposals-side dedup Sergi/Astra raised: a rerun that lands back on an
  // Investigation that already has a Proposal (any status, including settled) must not mint a
  // second, independent chain for what may be the same finding.
  describe('existing-Proposals guard', () => {
    it('suppresses the mint when the Investigation already has a Proposal, but leaves it open', async () => {
      const result = await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: true,
        attachments: [sseAttachment({ hit: true, hostName: 'host-a' })],
        expectedSseCount: 1,
        deps: deps({ countExistingProposals: async () => 1 }),
      });
      expect(result.status).toBe('packaged');
      if (result.status !== 'packaged') {
        return;
      }
      expect(result.proposals).toEqual([]);
      expect(result.expectedProposalCount).toBe(0);
      expect(result.mintSuppression).toBe('existing_proposals');
      // Not a benign dismissal: this run found a real hit, so the Investigation has to stay
      // open for the analyst the summary tells to go review the existing Proposal.
      expect(result.dismiss).toBe(false);
    });

    // Fails closed: a lookup failure must never risk letting a duplicate mint through. But it
    // is not "a Proposal already exists" either, so the two stay distinguishable in the output.
    it('fails closed when the lookup itself throws, and marks it as a check failure', async () => {
      const result = await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: true,
        attachments: [sseAttachment({ hit: true, hostName: 'host-a' })],
        expectedSseCount: 1,
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
      expect(result.expectedProposalCount).toBe(0);
      expect(result.mintSuppression).toBe('check_failed');
      expect(result.dismiss).toBe(false);
    });

    it('never looks up existing Proposals on a clean run: there is nothing to suppress', async () => {
      const countExistingProposals = jest.fn(async () => 1);
      const result = await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: false,
        attachments: [sseAttachment({ hit: false })],
        expectedSseCount: 1,
        deps: deps({ countExistingProposals }),
      });
      expect(result.status).toBe('packaged');
      if (result.status !== 'packaged') {
        return;
      }
      expect(result.dismiss).toBe(true);
      expect(result.mintSuppression).toBe('none');
      expect(countExistingProposals).not.toHaveBeenCalled();
    });

    // A nonzero baseline always means the guard above suppressed this run's mint, so
    // expectedProposalCount stays 0 along with proposals -- see the `computeExpectedProposalCount`
    // suite below for the formula itself, including the `existingProposalCount > 0` +
    // `mintSuppression: 'none'` combination this guard currently never lets through.
    it('reports no expected count when a nonzero baseline suppresses the mint', async () => {
      const result = await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: true,
        attachments: [sseAttachment({ hit: true, hostName: 'host-a' })],
        expectedSseCount: 1,
        deps: deps({ countExistingProposals: async () => 4 }),
      });
      expect(result.status).toBe('packaged');
      if (result.status !== 'packaged') {
        return;
      }
      expect(result.proposals).toEqual([]);
      expect(result.mintSuppression).toBe('existing_proposals');
      expect(result.expectedProposalCount).toBe(0);
    });
  });

  // `runPackageReport` can never reach `computeExpectedProposalCount` with a nonzero
  // `existingProposalCount` and `mintSuppression: 'none'` together today -- the existing-Proposals
  // guard above suppresses minting entirely whenever any Proposal already exists. Tested directly
  // here, independent of that coupling, because the formula is the fix for
  // elastic/security-team#19822's future (the coarse guard is explicitly temporary) and has to stay
  // correct even while nothing in this file's own integration tests can exercise it end to end.
  describe('computeExpectedProposalCount', () => {
    it("sums the pre-run baseline and this run's new proposals when not suppressed", () => {
      expect(
        computeExpectedProposalCount({
          mintSuppression: 'none',
          existingProposalCount: 4,
          newProposalCount: 3,
        })
      ).toBe(7);
    });

    it('is 0 when minting was suppressed, regardless of baseline', () => {
      expect(
        computeExpectedProposalCount({
          mintSuppression: 'existing_proposals',
          existingProposalCount: 4,
          newProposalCount: 0,
        })
      ).toBe(0);
    });

    it('is 0 when the existing-Proposals check itself failed', () => {
      expect(
        computeExpectedProposalCount({
          mintSuppression: 'check_failed',
          existingProposalCount: 0,
          newProposalCount: 0,
        })
      ).toBe(0);
    });
  });
});
