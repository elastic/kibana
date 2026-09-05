/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findAtMostOnceViolations } from './at_most_once_check';

const esqlResponse = (values: Array<[string, number, string[]]>) => ({
  columns: [
    { name: 'distinct_agents', type: 'long' },
    { name: 'agent_ids', type: 'keyword' },
    { name: 'monitor.id', type: 'keyword' },
  ],
  values: values.map(([monitorId, distinctAgents, agentIds]) => [
    distinctAgents,
    agentIds,
    monitorId,
  ]),
});

const mockEsClient = (response: unknown) => ({
  esql: { query: jest.fn().mockResolvedValue(response) },
});

describe('findAtMostOnceViolations', () => {
  it('returns no violations when the query has no rows', async () => {
    const esClient = mockEsClient(esqlResponse([]));

    expect(await findAtMostOnceViolations(esClient)).toEqual([]);
  });

  it('maps each row to a violation, preserving multivalued agent ids', async () => {
    const esClient = mockEsClient(
      esqlResponse([
        ['monitor-1', 2, ['agent-a', 'agent-b']],
        ['monitor-2', 3, ['agent-a', 'agent-b', 'agent-c']],
      ])
    );

    expect(await findAtMostOnceViolations(esClient)).toEqual([
      { monitorId: 'monitor-1', distinctAgents: 2, agentIds: ['agent-a', 'agent-b'] },
      { monitorId: 'monitor-2', distinctAgents: 3, agentIds: ['agent-a', 'agent-b', 'agent-c'] },
    ]);
  });

  it('wraps a single-value ES|QL column into an array', async () => {
    // ES|QL demotes a multivalued column to a scalar when every row has exactly
    // one value; a monitor with distinct_agents > 1 can never hit this in
    // practice, but the parser must not silently drop the agent id if it does.
    const esClient = mockEsClient({
      columns: [
        { name: 'distinct_agents', type: 'long' },
        { name: 'agent_ids', type: 'keyword' },
        { name: 'monitor.id', type: 'keyword' },
      ],
      values: [[2, 'agent-a', 'monitor-1']],
    });

    expect(await findAtMostOnceViolations(esClient)).toEqual([
      { monitorId: 'monitor-1', distinctAgents: 2, agentIds: ['agent-a'] },
    ]);
  });

  it('returns no violations when the response is missing an expected column', async () => {
    const esClient = mockEsClient({
      columns: [{ name: 'monitor.id', type: 'keyword' }],
      values: [['monitor-1']],
    });

    expect(await findAtMostOnceViolations(esClient)).toEqual([]);
  });

  it('queries the synthetics index with the at-most-once aggregation', async () => {
    const esClient = mockEsClient(esqlResponse([]));

    await findAtMostOnceViolations(esClient, {
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-01T01:00:00.000Z',
    });

    expect(esClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining('FROM synthetics-*'),
        params: [{ from: '2026-08-01T00:00:00.000Z' }, { to: '2026-08-01T01:00:00.000Z' }],
      })
    );
    const { query } = esClient.esql.query.mock.calls[0][0];
    expect(query).toContain('COUNT_DISTINCT(agent.id)');
    expect(query).toContain('BY monitor.id');
    expect(query).toContain('WHERE distinct_agents > 1');
  });

  it('defaults to a one-hour window ending now', async () => {
    const esClient = mockEsClient(esqlResponse([]));
    const before = Date.now();

    await findAtMostOnceViolations(esClient);

    const { params } = esClient.esql.query.mock.calls[0][0];
    const [{ from }, { to }] = params;
    const fromMs = Date.parse(from);
    const toMs = Date.parse(to);

    expect(toMs).toBeGreaterThanOrEqual(before);
    expect(toMs - fromMs).toBe(60 * 60 * 1000);
  });
});
