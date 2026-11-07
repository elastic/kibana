/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyzeAgentBehavior, DEFAULT_BEHAVIOR_RULES } from './behavior';
import type {
  AgentBehaviorInput,
  BehaviorToolCall,
  BehaviorToolSummary,
  BehaviorUnit,
} from './behavior_types';

const source = (id: string) => ({ index: 'logs-codex.entity_intelligence-default', id });
const summary = (
  toolName: string,
  successCount: number,
  failureCount = 0,
  unknownCount = 0
): BehaviorToolSummary => ({
  toolName,
  count: successCount + failureCount + unknownCount,
  successCount,
  failureCount,
  unknownCount,
});
const baselineUnit = (index: number, overrides: Partial<BehaviorUnit> = {}): BehaviorUnit => ({
  id: `prior-${index}`,
  agentId: 'codex:local',
  startedAt: `2026-10-0${index + 1}T12:00:00Z`,
  observedThrough: `2026-10-0${index + 1}T12:10:00Z`,
  toolsComplete: true,
  toolCallsComplete: false,
  toolSummary: { tools: [summary('exec_command', 10)] },
  toolCalls: [],
  source: source(`prior-${index}`),
  ...overrides,
});
const call = (index: number, overrides: Partial<BehaviorToolCall> = {}): BehaviorToolCall => ({
  id: `call-${index}`,
  toolName: 'exec_command',
  timestamp: new Date(Date.parse('2026-10-10T12:00:00Z') + index * 1000).toISOString(),
  outcome: 'success',
  source: source(`call-${index}`),
  ...overrides,
});
const currentUnit = (overrides: Partial<BehaviorUnit> = {}): BehaviorUnit => ({
  id: 'selected',
  agentId: 'codex:local',
  startedAt: '2026-10-10T12:00:00Z',
  observedThrough: '2026-10-10T13:00:00Z',
  toolsComplete: true,
  toolCalls: Array.from({ length: 10 }, (_, index) => call(index)),
  source: source('selected'),
  ...overrides,
});
const input = (
  current: BehaviorUnit = currentUnit(),
  prior: BehaviorUnit[] = Array.from({ length: 5 }, (_, index) => baselineUnit(index))
): AgentBehaviorInput => ({
  agentId: 'codex:local',
  unitKind: 'session',
  baseline: {
    start: '2026-10-01T00:00:00Z',
    end: '2026-10-10T12:00:00Z',
    coverage: 'complete',
    units: prior,
  },
  current: {
    start: '2026-10-10T12:00:00Z',
    end: '2026-10-11T00:00:00Z',
    coverage: 'complete',
    units: [current],
  },
});

it('uses real aggregate snapshots for a five-session baseline without synthesizing tool calls', () => {
  const result = analyzeAgentBehavior(
    input(
      currentUnit({
        toolCalls: [],
        toolSummary: { tools: [summary('exec_command', 40), summary('apply_patch', 5)] },
      })
    )
  );
  expect(result.status).toBe('evaluated');
  expect(result.baseline.unitCount).toBe(5);
  expect(result.baseline.toolCallCount).toBe(50);
  expect(result.baseline.detailedToolCallCount).toBe(0);
  expect(result.current.detailedToolCallCount).toBe(0);
  expect(result.comparisons.repeated_tool_failures.status).toBe('unavailable_metadata');
  expect(result.findings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'new_tool',
        toolName: 'apply_patch',
        observed: 5,
        baseline: 0,
        baselineSampleSize: 5,
        evidence: [
          { unitId: 'selected', timestamp: '2026-10-10T12:00:00Z', source: source('selected') },
        ],
      }),
      expect.objectContaining({
        kind: 'tool_volume_increase',
        observed: 45,
        baseline: 10,
        threshold: 30,
      }),
    ])
  );
});

it('compares known outcomes and excludes unknown results from the failure-rate denominator', () => {
  const current = currentUnit({
    toolCalls: [],
    toolSummary: { tools: [summary('exec_command', 7, 3, 90)] },
  });
  const prior = Array.from({ length: 5 }, (_, index) =>
    baselineUnit(index, {
      toolSummary: { tools: [summary('exec_command', 9, 1, 50)] },
    })
  );
  const result = analyzeAgentBehavior(input(current, prior));
  expect(result.current.knownOutcomeCount).toBe(10);
  expect(result.current.unknownOutcomeCount).toBe(90);
  expect(result.comparisons.failure_rate_increase).toEqual({
    status: 'evaluated',
    baselineSampleSize: 50,
    currentSampleSize: 10,
  });
  expect(result.findings.find((finding) => finding.kind === 'failure_rate_increase')).toMatchObject(
    {
      observed: 0.3,
      baseline: 0.1,
      baselineSampleSize: 50,
      currentSampleSize: 10,
    }
  );
});

it('requires enough baseline sessions and known outcomes rather than treating insufficient data as normal', () => {
  const small = analyzeAgentBehavior(input(currentUnit(), [baselineUnit(0)]));
  expect(small.status).toBe('insufficient_baseline');
  expect(small.comparisons.new_tool.status).toBe('insufficient_baseline');
  const unknownBaseline = analyzeAgentBehavior(
    input(
      currentUnit(),
      Array.from({ length: 5 }, (_, index) =>
        baselineUnit(index, {
          toolSummary: { tools: [summary('exec_command', 0, 0, 100)] },
        })
      )
    )
  );
  expect(unknownBaseline.comparisons.failure_rate_increase.status).toBe('insufficient_baseline');
  const fewCurrent = analyzeAgentBehavior(
    input(currentUnit({ toolCalls: [call(0, { outcome: 'failure' })] }))
  );
  expect(fewCurrent.comparisons.failure_rate_increase.status).toBe('insufficient_current_data');
});

it('does not pool other agents, duplicate units, or units outside the stated window into the baseline', () => {
  const prior = baselineUnit(0);
  const result = analyzeAgentBehavior(
    input(currentUnit(), [
      prior,
      prior,
      baselineUnit(1, { agentId: 'other-agent' }),
      baselineUnit(2, { startedAt: '2026-09-20T12:00:00Z' }),
    ])
  );
  expect(result.baseline.unitCount).toBe(1);
  expect(result.baseline.toolCallCount).toBe(10);
  expect(result.status).toBe('insufficient_baseline');
});

it('suppresses comparisons on partial populations but still reports a sampled observed failure burst', () => {
  const scenario = input(
    currentUnit({
      toolsComplete: false,
      toolCalls: [0, 1, 2].map((index) => call(index, { outcome: 'failure' })),
    })
  );
  scenario.baseline.coverage = 'partial';
  const result = analyzeAgentBehavior(scenario);
  expect(result.status).toBe('partial');
  expect(result.comparisons.new_tool.status).toBe('incomplete_coverage');
  expect(result.comparisons.failure_rate_increase.status).toBe('incomplete_coverage');
  expect(result.findings).toEqual([
    expect.objectContaining({ kind: 'repeated_tool_failures', observed: 3, sampleBased: true }),
  ]);
});

it('requires one named tool and consecutive observed failures within the configured five-minute interval', () => {
  const brokenBySuccess = [
    call(0, { outcome: 'failure' }),
    call(1, { outcome: 'failure' }),
    call(2),
    call(3, { outcome: 'failure' }),
  ];
  const brokenByUnknown = brokenBySuccess.map((item) =>
    item.id === 'call-2' ? { ...item, outcome: 'unknown' as const } : item
  );
  const spreadApart = [0, 301, 602].map((index) => call(index, { outcome: 'failure' }));
  [brokenBySuccess, brokenByUnknown, spreadApart].forEach((toolCalls) => {
    const result = analyzeAgentBehavior(input(currentUnit({ toolCalls })));
    expect(result.findings.filter((finding) => finding.kind === 'repeated_tool_failures')).toEqual(
      []
    );
  });
  const result = analyzeAgentBehavior(
    input(
      currentUnit({
        toolCalls: [
          call(0, { outcome: 'failure' }),
          call(1, { toolName: 'apply_patch' }),
          call(2, { outcome: 'failure' }),
          call(3, { outcome: 'failure' }),
        ],
      })
    )
  );
  expect(
    result.findings.find((finding) => finding.kind === 'repeated_tool_failures')
  ).toMatchObject({
    toolName: 'exec_command',
    observed: 3,
    sampleBased: false,
  });
});

it('does not infer a new tool or one repeated tool from collapsed privacy names', () => {
  const prior = Array.from({ length: 5 }, (_, index) =>
    baselineUnit(index, {
      toolSummary: { tools: [{ ...summary('custom', 10), nameRedacted: true }] },
    })
  );
  const result = analyzeAgentBehavior(
    input(
      currentUnit({
        toolCalls: [0, 1, 2].map((index) =>
          call(index, {
            toolName: 'custom',
            nameRedacted: true,
            outcome: 'failure',
          })
        ),
      }),
      prior
    )
  );
  expect(result.comparisons.new_tool.status).toBe('unavailable_metadata');
  expect(
    result.findings.filter((finding) =>
      ['new_tool', 'repeated_tool_failures'].includes(finding.kind)
    )
  ).toEqual([]);
});

it('requires both the baseline p95 and median multiplier to be exceeded for volume drift', () => {
  const prior = [10, 10, 10, 10, 100].map((count, index) =>
    baselineUnit(index, {
      toolSummary: { tools: [summary('exec_command', count)] },
    })
  );
  const result = analyzeAgentBehavior(
    input(
      currentUnit({
        toolCalls: [],
        toolSummary: { tools: [summary('exec_command', 50)] },
      }),
      prior
    )
  );
  expect(result.findings.filter((finding) => finding.kind === 'tool_volume_increase')).toEqual([]);
});

it('only compares observed durations and leaves active or imported sessions without durations unassessed', () => {
  const absent = analyzeAgentBehavior(input());
  expect(absent.comparisons.duration_increase.status).toBe('unavailable_metadata');
  expect(absent.baseline.observedDurationCount).toBe(0);
  const prior = Array.from({ length: 5 }, (_, index) =>
    baselineUnit(index, { durationMs: 20_000 })
  );
  const result = analyzeAgentBehavior(input(currentUnit({ durationMs: 90_000 }), prior));
  expect(result.findings.find((finding) => finding.kind === 'duration_increase')).toMatchObject({
    observed: 90_000,
    baseline: 20_000,
    threshold: 60_000,
    baselineSampleSize: 5,
  });
  expect(
    analyzeAgentBehavior(input(currentUnit(), prior)).comparisons.duration_increase.status
  ).toBe('unavailable_metadata');
});

it('rejects overlapping or invalid windows and sessions whose observation snapshot crosses the baseline boundary', () => {
  const overlapping = input();
  overlapping.baseline.end = overlapping.current.end;
  expect(analyzeAgentBehavior(overlapping)).toMatchObject({
    status: 'invalid_windows',
    findings: [],
  });
  const invalid = input();
  invalid.current.end = 'invalid';
  expect(analyzeAgentBehavior(invalid).status).toBe('invalid_windows');
  const crossing = input();
  crossing.baseline.units[0].observedThrough = '2026-10-10T14:00:00Z';
  expect(analyzeAgentBehavior(crossing).comparisons.new_tool.status).toBe('incomplete_coverage');
});

it('deduplicates call IDs and marks inconsistent aggregates and invalid call metadata incomplete', () => {
  const sameCall = call(0, { outcome: 'failure' });
  const duplicates = analyzeAgentBehavior(
    input(currentUnit({ toolCalls: [sameCall, sameCall, sameCall] }))
  );
  expect(duplicates.current.toolCallCount).toBe(1);
  expect(
    duplicates.findings.filter((finding) => finding.kind === 'repeated_tool_failures')
  ).toEqual([]);
  const invalidSummary = analyzeAgentBehavior(
    input(
      currentUnit({
        toolSummary: { tools: [{ ...summary('exec_command', 10), count: 100 }] },
      })
    )
  );
  expect(invalidSummary.status).toBe('partial');
  const truncated = analyzeAgentBehavior(
    input(
      currentUnit({
        toolCallsComplete: true,
        toolSummary: { tools: [summary('exec_command', 100)] },
      })
    )
  );
  expect(truncated.status).toBe('partial');
  const invalidCall = analyzeAgentBehavior(
    input(currentUnit({ toolCalls: [call(0, { timestamp: 'invalid' })] }))
  );
  expect(invalidCall.status).toBe('partial');
});

it('caps real source evidence without changing findings and preserves the declared execution-unit kind', () => {
  const scenario = input(
    currentUnit({
      toolCalls: Array.from({ length: 30 }, (_, index) =>
        call(index, {
          outcome: 'failure',
        })
      ),
    })
  );
  scenario.unitKind = 'invocation';
  const result = analyzeAgentBehavior(scenario);
  const burst = result.findings.find((finding) => finding.kind === 'repeated_tool_failures');
  expect(result.unitKind).toBe('invocation');
  expect(burst?.observed).toBe(30);
  expect(burst?.evidence).toHaveLength(DEFAULT_BEHAVIOR_RULES.maximumEvidence);
  expect(burst?.evidenceTruncated).toBe(true);
  expect(burst?.evidence[0]).toEqual({
    unitId: 'selected',
    callId: 'call-0',
    timestamp: '2026-10-10T12:00:00.000Z',
    source: source('call-0'),
  });
});

it('reports no current data explicitly and keeps invalid rule overrides from producing non-finite thresholds', () => {
  const scenario = input();
  scenario.current.units = [];
  scenario.rules = { maximumEvidence: Number.NaN, volumeRatio: -1 };
  const result = analyzeAgentBehavior(scenario);
  expect(result.status).toBe('no_current_data');
  expect(result.findings).toEqual([]);
  expect(result.rules).toEqual(DEFAULT_BEHAVIOR_RULES);
});

it('does not trust conflicting outcomes in complete summaries and detail rows', () => {
  const result = analyzeAgentBehavior(
    input(
      currentUnit({
        toolCallsComplete: true,
        toolSummary: { tools: [summary('exec_command', 0, 10)] },
      })
    )
  );
  expect(result.status).toBe('partial');
  expect(result.comparisons.failure_rate_increase.status).toBe('incomplete_coverage');
  const contradictory = analyzeAgentBehavior(
    input(currentUnit({ toolCalls: [call(0), call(0, { outcome: 'failure' })] }))
  );
  expect(contradictory.status).toBe('partial');
});

it('builds tool share comparisons without treating redacted tool names as a named tool', () => {
  const result = analyzeAgentBehavior(
    input(
      currentUnit({
        toolCalls: [],
        toolCallsComplete: false,
        toolSummary: {
          tools: [
            summary('exec_command', 4, 2, 2),
            { ...summary('hidden', 2), nameRedacted: true },
          ],
        },
      })
    )
  );
  expect(result.toolProfiles).toEqual([
    {
      name: 'exec_command',
      baselineCount: 50,
      currentCount: 8,
      currentFailures: 2,
      baselineShare: 1,
      currentShare: 0.8,
    },
  ]);
});

it('keeps tool profiles as descriptive evidence when partial coverage withholds drift', () => {
  const result = analyzeAgentBehavior(
    input(
      currentUnit({
        toolsComplete: false,
        toolCalls: [],
        toolCallsComplete: false,
        toolSummary: { tools: [summary('new-tool', 5)] },
      })
    )
  );
  expect(result.comparisons.new_tool.status).toBe('incomplete_coverage');
  expect(result.findings).toEqual([]);
  expect(result.toolProfiles.find((tool) => tool.name === 'new-tool')).toMatchObject({
    currentCount: 5,
    baselineCount: 0,
  });
});
