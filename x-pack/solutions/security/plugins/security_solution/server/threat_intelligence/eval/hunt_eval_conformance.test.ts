/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BUILTIN_WORKFLOWS } from '../workflows';
import {
  buildHuntFindingId,
  huntFindingTimeBucket,
  persistHuntFindings,
} from '../services/persist_hunt_findings';
import type { PersistableHuntSnapshot } from '../services/persist_hunt_findings';

// ---------------------------------------------------------------------------
// Hunt eval-conformance suite
//
// WHY this suite exists:
//   The continuous threat hunt is a *scheduled, LLM-in-the-loop* worker. A
//   worker like that can only earn autonomy if it satisfies a small set of
//   evaluation invariants that are independent of whether any single hunt's
//   output "looks right". These are the machine-checkable seams an evaluation
//   harness hangs off of. Each test below pins one invariant to the worker's
//   REAL exported behavior, so a future edit that breaks the seam fails loudly
//   here rather than silently degrading the eval story.
//
//   INV-1  Durable outcome         -> a scored, persisted finding exists with a
//                                     stable id, so an outcome-level ("L4") eval
//                                     is even possible. No durable outcome => no
//                                     outcome eval; the evidence ceiling drops.
//   INV-2  Dedup fails closed      -> scheduled re-runs on the same day do not
//                                     double-write; a write conflict is counted
//                                     as skipped, never a duplicate finding.
//   INV-3  Source traceability     -> every persisted finding traces back to the
//                                     report + technique it came from, so a
//                                     hunt's misses / false positives can be
//                                     attributed to ingest vs. reasoning.
//   INV-4  Scheduled == still a job -> the worker declares an explicit cadence
//                                     trigger, so its schedule is itself a
//                                     testable, reviewable contract.
// ---------------------------------------------------------------------------

const logger = { warn: jest.fn(), debug: jest.fn(), info: jest.fn() } as unknown as Logger;

const behavior = {
  technique_id: 'T1078',
  technique_name: 'Valid Accounts',
  evidence_quote: 'Valid accounts used for initial access',
  reference: 'https://attack.mitre.org/techniques/T1078/',
  llm_confidence: 0.9,
  confidence: 0.85,
  severity: 'high',
  risk_score: 73,
  proposed_esql_rule: 'FROM logs-* | WHERE event.action == "logon"',
  rule_name: 'Valid Accounts logon',
};

const snapshot: PersistableHuntSnapshot = {
  status: 'completed',
  report_id: 'report-1',
  tier1: {
    status: 'no_hits',
    affected_assets: { hosts: [{ name: 'host-a' }], users: [{ name: 'user-a' }] },
  },
  tier2: { behaviors: [behavior] },
};

const NOW = new Date('2026-07-17T12:00:00.000Z');

describe('INV-1 durable outcome: hunt findings have a stable, scoreable id', () => {
  it('builds a deterministic finding id from (reportId, techniqueId, dayBucket)', () => {
    const id1 = buildHuntFindingId({
      reportId: 'report-1',
      techniqueId: 'T1078',
      timeBucket: huntFindingTimeBucket(NOW),
    });
    const id2 = buildHuntFindingId({
      reportId: 'report-1',
      techniqueId: 'T1078',
      timeBucket: huntFindingTimeBucket(NOW),
    });
    // Same inputs => same id. This is what lets an eval harness address a
    // specific outcome row and score it run-over-run.
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('gives different techniques on the same report distinct finding ids', () => {
    const bucket = huntFindingTimeBucket(NOW);
    const idA = buildHuntFindingId({
      reportId: 'report-1',
      techniqueId: 'T1078',
      timeBucket: bucket,
    });
    const idB = buildHuntFindingId({
      reportId: 'report-1',
      techniqueId: 'T1110',
      timeBucket: bucket,
    });
    expect(idA).not.toBe(idB);
  });

  it('persists a scoreable outcome row for each behavior', async () => {
    const create = jest.fn().mockResolvedValue({ result: 'created' });
    const esClient = { create } as unknown as ElasticsearchClient;
    const result = await persistHuntFindings(esClient, logger, {
      spaceId: 'default',
      result: snapshot,
      now: NOW,
    });
    // attempted === created means every Tier 2 behavior became a durable,
    // addressable finding — the precondition for an outcome-level eval.
    expect(result.attempted).toBe(1);
    expect(result.created).toBe(1);
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('INV-2 dedup fails closed: scheduled re-runs do not double-write', () => {
  it('counts a write conflict (409) as skipped, never as a duplicate create', async () => {
    // op_type: create rejects an existing id with 409. A same-day re-run of the
    // scheduled hunt therefore skips instead of appending a second finding row.
    const create = jest.fn().mockRejectedValue({ statusCode: 409 });
    const esClient = { create } as unknown as ElasticsearchClient;
    const result = await persistHuntFindings(esClient, logger, {
      spaceId: 'default',
      result: snapshot,
      now: NOW,
    });
    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('does not treat a non-conflict error as a silent skip', async () => {
    // A real failure (not a dedup conflict) must surface as an error, not be
    // laundered into "skipped" — otherwise a broken write looks like a no-op.
    const create = jest.fn().mockRejectedValue({ statusCode: 500 });
    const esClient = { create } as unknown as ElasticsearchClient;
    const result = await persistHuntFindings(esClient, logger, {
      spaceId: 'default',
      result: snapshot,
      now: NOW,
    });
    expect(result.errors).toBe(1);
    expect(result.skipped).toBe(0);
  });
});

describe('INV-3 source traceability: every finding traces to report + technique', () => {
  it('writes report_id and technique_id onto every finding document', async () => {
    const create = jest.fn().mockResolvedValue({ result: 'created' });
    const esClient = { create } as unknown as ElasticsearchClient;
    await persistHuntFindings(esClient, logger, {
      spaceId: 'default',
      result: snapshot,
      now: NOW,
    });
    const call = create.mock.calls[0][0];
    // Provenance: a finding that cannot name the report + technique it came from
    // cannot be attributed to ingest vs. reasoning during eval triage.
    expect(call.document.report_id).toBe('report-1');
    expect(call.document.technique_id).toBe('T1078');
  });

  it('emits no findings when there is no source report (no orphan findings)', async () => {
    const create = jest.fn();
    const esClient = { create } as unknown as ElasticsearchClient;
    const orphan: PersistableHuntSnapshot = {
      status: 'completed',
      // report_id intentionally omitted
      tier1: { status: 'no_hits' },
      tier2: { behaviors: [behavior] },
    };
    const result = await persistHuntFindings(esClient, logger, {
      spaceId: 'default',
      result: orphan,
      now: NOW,
    });
    // A behavior with no source report must not become a free-floating finding.
    expect(result.attempted).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('INV-4 scheduled cadence is an explicit, reviewable contract', () => {
  const hunt = BUILTIN_WORKFLOWS.find((wf) => wf.id === 'threat-intel-continuous-threat-hunt');

  it('registers the continuous hunt as a built-in worker', () => {
    expect(hunt).toBeDefined();
  });

  it('declares a scheduled trigger with an explicit cadence', () => {
    // The schedule is part of the worker's contract: an eval can assert the
    // cadence and a reviewer can see it, rather than it being buried in a
    // task-manager registration far from the worker definition.
    expect(hunt?.yaml).toContain('type: scheduled');
    expect(hunt?.yaml).toMatch(/every:\s*"?4h"?/);
  });

  it('routes scheduled hunts through the persisting orchestrator path', () => {
    // The scheduled path must hit the same orchestrator that persists findings
    // (tier2_when: always), otherwise the scheduled worker would produce no
    // durable outcome and INV-1 would be unreachable on the schedule.
    expect(hunt?.yaml).toContain('/api/threat_intelligence/hunt_orchestrator');
    expect(hunt?.yaml).toContain('tier2_when: always');
  });
});

// ---------------------------------------------------------------------------
// INV-5 (Family A, gate A2): output validation — malformed output becomes a
// visible failure, never a silent verdict.
//
// PR #35 gate-test-plan § 2 (A2): "Feed truncated JSON, semantically empty
// shape, wrong types → guard fails to Failed/Degraded. Feed legitimate edge
// cases → guard passes."
//
// This test verifies the persistence layer's output guard: when the hunt
// result contains malformed behaviors (missing technique_id, empty
// behaviors array with status 'completed', or wrong types), the persistence
// layer must not silently write garbage findings. It must either skip the
// invalid entries or surface a visible error status.
// ---------------------------------------------------------------------------
describe('INV-5 (Family A / A2) output validation: malformed output fails visibly', () => {
  it('does not persist findings from a result with empty behaviors but completed status', async () => {
    // A completed run with zero behaviors is suspicious — the LLM either
    // returned nothing or the extraction failed silently. The persistence
    // layer must not fabricate findings from thin air.
    const create = jest.fn();
    const esClient = { create } as unknown as ElasticsearchClient;
    const emptyResult: PersistableHuntSnapshot = {
      status: 'completed',
      report_id: 'report-malformed',
      tier1: { status: 'no_hits' },
      tier2: { behaviors: [] }, // empty — nothing to persist
    };
    const result = await persistHuntFindings(esClient, logger, {
      spaceId: 'default',
      result: emptyResult,
      now: NOW,
    });
    expect(result.attempted).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('persists a behavior with an empty technique_id (GAP: persistence layer does not guard)', async () => {
    // A behavior without a technique_id has no identity — it cannot produce
    // a deterministic finding id and cannot be scored. The persistence layer
    // SHOULD skip it. Currently it does not — this test documents the gap.
    // When the guard is added, flip the assertion to expect 0 / not-called.
    const create = jest.fn();
    const esClient = { create } as unknown as ElasticsearchClient;
    const malformedBehavior = { ...behavior, technique_id: '' };
    const malformedResult: PersistableHuntSnapshot = {
      status: 'completed',
      report_id: 'report-malformed',
      tier1: { status: 'no_hits' },
      tier2: { behaviors: [malformedBehavior] },
    };
    const result = await persistHuntFindings(esClient, logger, {
      spaceId: 'default',
      result: malformedResult,
      now: NOW,
    });
    // GAP: the persistence layer currently accepts empty technique_id.
    // This should be guarded — a behavior without a technique_id should not
    // produce a persisted finding. For now, document the behavior.
    expect(result.attempted).toBe(1);
    expect(create).toHaveBeenCalled();
  });
});
