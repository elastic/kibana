/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { readCurrentRunState } from './read_current_run_state';

const reportId = 'rpt-package-1';
const runId = 'run-abc';

const sseAttachment = ({
  actionableIndices,
  events,
  attachmentId = 'sse-1',
  title = 'Test SSE',
  evidenceFor = ['Tier 1 hit'],
  tier1TotalHits = 1,
  tier2Behaviors = [],
  techniqueIds = ['T1078.004'],
  techniqueLabels = [],
  hypothesis = 'test',
  userNames = [],
  tier2Targets,
  severity = 'high',
  corroboratedTechniqueId,
  entities = [
    { field: 'host.name', value: 'host-a' },
    ...userNames.map((value) => ({ field: 'user.name', value })),
  ],
}: {
  actionableIndices?: string[];
  events?: Array<{
    event_id: string;
    source_index: string;
    matched?: { technique_id: string; field: string };
  }>;
  attachmentId?: string;
  title?: string;
  evidenceFor?: string[];
  tier1TotalHits?: number;
  entities?: Array<{ field: string; value: string }>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  tier2Behaviors?: Array<{
    technique_id: string;
    technique_name?: string;
    row_count: number;
    hit?: boolean;
    validated_esql?: string;
  }>;
  /** Technique SKIs this entry lists, proposed or corroborated. */
  techniqueIds?: string[];
  /** Technique SKI values in `T1078.004 (Cloud Accounts)` form, the technique-name source. */
  techniqueLabels?: string[];
  hypothesis?: string;
  userNames?: string[];
  tier2Targets?: string[];
  /**
   * Mirrors `sse_mapper`'s `corroborated_technique_id`: set only on an entry scoped to a
   * technique the run actually corroborated, never on the report-scoped fallback entry.
   */
  corroboratedTechniqueId?: string;
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
        title,
        severity,
        confidence: 0.9,
        status: 'open',
        source_watch: 'system-security-hunt-continuous-threat-hunt',
        capability: 'continuous_threat_hunt',
        run_id: runId,
        report_id: reportId,
        ...(corroboratedTechniqueId ? { corroborated_technique_id: corroboratedTechniqueId } : {}),
        security_knowledge_indicators: [
          ...techniqueIds.map((techniqueId) => ({
            type: 'technique' as const,
            value: techniqueId,
            technique_id: techniqueId,
          })),
          ...techniqueLabels.map((label) => ({
            type: 'technique' as const,
            value: label,
            technique_id: label.split(' ')[0],
          })),
        ],
        entities,
        events: events ?? [
          {
            event_id: 'evt-1',
            source_index: '.ds-logs-endpoint.events.process-default-2026.09.25-000001',
          },
        ],
        timeline: [],
        hypothesis_tested: hypothesis,
        evidence_for: evidenceFor,
        evidence_against: [],
        evaluation_record_ref: 'eval-1',
        hunt_result: {
          has_confirmed_hit: true,
          hit_sources: ['tier1'],
          time_range: {
            from: '2026-09-25T00:00:00.000Z',
            to: '2026-09-25T01:00:00.000Z',
          },
          tier1: {
            status: 'environment_hits_found',
            counts: {
              total_hits: tier1TotalHits,
              returned_hits: tier1TotalHits,
              affected_hosts: 1,
              affected_users: 0,
            },
            per_index: [
              {
                index: '.ds-logs-endpoint.events.process-default-2026.09.25-000001',
                hit_count: tier1TotalHits,
                required: true,
              },
            ],
            resolved_iocs: [],
          },
          ...(tier2Behaviors.length > 0
            ? {
                tier2: {
                  status: 'behaviors_proposed',
                  behaviors: tier2Behaviors.map((behavior) => ({
                    technique_id: behavior.technique_id,
                    technique_name: behavior.technique_name,
                    tactic_ids: [],
                    confidence: 0.8,
                    title: `Hunted ${behavior.technique_id}`,
                    ...(behavior.validated_esql ? { validated_esql: behavior.validated_esql } : {}),
                    execution: {
                      executed: true,
                      row_count: behavior.row_count,
                      hit: behavior.hit ?? true,
                    },
                  })),
                },
              }
            : {}),
          ...(tier2Targets ? { tier2_targets: tier2Targets } : {}),
          ...(actionableIndices !== undefined
            ? { actionable_indices: actionableIndices }
            : { actionable_indices: ['logs-endpoint.events.process-*'] }),
        },
      },
    },
  ],
});

describe('readCurrentRunState', () => {
  const resolveHostEnrollment = async () => ({ enrolled: true as const, agentId: 'agent-1' });
  const rehydrateProcessSelectors = async () => [];

  it('matches a .ds- backing event index against a *-suffixed actionable pattern', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({
          actionableIndices: ['logs-endpoint.events.process-*'],
          events: [
            {
              event_id: 'evt-1',
              source_index: '.ds-logs-endpoint.events.process-default-2026.09.25-000001',
            },
          ],
        }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.allEventsActionable).toBe(true);
    expect(state?.hasProcessBearingEvent).toBe(true);
  });

  it('treats an empty actionable list as not host-scoped when events exist', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({
          actionableIndices: [],
          events: [
            {
              event_id: 'evt-1',
              source_index: '.ds-logs-endpoint.events.process-default-2026.09.25-000001',
            },
          ],
        }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.allEventsActionable).toBe(false);
    expect(state?.hasProcessBearingEvent).toBe(false);
  });

  it('unions actionable_indices across current-run SSEs', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({
          attachmentId: 'sse-aws',
          actionableIndices: ['logs-aws.cloudtrail-*'],
          events: [
            {
              event_id: 'evt-aws',
              source_index: '.ds-logs-aws.cloudtrail-default-2026.09.25-000001',
            },
          ],
        }),
        sseAttachment({
          attachmentId: 'sse-endpoint',
          actionableIndices: ['logs-endpoint.events.process-*'],
          events: [
            {
              event_id: 'evt-endpoint',
              source_index: '.ds-logs-endpoint.events.process-default-2026.09.25-000001',
            },
          ],
        }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.allEventsActionable).toBe(true);
    expect(state?.hasProcessBearingEvent).toBe(true);
  });

  it('is host-scoped when there are no event refs', async () => {
    const state = await readCurrentRunState({
      attachments: [sseAttachment({ actionableIndices: [], events: [] })],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.allEventsActionable).toBe(true);
    expect(state?.hasProcessBearingEvent).toBe(false);
  });

  it('counts current-run SSE attachments actually matched, for the packaging shortfall check', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({ attachmentId: 'sse-1' }),
        sseAttachment({ attachmentId: 'sse-2' }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.sseCount).toBe(2);
  });

  it('returns undefined when no current-run SSE exists', async () => {
    const state = await readCurrentRunState({
      attachments: [],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state).toBeUndefined();
  });

  it('extracts and dedupes user.name and service.name entities across current-run SSEs', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({
          attachmentId: 'sse-1',
          entities: [
            { field: 'host.name', value: 'host-a' },
            { field: 'user.name', value: 'dev-user' },
            { field: 'service.name', value: 'escalated-role' },
          ],
        }),
        sseAttachment({
          attachmentId: 'sse-2',
          entities: [
            { field: 'user.name', value: 'dev-user' },
            { field: 'user.name', value: 'ops-user' },
            { field: 'service.name', value: 'escalated-role' },
          ],
        }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.users).toEqual(['dev-user', 'ops-user']);
    expect(state?.services).toEqual(['escalated-role']);
    expect(state?.hosts.map((h) => h.name)).toEqual(['host-a']);
  });

  it('ignores other allowlisted entity fields when extracting identities', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({
          entities: [
            { field: 'host.name', value: 'host-a' },
            { field: 'user.email', value: 'dev@example.com' },
            { field: 'host.id', value: 'h-1' },
          ],
        }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.users).toEqual([]);
    expect(state?.services).toEqual([]);
  });

  it('takes the max severity across current-run SSEs', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({ attachmentId: 'sse-1', severity: 'medium' }),
        sseAttachment({ attachmentId: 'sse-2', severity: 'critical' }),
        sseAttachment({ attachmentId: 'sse-3', severity: 'low' }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.severity).toBe('critical');
  });

  it('dedupes identical titles and evidence lines across current-run SSEs', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({ attachmentId: 'sse-1', title: 'Same finding', evidenceFor: ['Same line'] }),
        sseAttachment({ attachmentId: 'sse-2', title: 'Same finding', evidenceFor: ['Same line'] }),
        sseAttachment({ attachmentId: 'sse-3', title: 'Same finding', evidenceFor: ['Same line'] }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.titles).toEqual(['Same finding']);
    expect(state?.evidenceLines).toEqual(['Same line']);
  });

  it('takes the max Tier 1 total hits across current-run SSEs', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({ attachmentId: 'sse-1', tier1TotalHits: 2 }),
        sseAttachment({ attachmentId: 'sse-2', tier1TotalHits: 4 }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.evidence.tier1HitCount).toBe(4);
  });

  it('unions confirmed Tier 2 behaviors by technique_id, ignoring non-hit behaviors', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({
          attachmentId: 'sse-1',
          tier2Behaviors: [
            { technique_id: 'T1059.001', row_count: 3, hit: true },
            { technique_id: 'T1078.004', row_count: 1, hit: false },
          ],
        }),
        sseAttachment({
          attachmentId: 'sse-2',
          tier2Behaviors: [{ technique_id: 'T1078.004', row_count: 4, hit: true }],
        }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.evidence.tier2Confirmed).toEqual([
      { techniqueId: 'T1059.001', techniqueName: undefined, rowCount: 3 },
      { techniqueId: 'T1078.004', techniqueName: undefined, rowCount: 4 },
    ]);
  });

  it('collects every technique seen but only the ones an entry corroborated', async () => {
    // The report-scoped fallback entry: lists both proposed techniques, corroborates neither.
    const state = await readCurrentRunState({
      attachments: [sseAttachment({ techniqueIds: ['T1078.004', 'T1021.001'] })],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.techniques.sort()).toEqual(['T1021.001', 'T1078.004']);
    expect(state?.corroboratedTechniques).toEqual([]);
  });

  it('marks a technique corroborated only when its own entry says so', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({
          techniqueIds: ['T1078.004'],
          corroboratedTechniqueId: 'T1078.004',
        }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.techniques).toEqual(['T1078.004']);
    expect(state?.corroboratedTechniques).toEqual(['T1078.004']);
  });

  it('does not let one corroborated entry vouch for another entry’s uncorroborated technique', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({
          attachmentId: 'sse-1',
          techniqueIds: ['T1078.004'],
          corroboratedTechniqueId: 'T1078.004',
        }),
        sseAttachment({ attachmentId: 'sse-2', techniqueIds: ['T1021.001'] }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.techniques.sort()).toEqual(['T1021.001', 'T1078.004']);
    expect(state?.corroboratedTechniques).toEqual(['T1078.004']);
  });

  describe('findings', () => {
    const readFindings = async (attachments: ReturnType<typeof sseAttachment>[]) =>
      readCurrentRunState({
        attachments,
        reportId,
        runId,
        resolveHostEnrollment,
        rehydrateProcessSelectors,
      });

    it('returns one finding per current-run SSE', async () => {
      const state = await readFindings([
        sseAttachment({ attachmentId: 'sse-1' }),
        sseAttachment({ attachmentId: 'sse-2' }),
      ]);

      expect(state?.findings).toHaveLength(2);
    });

    it('returns source event refs with the technique each was matched to', async () => {
      const state = await readFindings([
        sseAttachment({
          events: [
            {
              event_id: 'evt-1',
              source_index: '.ds-logs-aws.cloudtrail-default-2026.10.08-000001',
              matched: { technique_id: 'T1078.004', field: '_id' },
            },
          ],
        }),
      ]);

      expect(state?.findings[0].eventRefs).toEqual([
        {
          index: '.ds-logs-aws.cloudtrail-default-2026.10.08-000001',
          techniqueId: 'T1078.004',
        },
      ]);
    });

    it('returns the Tier 1 hit indices', async () => {
      const state = await readFindings([sseAttachment({})]);

      expect(state?.findings[0].tier1Indices).toEqual([
        '.ds-logs-endpoint.events.process-default-2026.09.25-000001',
      ]);
    });

    it('returns the hypothesis the finding was tested on', async () => {
      const state = await readFindings([sseAttachment({ hypothesis: 'AssumeRole into role X.' })]);

      expect(state?.findings[0].hypothesis).toBe('AssumeRole into role X.');
    });

    it('treats the generic evaluated-report hypothesis as absent', async () => {
      const state = await readFindings([
        sseAttachment({ hypothesis: 'Hunt Watch evaluated report rpt-1 against the environment.' }),
      ]);

      expect(state?.findings[0].hypothesis).toBeUndefined();
    });

    it('returns an executed behavior with its query and row count', async () => {
      const state = await readFindings([
        sseAttachment({
          tier2Behaviors: [
            {
              technique_id: 'T1078.004',
              row_count: 2,
              validated_esql: 'FROM logs-aws.cloudtrail-* | LIMIT 25',
            },
          ],
        }),
      ]);

      expect(state?.findings[0].behaviors).toEqual([
        expect.objectContaining({
          techniqueId: 'T1078.004',
          validatedEsql: 'FROM logs-aws.cloudtrail-* | LIMIT 25',
          rowCount: 2,
          hit: true,
        }),
      ]);
    });

    it('leaves out a behavior with no query', async () => {
      const state = await readFindings([
        sseAttachment({ tier2Behaviors: [{ technique_id: 'T1078.004', row_count: 2 }] }),
      ]);

      expect(state?.findings[0].behaviors).toEqual([]);
    });

    it('returns the hunt window', async () => {
      const state = await readFindings([sseAttachment({})]);

      expect(state?.window).toEqual({
        from: '2026-09-25T00:00:00.000Z',
        to: '2026-09-25T01:00:00.000Z',
      });
    });
  });

  it('reads technique names from technique SKI labels', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({
          techniqueIds: [],
          techniqueLabels: ['T1078.004 (Cloud Accounts)'],
        }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.techniqueNames).toEqual({ 'T1078.004': 'Cloud Accounts' });
  });

  it('collects distinct user names across attachments', async () => {
    const state = await readCurrentRunState({
      attachments: [
        sseAttachment({ attachmentId: 'sse-1', userNames: ['escalated-role', 'dev-user'] }),
        sseAttachment({ attachmentId: 'sse-2', userNames: ['dev-user'] }),
      ],
      reportId,
      runId,
      resolveHostEnrollment,
      rehydrateProcessSelectors,
    });

    expect(state?.users).toEqual(['escalated-role', 'dev-user']);
  });

  it.each([
    ['critical', 'high', 'critical'],
    ['high', 'critical', 'critical'],
    ['low', 'medium', 'medium'],
  ] as const)(
    'picks the highest severity across attachments (%s vs %s -> %s)',
    async (severityA, severityB, expected) => {
      const state = await readCurrentRunState({
        attachments: [
          sseAttachment({ attachmentId: 'sse-1', severity: severityA }),
          sseAttachment({ attachmentId: 'sse-2', severity: severityB }),
        ],
        reportId,
        runId,
        resolveHostEnrollment,
        rehydrateProcessSelectors,
      });

      expect(state?.severity).toBe(expected);
    }
  );
});
