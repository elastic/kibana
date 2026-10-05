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
  corroboratedTechniqueId,
}: {
  actionableIndices?: string[];
  events?: Array<{ event_id: string; source_index: string }>;
  attachmentId?: string;
  title?: string;
  evidenceFor?: string[];
  tier1TotalHits?: number;
  tier2Behaviors?: Array<{
    technique_id: string;
    technique_name?: string;
    row_count: number;
    hit?: boolean;
  }>;
  /** Technique SKIs this entry lists, proposed or corroborated. */
  techniqueIds?: string[];
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
        severity: 'high',
        confidence: 0.9,
        status: 'open',
        source_watch: 'system-security-hunt-continuous-threat-hunt',
        capability: 'continuous_threat_hunt',
        run_id: runId,
        report_id: reportId,
        ...(corroboratedTechniqueId ? { corroborated_technique_id: corroboratedTechniqueId } : {}),
        security_knowledge_indicators: techniqueIds.map((techniqueId) => ({
          type: 'technique' as const,
          value: techniqueId,
          technique_id: techniqueId,
        })),
        entities: [{ field: 'host.name', value: 'host-a' }],
        events: events ?? [
          {
            event_id: 'evt-1',
            source_index: '.ds-logs-endpoint.events.process-default-2026.09.25-000001',
          },
        ],
        timeline: [],
        hypothesis_tested: 'test',
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
                    execution: {
                      executed: true,
                      row_count: behavior.row_count,
                      hit: behavior.hit ?? true,
                    },
                  })),
                },
              }
            : {}),
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
});
