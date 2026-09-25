/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { buildHuntInvestigationConversationId } from '../../services/watches/hunt/common/hunt_investigation_id';
import { PackageReportIdentityError, runPackageReport } from './run_package_report';
import { createCoverageWriter } from './package_report_step';
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
                per_index: [{ index: 'logs-endpoint.events*', hit_count: 1, required: true }],
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
                per_index: [{ index: 'logs-endpoint.events*', hit_count: 0, required: true }],
                resolved_iocs: [],
              },
            },
      },
    },
  ],
});

const deps = (
  overrides: Partial<RunPackageReportDeps> = {}
): RunPackageReportDeps => ({
  listRespondActions: async () => ({ ok: true, actions: [isolateHost] }),
  writeCoverageKis: async (subjects) => ({
    written: subjects.map((s) => ({ kiId: s.kiId, subject: s.subject })),
    skipped: [],
  }),
  patchExpectedProposalCount: async () => undefined,
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
        attachments: [sseAttachment({ hit: true, hostName: 'h1' })],
        deps: deps(),
      })
    ).rejects.toBeInstanceOf(PackageReportIdentityError);
  });

  it('returns run_incomplete when no current-run SSE exists', async () => {
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      attachments: [],
      deps: deps(),
    });
    expect(result).toEqual({
      status: 'run_incomplete',
      reason: expect.stringContaining(runId),
    });
  });

  it('packages a clean run: dismiss, coverage written, no proposals', async () => {
    const patchExpectedProposalCount = jest.fn();
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      attachments: [sseAttachment({ hit: false })],
      deps: deps({ patchExpectedProposalCount }),
    });
    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    expect(result.dismiss).toBe(true);
    expect(result.proposals).toEqual([]);
    expect(result.expectedProposalCount).toBe(0);
    expect(result.coverage.written.length).toBeGreaterThan(0);
    expect(patchExpectedProposalCount).not.toHaveBeenCalled();
  });

  it('packages a hit: mints proposals, commits expected count, writes coverage', async () => {
    const patchExpectedProposalCount = jest.fn();
    const result = await runPackageReport({
      spaceId: 'default',
      reportId,
      investigationConversationId: conversationId,
      runId,
      attachments: [sseAttachment({ hit: true, hostName: 'host-a' })],
      deps: deps({ patchExpectedProposalCount }),
    });
    expect(result.status).toBe('packaged');
    if (result.status !== 'packaged') {
      return;
    }
    expect(result.dismiss).toBe(false);
    expect(result.proposals.length).toBe(1);
    expect(result.proposals[0].actionWorkflowId).toBe(isolateHost.workflowId);
    expect(result.expectedProposalCount).toBe(1);
    expect(patchExpectedProposalCount).toHaveBeenCalledWith({
      conversationId,
      expectedProposalCount: 1,
      runId,
    });
  });
});

describe('createCoverageWriter', () => {
  it('records disabled, denied, and storage_failure as distinct skip reasons', async () => {
    const disabled = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => false,
      getEsClient: () => ({
        get: jest.fn(),
        index: jest.fn(),
      }),
    });
    const disabledResult = await disabled([
      {
        kiId: 'ki-1',
        subject: 'rpt',
        title: 't',
        description: 'd',
        content: 'c',
      },
    ]);
    expect(disabledResult.skipped[0].reason).toBe('disabled');

    const denied = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => true,
      getEsClient: () => ({
        get: jest.fn().mockRejectedValue({ statusCode: 403 }),
        index: jest.fn(),
      }),
    });
    const deniedResult = await denied([
      {
        kiId: 'ki-2',
        subject: 'rpt',
        title: 't',
        description: 'd',
        content: 'c',
      },
    ]);
    expect(deniedResult.skipped[0].reason).toBe('denied');

    const storage = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => true,
      getEsClient: () => ({
        get: jest.fn().mockRejectedValue({ statusCode: 404 }),
        index: jest.fn().mockRejectedValue({ statusCode: 500 }),
      }),
    });
    const storageResult = await storage([
      {
        kiId: 'ki-3',
        subject: 'rpt',
        title: 't',
        description: 'd',
        content: 'c',
      },
    ]);
    expect(storageResult.skipped[0].reason).toBe('storage_failure');
  });
});
