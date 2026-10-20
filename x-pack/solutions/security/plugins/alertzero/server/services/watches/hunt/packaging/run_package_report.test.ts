/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { buildHuntInvestigationConversationId } from '../common/hunt_investigation_id';
import { buildHuntProposalId } from '../common/hunt_proposal_id';
import {
  PackageReportIdentityError,
  computeExpectedProposalCount,
  runPackageReport,
} from './run_package_report';
import type { RunPackageReportDeps } from './run_package_report';
import { buildProposalSubjectKey } from './decide_package_report';
import type { LiveProposal, ProposalSlot, WantedProposal } from './resolve_proposal_slot';
import type { CoverageSubject } from './types';

const reportId = 'rpt-package-1';
const conversationId = buildHuntInvestigationConversationId(reportId);
const runId = 'run-abc';

const isolateHost: ActionCatalogEntry = {
  workflowId: 'system-security-action-isolate-host',
  approvalPolicy: 'autonomy-dependent',
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
  approvalPolicy: 'autonomy-dependent',
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
  approvalPolicy: 'autonomy-dependent',
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

// An installed catalog can still carry the retired action; packaging must never fill it.
const staleSetAssetCriticality: ActionCatalogEntry = {
  workflowId: 'system-alertzero-action-set-asset-criticality',
  approvalPolicy: 'autonomy-dependent',
  name: 'Set asset criticality',
  category: 'respond',
  inputSchema: {
    type: 'object',
    properties: { id_field: { type: 'string' }, id_value: { type: 'string' } },
    required: ['id_field', 'id_value'],
  },
};

const sseAttachment = ({
  hit,
  hostName,
  hypothesis = 'test',
  userName,
}: {
  hit: boolean;
  hostName?: string;
  hypothesis?: string;
  userName?: string;
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
        entities: [
          ...(hostName ? [{ field: 'host.name', value: hostName }] : []),
          ...(userName ? [{ field: 'user.name', value: userName }] : []),
        ],
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

/** The subject key of "isolate host-a" as the default fixtures resolve it (agent `agent-1`). */
const isolateKey = buildProposalSubjectKey({
  subjectId: 'agent-1',
  actionWorkflowId: isolateHost.workflowId,
});

/** A live Proposal that another Investigation raised, which a finding can converge onto. */
const liveProposal = (overrides: Partial<LiveProposal> = {}): LiveProposal => ({
  proposalId: 'proposal-live',
  conversationId: 'conv-other',
  title: 'Isolate host',
  comment: 'Isolate host.',
  revision: 1,
  revisable: true,
  ...overrides,
});

const deps = (overrides: Partial<RunPackageReportDeps> = {}): RunPackageReportDeps => ({
  listRespondActions: async () => ({ ok: true, actions: [isolateHost] }),
  writeCoverageKis: async (subjects) => ({
    written: subjects.map((s) => ({ kiId: s.kiId, subject: s.reportId })),
    skipped: [],
  }),
  resolveHostEnrollment: async () => ({ enrolled: true, agentId: 'agent-1', capabilities: [] }),
  rehydrateProcessSelectors: async () => [],
  countExistingProposals: async () => 0,
  // Every subject is free by default, at the first generation, as it is in an empty space.
  resolveProposalSlot: async ({ subjectKey }) => ({
    kind: 'mint',
    proposalId: buildHuntProposalId({ spaceId: 'default', subjectKey, generation: 0 }),
  }),
  appendAlsoRaisedBy: async () => 'revised',
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

    it('does not claim actions were proposed when every finding converged onto an existing proposal', async () => {
      await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: true,
        attachments: [sseAttachment({ hit: true, hostName: 'h1' })],
        expectedSseCount: 1,
        deps: deps({
          writeCoverageKis,
          getEsReportContextClient,
          resolveProposalSlot: async () => ({ kind: 'converge', live: liveProposal() }),
        }),
      });

      expect(writeCoverageKis.mock.calls[0][0][0].investigationSummary).toContain(
        'Packaging: no new proposals, 1 already raised by another Investigation'
      );
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
    expect(result.converged).toEqual([]);
    // Created under the id derived from what it proposes, which is what lets a second run meet it.
    expect(result.proposals[0].proposalId).toBe(
      buildHuntProposalId({
        spaceId: 'default',
        subjectKey: result.proposals[0].subjectKey,
        generation: 0,
      })
    );
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
            iocMatched: false,
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

  it('proposes only the host action for an implicated user, and never changes its criticality', async () => {
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      huntStatus: 'success',
      hasConfirmedHit: true,
      expectedSseCount: 1,
      attachments: [sseAttachment({ hit: true, hostName: 'host-a', userName: 'dev-user' })],
      deps: deps({
        listRespondActions: async () => ({
          ok: true,
          actions: [isolateHost, staleSetAssetCriticality],
        }),
      }),
    });
    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    // The host action, then the recommendation that names the user a host action cannot reach.
    expect(result.proposals.map((p) => p.actionWorkflowId)).toEqual([
      isolateHost.workflowId,
      undefined,
    ]);
    expect(result.proposals[1].title).toBe('Analyst recommendation');
    expect(result.proposals[1].comment).toContain('Identity dev-user (user) is implicated');
    expect(result.expectedProposalCount).toBe(2);
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

  // Per-subject convergence, which replaces phase 1's blunt guard (an Investigation with any
  // Proposal, even a settled one, minted nothing). What decides now is whether a live Proposal
  // already holds *this* finding's subject, and it does not matter which Investigation raised it.
  describe('converging findings onto live proposals', () => {
    const hitRun = (depsOverrides: Partial<RunPackageReportDeps> = {}, attachment = {}) =>
      runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: true,
        attachments: [sseAttachment({ hit: true, hostName: 'host-a', ...attachment })],
        expectedSseCount: 1,
        deps: deps(depsOverrides),
      });

    const packaged = async (...args: Parameters<typeof hitRun>) => {
      const result = await hitRun(...args);
      if (result.status !== 'packaged') {
        throw new Error(`expected packaged, got ${result.status}`);
      }
      return result;
    };

    it('asks for each finding’s slot by its subject key and the action input it wants to run, once', async () => {
      const resolveProposalSlot = jest.fn(
        async ({ subjectKey }: WantedProposal): Promise<ProposalSlot> => ({
          kind: 'mint',
          proposalId: buildHuntProposalId({ spaceId: 'default', subjectKey, generation: 0 }),
        })
      );

      const result = await packaged({ resolveProposalSlot });

      expect(resolveProposalSlot.mock.calls.map(([wanted]) => wanted.subjectKey)).toEqual(
        result.proposals.map((proposal) => proposal.subjectKey)
      );
      // The input is what lets the resolver tell a proposal revised to act on something else from
      // one that still covers this finding.
      expect(resolveProposalSlot.mock.calls.map(([wanted]) => wanted.actionInput)).toEqual(
        result.proposals.map((proposal) => proposal.actionInput)
      );
    });

    it('mints under the id the slot gave, not a random one', async () => {
      const result = await packaged({
        resolveProposalSlot: async () => ({
          kind: 'mint',
          proposalId: '6f1a8c2e-2f47-5c4b-9a33-7d2a1b4e6c50',
        }),
      });

      expect(result.proposals.map((p) => p.proposalId)).toEqual([
        '6f1a8c2e-2f47-5c4b-9a33-7d2a1b4e6c50',
      ]);
    });

    it('mints nothing for a finding a live proposal already covers, and says where it went', async () => {
      const appendAlsoRaisedBy = jest.fn(async () => 'revised' as const);

      const result = await packaged({
        resolveProposalSlot: async () => ({ kind: 'converge', live: liveProposal() }),
        appendAlsoRaisedBy,
      });

      expect(result.proposals).toEqual([]);
      expect(result.converged).toEqual([
        {
          // What this run found, in its own words; the note below names the live proposal's.
          title: 'Isolate host host-a',
          proposalId: 'proposal-live',
          ownerConversationId: 'conv-other',
          outcome: 'revised',
          note: expect.stringContaining('conv-other'),
        },
      ]);
      expect(appendAlsoRaisedBy).toHaveBeenCalledWith({
        live: liveProposal(),
        investigationConversationId: conversationId,
      });
      expect(result.mintSuppression).toBe('none');
      // Not a benign dismissal: the finding is real and an analyst has yet to decide it.
      expect(result.dismiss).toBe(false);
    });

    it('converges the finding that matches and mints the one that is new', async () => {
      // The changed-finding rerun the coarse guard could not do: an Investigation that already
      // has a Proposal for one subject still gets its own for a different one.
      const live = liveProposal();
      const result = await packaged(
        {
          listRespondActions: async () => ({
            ok: true,
            actions: [isolateHost],
          }),
          resolveProposalSlot: async ({ subjectKey }) =>
            subjectKey === isolateKey
              ? { kind: 'converge', live }
              : {
                  kind: 'mint',
                  proposalId: buildHuntProposalId({
                    spaceId: 'default',
                    subjectKey,
                    generation: 0,
                  }),
                },
        },
        { userName: 'dev-user' }
      );

      expect(result.proposals.map((p) => p.actionWorkflowId)).toEqual([undefined]);
      expect(result.converged.map((c) => c.proposalId)).toEqual([live.proposalId]);
    });

    it('says nothing, and adds nothing, when the live proposal is this Investigation’s own', async () => {
      const appendAlsoRaisedBy = jest.fn(async () => 'same_investigation' as const);

      const result = await packaged({
        resolveProposalSlot: async () => ({
          kind: 'converge',
          live: liveProposal({ conversationId }),
        }),
        appendAlsoRaisedBy,
      });

      expect(result.proposals).toEqual([]);
      expect(result.converged).toEqual([]);
      // Reported by count instead, so the run's summary does not read as a dismissal while the
      // Investigation stays open on its own pending proposal.
      expect(result.alreadyOpenCount).toBe(1);
    });

    it('writes a summary that says the finding is already open here, not that the run was dismissed', async () => {
      const writeCoverageKis = jest.fn(async (subjects: CoverageSubject[]) => ({
        written: subjects.map((s) => ({ kiId: s.kiId, subject: s.reportId })),
        skipped: [],
      }));

      await packaged({
        writeCoverageKis,
        resolveProposalSlot: async () => ({
          kind: 'converge',
          live: liveProposal({ conversationId }),
        }),
        appendAlsoRaisedBy: async () => 'same_investigation',
      });

      const summary = writeCoverageKis.mock.calls[0][0][0].investigationSummary;
      expect(summary).toContain(
        'Packaging: no new proposals, 1 already open on this Investigation'
      );
      expect(summary).not.toContain('dismissed');
    });

    it('does not count what converged onto another Investigation as already open here', async () => {
      const result = await packaged({
        resolveProposalSlot: async () => ({ kind: 'converge', live: liveProposal() }),
      });

      expect(result.converged).toHaveLength(1);
      expect(result.alreadyOpenCount).toBe(0);
    });

    it('still converges when the revision fails, and does not claim it was added', async () => {
      const result = await packaged({
        resolveProposalSlot: async () => ({ kind: 'converge', live: liveProposal() }),
        appendAlsoRaisedBy: async () => 'failed',
      });

      expect(result.proposals).toEqual([]);
      expect(result.converged[0].outcome).toBe('failed');
      expect(result.converged[0].note).not.toContain('added to it');
    });

    it('settles the Investigation only against what this run mints, never what converged', async () => {
      // 2 Proposals already on this Investigation, 1 minted now, and another finding that
      // converged onto another Investigation's: the gate's all-time count has to reach 2 + 1.
      // The converged one lives in the other Investigation's conversation, so it adds nothing.
      const result = await packaged(
        {
          listRespondActions: async () => ({
            ok: true,
            actions: [isolateHost],
          }),
          countExistingProposals: async () => 2,
          resolveProposalSlot: async ({ subjectKey }) =>
            subjectKey === isolateKey
              ? { kind: 'converge', live: liveProposal() }
              : {
                  kind: 'mint',
                  proposalId: buildHuntProposalId({
                    spaceId: 'default',
                    subjectKey,
                    generation: 0,
                  }),
                },
        },
        { userName: 'dev-user' }
      );

      expect(result.proposals).toHaveLength(1);
      expect(result.expectedProposalCount).toBe(2 + 1);
    });

    describe('when it cannot tell what already exists', () => {
      it('fails closed when the slot lookup throws: mints nothing, converges nothing', async () => {
        const result = await packaged({
          resolveProposalSlot: async () => {
            throw new Error('proposals index unavailable');
          },
        });

        expect(result.proposals).toEqual([]);
        expect(result.converged).toEqual([]);
        expect(result.expectedProposalCount).toBe(0);
        expect(result.mintSuppression).toBe('check_failed');
        expect(result.dismiss).toBe(false);
      });

      it('fails closed when the baseline count throws, without looking up any slot', async () => {
        const resolveProposalSlot = jest.fn();

        const result = await packaged({
          countExistingProposals: async () => {
            throw new Error('proposals index unavailable');
          },
          resolveProposalSlot,
        });

        expect(result.proposals).toEqual([]);
        expect(result.mintSuppression).toBe('check_failed');
        expect(resolveProposalSlot).not.toHaveBeenCalled();
      });

      it('a lookup that fails after one finding converged still mints nothing', async () => {
        let calls = 0;
        const result = await packaged(
          {
            listRespondActions: async () => ({
              ok: true,
              actions: [isolateHost],
            }),
            resolveProposalSlot: async () => {
              calls += 1;
              if (calls === 1) {
                return { kind: 'converge', live: liveProposal() };
              }
              throw new Error('boom');
            },
          },
          { userName: 'dev-user' }
        );

        expect(result.mintSuppression).toBe('check_failed');
        expect(result.proposals).toEqual([]);
        expect(result.converged).toEqual([]);
        expect(result.alreadyOpenCount).toBe(0);
      });
    });

    it('never looks anything up on a clean run: there is nothing to propose', async () => {
      const countExistingProposals = jest.fn(async () => 1);
      const resolveProposalSlot = jest.fn();
      const result = await runPackageReport({
        spaceId: 'default',
        reportId,
        investigationConversationId: conversationId,
        runId,
        huntStatus: 'success',
        hasConfirmedHit: false,
        attachments: [sseAttachment({ hit: false })],
        expectedSseCount: 1,
        deps: deps({ countExistingProposals, resolveProposalSlot }),
      });
      expect(result.status).toBe('packaged');
      if (result.status !== 'packaged') {
        return;
      }
      expect(result.dismiss).toBe(true);
      expect(result.mintSuppression).toBe('none');
      expect(countExistingProposals).not.toHaveBeenCalled();
      expect(resolveProposalSlot).not.toHaveBeenCalled();
    });
  });

  // The settlement barrier's arithmetic, tested directly: the baseline is every Proposal the
  // Investigation already carries, because the gate's `created_count` is its all-time total, and
  // this run adds only what it mints. A rerun that mints a new Proposal beside older ones is the
  // case it exists for.
  describe('computeExpectedProposalCount', () => {
    it("sums the pre-run baseline and this run's new proposals", () => {
      expect(
        computeExpectedProposalCount({
          mintSuppression: 'none',
          existingProposalCount: 4,
          newProposalCount: 3,
        })
      ).toBe(7);
    });

    it('is the baseline alone when this run mints nothing', () => {
      expect(
        computeExpectedProposalCount({
          mintSuppression: 'none',
          existingProposalCount: 4,
          newProposalCount: 0,
        })
      ).toBe(4);
    });

    it('is 0 when the Proposals look-up failed, regardless of baseline', () => {
      expect(
        computeExpectedProposalCount({
          mintSuppression: 'check_failed',
          existingProposalCount: 4,
          newProposalCount: 0,
        })
      ).toBe(0);
    });
  });
});
