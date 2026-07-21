/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------------------------------------------------
// Hunt pipeline E2E eval
//
// WHY this suite exists:
//   The unit-level conformance suite (hunt_eval_conformance.test.ts) pins each
//   architectural invariant to a single function in isolation. THIS suite proves
//   the same invariants survive when they are wired together through the REAL
//   orchestrator control flow plus the REAL persistence layer — the exact path
//   the scheduled continuous-hunt worker drives on its 4h cadence.
//
//   Unlike the feature's own hunt_orchestrator.test.ts (which mocks
//   ./persist_hunt_findings, so it never proves a durable outcome is written),
//   this suite mocks ONLY the two leaf services that need a live ES query / live
//   LLM, and runs the real orchestrator AND the real persistence:
//
//     hunt_orchestrator        REAL  (tier gating, result assembly, persistence call)
//       -> hunt_for_threat     mock  (Tier 1 ES telemetry probe)
//       -> hunt_behavior       mock  (Tier 2 LLM behavior extraction)
//       -> resolveReportContext driven via mocked esClient.search
//       -> persist_hunt_findings REAL (durable, deduped, source-traceable write)
//       -> write_hunt_feedback mock  (irrelevant side channel)
//
//   The result: an end-to-end proof that a scheduled LLM worker produces a
//   durable, addressable, deduplicated, source-traceable outcome (L1->L4), not a
//   demo that merely "looks right".
// ---------------------------------------------------------------------------

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { HuntForThreatResult } from '../services/hunt_for_threat';
import type { HuntBehaviorResult, ValidatedBehavior } from '../services/hunt_behavior';
import { toIndexedBehaviors } from '../services/indexed_behaviors';
import { huntForThreat } from '../services/hunt_for_threat';
import { huntBehavior } from '../services/hunt_behavior';
import { writeHuntFeedbackSafe } from '../services/write_hunt_feedback';
import { huntOrchestrator } from '../services/hunt_orchestrator';

// Mock the two leaf services (live ES / live LLM) and the feedback side channel.
// Deliberately DO NOT mock ./persist_hunt_findings — the durable write is the
// point of this suite.
jest.mock('../services/hunt_for_threat');
jest.mock('../services/hunt_behavior');
jest.mock('../services/write_hunt_feedback');

const huntForThreatMock = huntForThreat as jest.MockedFunction<typeof huntForThreat>;
const huntBehaviorMock = huntBehavior as jest.MockedFunction<typeof huntBehavior>;
const writeHuntFeedbackSafeMock = writeHuntFeedbackSafe as jest.MockedFunction<
  typeof writeHuntFeedbackSafe
>;

const REPORT_ID = 'report-okta-takeover';
const REPORT_BODY = 'Adversary used stolen Okta session tokens for initial access.';

const model = {} as ScopedModel;

// Tier 1 returns no environment hits; the scheduled worker uses tier2_when:
// 'always', so Tier 2 still runs and proposes rules from the report text.
const tier1NoHits = (): HuntForThreatResult => ({
  status: 'no_environment_hits',
  report_id: REPORT_ID,
  searched_iocs: 0,
  searched_techniques: 1,
  counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
  hits: [],
  affected_assets: { hosts: [], users: [] },
  per_index: [],
  next_step: 'no environment hits',
});

const behavior: ValidatedBehavior = {
  technique_id: 'T1078',
  evidence_quote: 'Adversary used stolen Okta session tokens for initial access',
  llm_confidence: 0.9,
  confidence: 0.85,
  technique_name: 'Valid Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/',
  tactic_ids: ['initial-access'],
  proposed_esql_rule: 'FROM logs-* | WHERE event.action == "user_authentication"',
  rule_name: 'Okta stolen session token',
  severity: 'high' as const,
  risk_score: 73,
  finding_id: `${REPORT_ID}:T1078`,
};

const tier2Proposed = (): HuntBehaviorResult => ({
  status: 'behaviors_proposed',
  report_id: REPORT_ID,
  behaviors: [behavior],
  indexed_behaviors: toIndexedBehaviors([behavior]),
  attachment_hints: [],
  next_step: 'Emit each behavior as a finding card',
});

// Build an ES client whose search() returns the report doc (for
// resolveReportContext) and whose create() behaves like op_type: 'create'
// against a controllable set of already-existing finding ids (for dedup).
const buildEsClient = (opts?: { existingFindingIds?: Set<string>; createError?: unknown }) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.search.mockResolvedValue({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      total: { value: 1, relation: 'eq' },
      max_score: 1,
      hits: [
        {
          _index: '.ds-.kibana-threat-reports-000001',
          _id: REPORT_ID,
          _score: 1,
          _source: { content: { body_text: REPORT_BODY }, rank_score: 42 },
        },
      ],
    },
  } as unknown as Awaited<ReturnType<typeof esClient.search>>);

  esClient.create.mockImplementation(async (req: { id?: string }) => {
    if (opts?.createError) throw opts.createError;
    if (opts?.existingFindingIds?.has(req.id ?? '')) {
      // op_type: create on an existing id -> 409 version conflict.
      const err = new Error('version conflict') as Error & { statusCode: number };
      err.statusCode = 409;
      throw err;
    }
    return { result: 'created' } as Awaited<ReturnType<typeof esClient.create>>;
  });

  return esClient;
};

const logger = loggingSystemMock.createLogger();

beforeEach(() => {
  jest.clearAllMocks();
  huntForThreatMock.mockResolvedValue(tier1NoHits());
  huntBehaviorMock.mockResolvedValue(tier2Proposed());
  writeHuntFeedbackSafeMock.mockResolvedValue(undefined);
});

describe('E2E-1 durable outcome: the real pipeline persists a scoreable finding', () => {
  it('drives tier1 -> tier2 -> persist and writes exactly one finding', async () => {
    const esClient = buildEsClient();
    const result = await huntOrchestrator(esClient, model, logger, {
      report_id: REPORT_ID,
      tier2_when: 'always',
      spaceId: 'default',
    });

    // The orchestrator ran both tiers on the scheduled ("always") path...
    expect(result.status).toBe('tier1_and_tier2');
    expect(result.tier2?.behaviors).toHaveLength(1);

    // ...and the REAL persistence layer produced a durable finding. If
    // persistence regressed to a no-op, this is where the eval story breaks.
    expect(esClient.create).toHaveBeenCalledTimes(1);
    const call = esClient.create.mock.calls[0][0] as { id?: string };
    // A stable, addressable id is what makes an outcome-level eval possible.
    expect(call.id).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('E2E-2 source traceability: the persisted finding names its origin', () => {
  it('writes report and technique provenance onto the durable finding', async () => {
    const esClient = buildEsClient();
    await huntOrchestrator(esClient, model, logger, {
      report_id: REPORT_ID,
      tier2_when: 'always',
      spaceId: 'default',
    });

    const call = esClient.create.mock.calls[0][0] as {
      document: { report_id: string; technique_id: string; hunt_run_id: string };
    };
    // Provenance is what lets eval triage attribute a miss to ingest vs reasoning.
    expect(call.document.report_id).toBe(REPORT_ID);
    expect(call.document.technique_id).toBe('T1078');
    expect(call.document.hunt_run_id).toEqual(expect.any(String));
  });
});

describe('E2E-3 dedup fails closed: a scheduled re-run does not double-write', () => {
  it('skips the finding when the same-day id already exists', async () => {
    // First run persists the finding and captures its id.
    const first = buildEsClient();
    await huntOrchestrator(first, model, logger, {
      report_id: REPORT_ID,
      tier2_when: 'always',
      spaceId: 'default',
    });
    const persistedId = (first.create.mock.calls[0][0] as { id: string }).id;

    // Second run (same report, same day) hits the existing id and must skip.
    const second = buildEsClient({ existingFindingIds: new Set([persistedId]) });
    await huntOrchestrator(second, model, logger, {
      report_id: REPORT_ID,
      tier2_when: 'always',
      spaceId: 'default',
    });

    // create() was attempted (409) but no second row was appended.
    expect(second.create).toHaveBeenCalledTimes(1);
    // The orchestrator swallows persistence outcomes; the guarantee we assert is
    // that the write path used the SAME deterministic id, so ES enforced dedup.
    const secondId = (second.create.mock.calls[0][0] as { id: string }).id;
    expect(secondId).toBe(persistedId);
  });
});

describe('E2E-4 no durable outcome when Tier 2 is skipped', () => {
  it('persists nothing when tier2_when=never (evidence ceiling stays at L3)', async () => {
    const esClient = buildEsClient();
    const result = await huntOrchestrator(esClient, model, logger, {
      report_id: REPORT_ID,
      tier2_when: 'never',
      spaceId: 'default',
    });

    expect(result.status).toBe('tier1_only');
    // No Tier 2 behaviors -> no finding rows -> no outcome-level eval surface.
    expect(esClient.create).not.toHaveBeenCalled();
  });
});
