/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { HuntCoordinatorCoreResult } from '../hunt_coordinator';
import { generateRecommendations, templateRecommendations } from './build_recommendations';

const logger = loggingSystemMock.createLogger();

const baseResult = (
  overrides: Partial<HuntCoordinatorCoreResult> = {}
): HuntCoordinatorCoreResult => ({
  status: 'tier1_and_tier2',
  run_id: 'run-1',
  index_patterns: ['logs-aws.*'],
  tier2_targets: ['logs-aws.*', 'logs-endpoint.events.*'],
  tier2_target_sources: ['report_match', 'actionable'],
  actionable_indices: ['logs-endpoint.events.*'],
  tier1: {
    tier: 1,
    status: 'environment_hits_found',
    has_confirmed_hit: true,
    searched_iocs: 0,
    searched_techniques: 1,
    resolved_iocs: [{ type: 'hash', value: 'abc123' }],
    resolved_techniques: ['T1078.004'],
    time_range: { from: '2026-09-01T00:00:00.000Z', to: '2026-09-02T00:00:00.000Z' },
    counts: { total_hits: 3, returned_hits: 3, affected_hosts: 1, affected_users: 1 },
    hits: [],
    affected_assets: {
      hosts: [{ name: 'WIN-ANALYST01', hit_count: 2 }],
      users: [{ name: 'dev-user@corp.example', hit_count: 1 }],
      services: [],
    },
    per_index: [],
    message: 'ok',
  },
  tier2: {
    tier: 2,
    status: 'behaviors_proposed',
    behaviors: [
      {
        technique_id: 'T1078.004',
        evidence_quote: 'AssumeRole from an unused identity',
        llm_confidence: 0.9,
        confidence: 0.9,
        technique_name: 'Valid Accounts: Cloud Accounts',
        reference: 'https://attack.mitre.org/techniques/T1078/004/',
        tactic_ids: ['TA0004'],
        validated_esql: 'FROM logs-aws.cloudtrail-* | LIMIT 1',
        title: 'Hunt: Valid Accounts: Cloud Accounts (T1078.004)',
        severity: 'high',
        risk_score: 73,
        execution: { executed: true, row_count: 2, hit: true },
        affected_hosts: ['WIN-ANALYST01'],
      },
    ],
    indexed_behaviors: [],
    has_hit: true,
    next_step: 'ok',
  },
  message: 'ok',
  next_step: 'ok',
  has_confirmed_hit: true,
  completeness: 'complete',
  completed_successfully: true,
  ...overrides,
});

describe('templateRecommendations', () => {
  it('writes one line per confirmed behavior, naming its own affected hosts', () => {
    const lines = templateRecommendations(baseResult());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('T1078.004');
    expect(lines[0]).toContain('WIN-ANALYST01');
  });

  it('falls back to Tier 1 assets when no behavior confirmed', () => {
    const result = baseResult({
      tier2: {
        tier: 2,
        status: 'behaviors_proposed',
        behaviors: [],
        indexed_behaviors: [],
        has_hit: false,
        next_step: 'ok',
      },
    });
    const lines = templateRecommendations(result);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('WIN-ANALYST01');
  });

  it('never returns an empty list on a confirmed hit, even with no assets at all', () => {
    const result = baseResult({
      tier1: {
        ...baseResult().tier1,
        affected_assets: { hosts: [], users: [], services: [] },
      },
      tier2: {
        tier: 2,
        status: 'behaviors_proposed',
        behaviors: [],
        indexed_behaviors: [],
        has_hit: false,
        next_step: 'ok',
      },
    });
    const lines = templateRecommendations(result);
    expect(lines.length).toBeGreaterThan(0);
  });

  it('caps at 8 lines', () => {
    const behaviors = Array.from({ length: 12 }, (_, i) => ({
      ...baseResult().tier2!.behaviors[0],
      technique_id: `T${1000 + i}`,
      execution: { executed: true, row_count: 1, hit: true },
    }));
    const result = baseResult({
      tier2: {
        tier: 2,
        status: 'behaviors_proposed',
        behaviors,
        indexed_behaviors: [],
        has_hit: true,
        next_step: 'ok',
      },
    });
    expect(templateRecommendations(result).length).toBeLessThanOrEqual(8);
  });
});

describe('generateRecommendations', () => {
  it('uses the template floor when no model is available', async () => {
    const lines = await generateRecommendations({
      model: undefined,
      logger,
      result: baseResult(),
      context: 'irrelevant',
    });
    expect(lines).toEqual(templateRecommendations(baseResult()));
  });

  it('keeps a grounded line and drops one naming an entity absent from the run', async () => {
    const invoke = jest.fn().mockResolvedValue({
      recommendations: [
        {
          text: 'Rotate the credential for WIN-ANALYST01.',
          entities_referenced: ['WIN-ANALYST01'],
        },
        {
          text: 'Also check host GHOST-HOST99, which was never in this run.',
          entities_referenced: ['GHOST-HOST99'],
        },
      ],
    });
    const model = {
      chatModel: { withStructuredOutput: () => ({ invoke }) },
    } as unknown as ScopedModel;
    const lines = await generateRecommendations({
      model,
      logger,
      result: baseResult(),
      context: 'irrelevant',
    });
    expect(lines).toEqual(['Rotate the credential for WIN-ANALYST01.']);
  });

  it('drops a line naming a hallucinated entity in its text even with an empty entities_referenced', async () => {
    // The actual bug: `.every()` on an empty `entities_referenced` passes unconditionally,
    // so a model that names a host in prose but omits it from its own self-report used to
    // get it through for free.
    const invoke = jest.fn().mockResolvedValue({
      recommendations: [
        {
          text: 'Rotate the credential for WIN-ANALYST01.',
          entities_referenced: ['WIN-ANALYST01'],
        },
        {
          text: 'Isolate GHOST-HOST99 immediately.',
          entities_referenced: [],
        },
      ],
    });
    const model = {
      chatModel: { withStructuredOutput: () => ({ invoke }) },
    } as unknown as ScopedModel;
    const lines = await generateRecommendations({
      model,
      logger,
      result: baseResult(),
      context: 'irrelevant',
    });
    expect(lines).toEqual(['Rotate the credential for WIN-ANALYST01.']);
  });

  it('keeps a line that legitimately names nothing specific', async () => {
    const invoke = jest.fn().mockResolvedValue({
      recommendations: [
        {
          text: 'Review recent privilege escalation activity for lateral movement in real-time.',
          entities_referenced: [],
        },
      ],
    });
    const model = {
      chatModel: { withStructuredOutput: () => ({ invoke }) },
    } as unknown as ScopedModel;
    const lines = await generateRecommendations({
      model,
      logger,
      result: baseResult(),
      context: 'irrelevant',
    });
    expect(lines).toEqual([
      'Review recent privilege escalation activity for lateral movement in real-time.',
    ]);
  });

  it('falls back to the template floor when every generated line is ungrounded', async () => {
    const invoke = jest.fn().mockResolvedValue({
      recommendations: [
        {
          text: 'Investigate host GHOST-HOST99.',
          entities_referenced: ['GHOST-HOST99'],
        },
      ],
    });
    const model = {
      chatModel: { withStructuredOutput: () => ({ invoke }) },
    } as unknown as ScopedModel;
    const lines = await generateRecommendations({
      model,
      logger,
      result: baseResult(),
      context: 'irrelevant',
    });
    expect(lines).toEqual(templateRecommendations(baseResult()));
  });

  it('falls back to the template floor when the model call throws', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('connector unavailable'));
    const model = {
      chatModel: { withStructuredOutput: () => ({ invoke }) },
    } as unknown as ScopedModel;
    const lines = await generateRecommendations({
      model,
      logger,
      result: baseResult(),
      context: 'irrelevant',
    });
    expect(lines).toEqual(templateRecommendations(baseResult()));
  });
});
