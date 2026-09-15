/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

import { executeEsql } from '@kbn/agent-builder-genai-utils';
import { evaluateRequirement, runWithConcurrency } from './pci_compliance_evaluator';

const mockExecuteEsql = executeEsql as jest.MockedFunction<typeof executeEsql>;

const createEsClient = (overrides: Partial<ElasticsearchClient> = {}): ElasticsearchClient =>
  ({
    fieldCaps: jest.fn().mockResolvedValue({ fields: {} }),
    ...overrides,
  } as unknown as ElasticsearchClient);

describe('evaluateRequirement — ES|QL parameter binding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('binds the user time range via ?_tstart / ?_tend without interpolating it into the query', async () => {
    mockExecuteEsql.mockResolvedValue({
      columns: [{ name: 'matching_events', type: 'long' }],
      values: [[5]],
    } as never);

    await evaluateRequirement({
      requirementId: '1',
      indexPattern: 'logs-*',
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-08T00:00:00Z',
      includeEvidence: false,
      esClient: createEsClient(),
    });

    expect(mockExecuteEsql).toHaveBeenCalled();
    const call = mockExecuteEsql.mock.calls[0][0];
    expect(call.query).toContain('?_tstart');
    expect(call.query).toContain('?_tend');
    expect(call.query).not.toContain('2024-01-01T00:00:00Z');
    expect(call.params).toEqual([
      { _tstart: '2024-01-01T00:00:00Z' },
      { _tend: '2024-01-08T00:00:00Z' },
    ]);
  });

  it('returns NOT_ASSESSABLE when coverage is empty and every required field is missing', async () => {
    mockExecuteEsql.mockResolvedValue({
      columns: [{ name: 'matching_events', type: 'long' }],
      values: [[0]],
    } as never);

    const esClient = createEsClient({
      // No fields exist -> preflight reports every non-@timestamp required field as missing.
      fieldCaps: jest.fn().mockResolvedValue({ fields: {} }),
    } as unknown as Partial<ElasticsearchClient>);

    const result = await evaluateRequirement({
      requirementId: '1',
      indexPattern: 'logs-*',
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-08T00:00:00Z',
      includeEvidence: false,
      esClient,
    });

    expect(result.status).toBe('NOT_ASSESSABLE');
    expect(result.confidence).toBe('NOT_ASSESSABLE');
  });

  it('returns GREEN when the coverage query finds matching events for a rows_mean_evidence requirement', async () => {
    mockExecuteEsql.mockResolvedValue({
      columns: [{ name: 'matching_events', type: 'long' }],
      values: [[42]],
    } as never);

    const result = await evaluateRequirement({
      requirementId: '1',
      indexPattern: 'logs-*',
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-08T00:00:00Z',
      includeEvidence: false,
      esClient: createEsClient(),
    });

    expect(result.status).toBe('GREEN');
    expect(result.evidenceCount).toBe(42);
  });

  it('omits evidence payloads when includeEvidence is false', async () => {
    mockExecuteEsql.mockResolvedValue({
      columns: [{ name: 'matching_events', type: 'long' }],
      values: [[3]],
    } as never);

    const result = await evaluateRequirement({
      requirementId: '1',
      indexPattern: 'logs-*',
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-08T00:00:00Z',
      includeEvidence: false,
      esClient: createEsClient(),
    });

    for (const finding of result.findings) {
      expect(finding.evidence).toBeUndefined();
    }
  });
});

describe('runWithConcurrency', () => {
  it('preserves input order regardless of completion order', async () => {
    const order = [30, 10, 20, 5];
    const tasks = order.map((delay, idx) => async () => {
      await new Promise((r) => setTimeout(r, delay));
      return idx;
    });

    const result = await runWithConcurrency(tasks, 2);
    expect(result).toEqual([0, 1, 2, 3]);
  });

  it('caps in-flight tasks at the configured limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const tasks = new Array(8).fill(null).map(() => async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return true;
    });

    await runWithConcurrency(tasks, 3);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('rejects limit <= 0', async () => {
    await expect(runWithConcurrency([async () => 1], 0)).rejects.toThrow('limit must be > 0');
  });
});
