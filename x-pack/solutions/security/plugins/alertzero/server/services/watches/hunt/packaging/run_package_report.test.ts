/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { buildHuntInvestigationConversationId } from '../common/hunt_investigation_id';
import { PackageReportIdentityError, runPackageReport } from './run_package_report';
import type { RunPackageReportDeps } from './run_package_report';

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
}: {
  hit: boolean;
  hostName?: string;
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
                    confirming: true,
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
                    confirming: true,
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
      deps: deps(),
    });
    expect(result).toEqual({
      status: 'run_incomplete',
      reason: expect.stringContaining(runId),
    });
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
      deps: deps({
        listRespondActions: async () => ({ ok: true, actions: [killProcess, suspendProcess] }),
        rehydrateProcessSelectors: async () => [
          {
            entityId: 'ent-abc',
            processKey: 'entity_id:ent-abc',
            hostName: 'host-a',
            summary: 'powershell.exe (entity_id ent-abc) observed 2026-09-26T10:00:00.000Z',
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
});
