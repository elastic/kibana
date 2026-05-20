/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unit tests for the autonomously-authored PCI compliance evaluator. Cover
 * the composable pipeline (violation → coverage → field-caps preflight), the
 * status × confidence score lookup, and the manual-ring concurrency runner's
 * failure semantics.
 *
 * ES|QL execution is mocked at the `@kbn/agent-builder-genai-utils` boundary
 * so these tests stay hermetic — no Elasticsearch round-trip required.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

import { executeEsql } from '@kbn/agent-builder-genai-utils';
import {
  AUTONOMOUS_PCI_REQUIREMENT_CONCURRENCY,
  evaluateAutonomousRequirement,
  runAutonomousWithConcurrency,
} from './pci_autonomous_evaluator';

const mockExecuteEsql = executeEsql as jest.MockedFunction<typeof executeEsql>;

const createEsClient = (overrides: Partial<ElasticsearchClient> = {}): ElasticsearchClient =>
  ({
    fieldCaps: jest.fn().mockResolvedValue({ fields: {} }),
    ...overrides,
  } as unknown as ElasticsearchClient);

beforeEach(() => {
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────
// Concurrency runner
// ──────────────────────────────────────────────────────────────────────────

describe('runAutonomousWithConcurrency', () => {
  it('exposes a sane default concurrency budget', () => {
    expect(AUTONOMOUS_PCI_REQUIREMENT_CONCURRENCY).toBeGreaterThan(0);
  });

  it('preserves task order in the output array', async () => {
    const tasks = [10, 20, 30, 40].map(
      (n, index) => () =>
        // small staggered delay so completion order ≠ submission order
        new Promise<number>((resolve) => setTimeout(() => resolve(n + index), n))
    );

    const results = await runAutonomousWithConcurrency(tasks, 2);
    expect(results).toEqual([10, 21, 32, 43]);
  });

  it('throws synchronously when limit <= 0', async () => {
    await expect(runAutonomousWithConcurrency([], 0)).rejects.toThrow('limit must be > 0');
    await expect(runAutonomousWithConcurrency([], -1)).rejects.toThrow('limit must be > 0');
  });

  it('returns immediately for an empty task list', async () => {
    await expect(runAutonomousWithConcurrency([], 4)).resolves.toEqual([]);
  });

  it('handles fewer tasks than the concurrency limit', async () => {
    const results = await runAutonomousWithConcurrency([async () => 'a', async () => 'b'], 8);
    expect(results).toEqual(['a', 'b']);
  });

  it('awaits every task even when one rejects, then re-throws the first error', async () => {
    const completions: string[] = [];
    const tasks: Array<() => Promise<string>> = [
      async () => {
        await new Promise((r) => setTimeout(r, 5));
        completions.push('first-ok');
        return 'first-ok';
      },
      async () => {
        await new Promise((r) => setTimeout(r, 1));
        throw new Error('boom');
      },
      async () => {
        await new Promise((r) => setTimeout(r, 10));
        completions.push('third-ok');
        return 'third-ok';
      },
    ];

    await expect(runAutonomousWithConcurrency(tasks, 3)).rejects.toThrow('boom');
    // the surviving tasks completed before the rejection bubbled
    expect(completions).toEqual(expect.arrayContaining(['first-ok', 'third-ok']));
  });
});

// ──────────────────────────────────────────────────────────────────────────
// evaluateAutonomousRequirement
// ──────────────────────────────────────────────────────────────────────────

describe('evaluateAutonomousRequirement — pipeline branches', () => {
  const baseArgs = {
    indexPattern: 'logs-*',
    from: '2024-01-01T00:00:00Z',
    to: '2024-01-08T00:00:00Z',
    includeEvidence: false,
  };

  it('throws on an unknown requirement id', async () => {
    await expect(
      evaluateAutonomousRequirement({
        ...baseArgs,
        requirementId: 'nonsense',
        esClient: createEsClient(),
      })
    ).rejects.toThrow('unknown requirement id "nonsense"');
  });

  it('detect_violations: returns RED + HIGH when the violation query yields rows', async () => {
    mockExecuteEsql.mockResolvedValue({
      columns: [{ name: 'weak_flows', type: 'long' }],
      values: [
        ['1.0', '10.0.0.1', 12],
        ['1.1', '10.0.0.2', 7],
      ],
    } as never);

    const result = await evaluateAutonomousRequirement({
      ...baseArgs,
      requirementId: '4.2.1',
      esClient: createEsClient(),
    });

    expect(result.status).toBe('RED');
    expect(result.confidence).toBe('HIGH');
    expect(result.score).toBe(0);
    expect(result.findings[0].check).toMatch(/violations/);
  });

  it('binds the user time range via ?_window_start / ?_window_end without interpolating it', async () => {
    mockExecuteEsql.mockResolvedValue({
      columns: [{ name: 'weak_flows', type: 'long' }],
      values: [['1.0', '10.0.0.1', 1]],
    } as never);

    await evaluateAutonomousRequirement({
      ...baseArgs,
      requirementId: '4.2.1',
      esClient: createEsClient(),
    });

    const call = mockExecuteEsql.mock.calls[0][0];
    expect(call.query).toContain('?_window_start');
    expect(call.query).toContain('?_window_end');
    expect(call.query).not.toContain('2024-01-01T00:00:00Z');
    expect(call.params).toEqual([
      { _window_start: '2024-01-01T00:00:00Z' },
      { _window_end: '2024-01-08T00:00:00Z' },
    ]);
  });

  it('verify_presence (no violation query): returns GREEN + MEDIUM via the coverage stage', async () => {
    mockExecuteEsql.mockResolvedValue({
      columns: [{ name: 'observed_events', type: 'long' }],
      values: [[42]],
    } as never);

    const result = await evaluateAutonomousRequirement({
      ...baseArgs,
      requirementId: '8.3.6',
      esClient: createEsClient(),
    });

    // 8.3.6 is `verify_presence` and ships **no** dedicated violation query.
    // Stage 1 (violation) skips on the missing query, Stage 2 (coverage)
    // sees count > 0, and the lookup at the coverage stage downgrades the
    // confidence to MEDIUM because no violation query exists to corroborate
    // the telemetry-observed signal. Pinning the assertion to MEDIUM (not a
    // ['HIGH','MEDIUM'] union) makes the test fail if a regression ever
    // unifies the verify_presence path and erases the corroboration
    // distinction.
    expect(result.status).toBe('GREEN');
    expect(result.confidence).toBe('MEDIUM');
    expect(result.score).toBeGreaterThan(0);
  });

  // For requirement 8.3.4 the pipeline issues TWO ES|QL queries:
  //  - violation (returns one row PER detected violation; here we mock []
  //    so `rowCount === 0` and the stage falls through to coverage)
  //  - coverage (a STATS aggregation projecting a single observed-events
  //    count; mocked as `[[0]]` so the count coerces to zero and the stage
  //    falls through to the field-caps preflight)
  const emptyViolationRows = {
    columns: [
      { name: 'user.name', type: 'keyword' },
      { name: 'source.ip', type: 'ip' },
      { name: 'failure_burst', type: 'long' },
    ],
    values: [] as unknown[][],
  } as never;
  const zeroCoverageCount = {
    columns: [{ name: 'observed_events', type: 'long' }],
    values: [[0]],
  } as never;

  it('falls through to NOT_ASSESSABLE when the schema cannot be mapped at all', async () => {
    // No rows from any query, and field-caps reports an empty mapping → every
    // required field (other than @timestamp) is missing → unmappable.
    mockExecuteEsql
      .mockResolvedValueOnce(emptyViolationRows)
      .mockResolvedValueOnce(zeroCoverageCount);

    const result = await evaluateAutonomousRequirement({
      ...baseArgs,
      requirementId: '8.3.4',
      esClient: createEsClient({
        fieldCaps: jest.fn().mockResolvedValue({ fields: {} }),
      } as unknown as Partial<ElasticsearchClient>),
    });

    expect(result.status).toBe('NOT_ASSESSABLE');
    expect(result.confidence).toBe('NOT_ASSESSABLE');
    expect(result.score).toBe(25);
    expect(result.dataGaps.some((g) => g.kind === 'missing_fields')).toBe(true);
  });

  it('returns AMBER + HIGH when fields exist but no events fall inside the window', async () => {
    mockExecuteEsql
      .mockResolvedValueOnce(emptyViolationRows)
      .mockResolvedValueOnce(zeroCoverageCount);

    const fieldCaps = jest.fn().mockResolvedValue({
      fields: {
        'event.category': { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        'event.outcome': { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        'user.name': { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        'source.ip': { ip: { type: 'ip', searchable: true, aggregatable: true } },
      },
    });

    const result = await evaluateAutonomousRequirement({
      ...baseArgs,
      requirementId: '8.3.4',
      esClient: createEsClient({ fieldCaps } as unknown as Partial<ElasticsearchClient>),
    });

    expect(result.status).toBe('AMBER');
    expect(result.confidence).toBe('HIGH');
    expect(result.score).toBe(55);
  });

  it('returns AMBER + LOW with a structured dataGap when field-caps lookup fails', async () => {
    mockExecuteEsql
      .mockResolvedValueOnce(emptyViolationRows)
      .mockResolvedValueOnce(zeroCoverageCount);

    const fieldCaps = jest.fn().mockRejectedValue(new Error('cluster unreachable'));

    const result = await evaluateAutonomousRequirement({
      ...baseArgs,
      requirementId: '8.3.4',
      esClient: createEsClient({ fieldCaps } as unknown as Partial<ElasticsearchClient>),
    });

    expect(result.status).toBe('AMBER');
    expect(result.confidence).toBe('LOW');
    expect(result.score).toBe(35);
    expect(result.dataGaps.some((g) => g.kind === 'query_failed')).toBe(true);
  });

  it('surfaces ES|QL query failures as `query_failed` data gaps instead of crashing', async () => {
    // Throw on the FIRST call (violation query for 4.2.1), then succeed on the
    // SECOND call (coverage query) with zero rows so we land in preflight.
    mockExecuteEsql.mockRejectedValueOnce(new Error('esql syntax bug')).mockResolvedValueOnce({
      columns: [{ name: 'observed_events', type: 'long' }],
      values: [[0]],
    } as never);

    const result = await evaluateAutonomousRequirement({
      ...baseArgs,
      requirementId: '4.2.1',
      esClient: createEsClient(),
    });

    // The result class depends on preflight (the field-caps mock returns empty),
    // but the carried dataGaps must include the ES|QL failure.
    expect(result.dataGaps.some((g) => g.kind === 'query_failed')).toBe(true);
    expect(result.dataGaps.some((g) => g.details?.some((d) => d.includes('esql syntax bug')))).toBe(
      true
    );
  });

  it('includes ES|QL evidence in the finding when includeEvidence is true (and clamps long results)', async () => {
    const fakeRow = ['1.0', '10.0.0.1', 1];
    const fakeRows = Array.from({ length: 100 }, () => fakeRow);
    mockExecuteEsql.mockResolvedValue({
      columns: [
        { name: 'tls.version', type: 'keyword' },
        { name: 'destination.ip', type: 'ip' },
        { name: 'weak_flows', type: 'long' },
      ],
      values: fakeRows,
    } as never);

    const result = await evaluateAutonomousRequirement({
      ...baseArgs,
      requirementId: '4.2.1',
      includeEvidence: true,
      esClient: createEsClient(),
    });

    expect(result.status).toBe('RED');
    expect(result.findings[0].evidence).toBeDefined();
    // Evidence is clamped to 50 rows on the violation path.
    expect(result.findings[0].evidence?.values.length).toBe(50);
  });
});
