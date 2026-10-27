/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TraversalHop,
  TraversalLimits,
} from '../../../../common/workflows/step_types/entity_graph_traversal/entity_graph_traversal_common';
import {
  HOP_COUNT_COLUMN,
  HOP_SOURCE_COLUMN,
  HOP_TARGET_COLUMN,
  hopPayloadColumn,
} from './build_hop_query';
import { runHop, type EsqlResult, type ExecuteHopQuery } from './run_hop';

const hop: TraversalHop = {
  hop_number: 1,
  name: 'assets',
  index: 'assets-*',
  match_field: 'entity.id',
  target_fields: [
    { field: 'rel.can_assume', relation: 'can_assume' },
    { field: 'rel.runs_as', relation: 'runs_as' },
  ],
  payload_fields: ['entity.name'],
  target_type: 'asset',
};

const limits: TraversalLimits = {
  max_hops: 6,
  max_nodes: 100,
  max_frontier: 10,
  max_edges_per_hop: 100,
  max_edges_total: 100,
  hub_degree: 50,
};

/** Build an ES|QL-shaped result: rows of [source, target, count, payload]. */
const result = (rows: Array<[string, string, number?, unknown?]>): EsqlResult => ({
  columns: [
    { name: HOP_SOURCE_COLUMN, type: 'keyword' },
    { name: HOP_TARGET_COLUMN, type: 'keyword' },
    { name: HOP_COUNT_COLUMN, type: 'long' },
    { name: hopPayloadColumn(0), type: 'keyword' },
  ],
  values: rows.map(([source, target, count = 1, payload = null]) => [
    source,
    target,
    count,
    payload,
  ]),
});

/** One canned result per target field, in target_fields order. */
const executor = (perField: EsqlResult[]): ExecuteHopQuery & { calls: string[][] } => {
  const calls: string[][] = [];
  let i = 0;
  const execute = async ({ params }: { params: string[] }) => {
    calls.push(params);
    return perField[i++] ?? result([]);
  };
  return Object.assign(execute, { calls });
};

describe('runHop', () => {
  it('removes excluded entity ids from the frontier and excluded targets from the edges', async () => {
    const execute = executor([
      result([
        ['role-a', 'role-b'],
        ['role-a', 'role-x'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        frontier: ['role-a', 'role-x'],
        visited: ['seed', 'role-a', 'role-x'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
        exclusions: [
          { field: 'entity.id', values: ['role-x'] },
          { field: 'cloud.account.id', values: ['1'] },
        ],
      },
      execute
    );
    // role-x is not expanded; both exclusions also travel as document filter parameters.
    expect(execute.calls).toEqual([
      ['role-a', 'role-x', '1'],
      ['role-a', 'role-x', '1'],
    ]);
    expect(out.edges.map((edge) => edge.target)).toEqual(['role-b']);
    expect(out.nodes.map((node) => node.id)).toEqual(['role-b']);
    expect(out.stats).toMatchObject({
      frontier_size: 2,
      frontier_expanded: 1,
      excluded_frontier: 1,
      excluded_edges: 1,
      edges_added: 1,
    });
  });

  it('expands the frontier, returns edges and new nodes, and reports a continuing run', async () => {
    const execute = executor([
      result([
        ['role-a', 'role-b', 3, 'Role A'],
        ['role-a', 'role-c', 1, ['Role A', 'alias']],
      ]),
      result([['role-a', 'i-1', 2, 'Role A']]),
    ]);
    const out = await runHop(
      {
        hop,
        frontier: ['role-a'],
        visited: ['seed', 'role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(execute.calls).toEqual([['role-a'], ['role-a']]);
    expect(out.edges).toEqual([
      {
        hop: 1,
        relation: 'can_assume',
        source: 'role-a',
        target: 'role-b',
        count: 3,
        payload: { 'entity.name': ['Role A'] },
      },
      {
        hop: 1,
        relation: 'can_assume',
        source: 'role-a',
        target: 'role-c',
        count: 1,
        payload: { 'entity.name': ['Role A', 'alias'] },
      },
      {
        hop: 1,
        relation: 'runs_as',
        source: 'role-a',
        target: 'i-1',
        count: 2,
        payload: { 'entity.name': ['Role A'] },
      },
    ]);
    expect(out.nodes).toEqual([
      { id: 'role-b', hop: 1, via: 'can_assume', type: 'asset' },
      { id: 'role-c', hop: 1, via: 'can_assume', type: 'asset' },
      { id: 'i-1', hop: 1, via: 'runs_as', type: 'asset' },
    ]);
    expect(out.next_frontier).toEqual(['role-b', 'role-c', 'i-1']);
    expect(out.visited).toEqual(['seed', 'role-a', 'role-b', 'role-c', 'i-1']);
    expect(out.truncated).toBe(false);
    expect(out.stop_reason).toBe('');
    expect(out.stats).toMatchObject({ queries: 2, rows_returned: 3, edges_added: 3, new_nodes: 3 });
  });

  it('keeps closing edges onto visited nodes without re-admitting them', async () => {
    const execute = executor([
      result([
        ['role-a', 'seed'],
        ['role-a', 'role-b'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        frontier: ['role-a'],
        visited: ['seed', 'role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(out.edges.map((e) => e.target)).toEqual(['seed', 'role-b']);
    expect(out.next_frontier).toEqual(['role-b']);
    expect(out.stats.closing_edges).toBe(1);
  });

  it('drops rows whose source is not in the frontier', async () => {
    const execute = executor([
      result([
        ['other', 'x'],
        ['role-a', 'y'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        frontier: ['role-a'],
        visited: ['role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(out.edges.map((e) => e.target)).toEqual(['y']);
  });

  it('stops with frontier_exhausted when nothing new is reached', async () => {
    const execute = executor([result([]), result([])]);
    const out = await runHop(
      {
        hop,
        frontier: ['role-a'],
        visited: ['role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(out.stop_reason).toBe('frontier_exhausted');
    expect(out.next_frontier).toEqual([]);
  });

  it('stops without querying when the frontier is empty', async () => {
    const execute = executor([]);
    const out = await runHop(
      { hop, frontier: [], visited: ['seed'], edgesSoFar: 0, truncatedSoFar: false, limits },
      execute
    );
    expect(execute.calls).toEqual([]);
    expect(out.stop_reason).toBe('frontier_exhausted');
  });

  it('caps the frontier at max_frontier and marks the run truncated', async () => {
    const execute = executor([result([]), result([])]);
    const frontier = Array.from({ length: 15 }, (_, i) => `n${i}`);
    const out = await runHop(
      { hop, frontier, visited: frontier, edgesSoFar: 0, truncatedSoFar: false, limits },
      execute
    );
    expect(execute.calls[0]).toHaveLength(10);
    expect(out.truncated).toBe(true);
    expect(out.stats).toMatchObject({
      frontier_size: 15,
      frontier_expanded: 10,
      dropped_frontier: 5,
    });
  });

  it('stops before querying when the node budget is already spent', async () => {
    const execute = executor([]);
    const visited = Array.from({ length: limits.max_nodes }, (_, i) => `n${i}`);
    const out = await runHop(
      { hop, frontier: ['n0'], visited, edgesSoFar: 0, truncatedSoFar: false, limits },
      execute
    );
    expect(execute.calls).toEqual([]);
    expect(out.stop_reason).toBe('max_nodes');
    expect(out.truncated).toBe(true);
  });

  it('stops before querying when the edge budget is already spent', async () => {
    const execute = executor([]);
    const out = await runHop(
      {
        hop,
        frontier: ['a'],
        visited: ['a'],
        edgesSoFar: limits.max_edges_total,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(execute.calls).toEqual([]);
    expect(out.stop_reason).toBe('max_edges_total');
  });

  it('admits only as many new nodes as the budget allows', async () => {
    const execute = executor([
      result([
        ['a', 'b'],
        ['a', 'c'],
        ['a', 'd'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        frontier: ['a'],
        visited: ['a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits: { ...limits, max_nodes: 3 },
      },
      execute
    );
    expect(out.edges).toHaveLength(3);
    expect(out.next_frontier).toEqual(['b', 'c']);
    expect(out.stop_reason).toBe('max_nodes');
    expect(out.truncated).toBe(true);
  });

  it('keeps only as many edges as the total budget allows', async () => {
    const execute = executor([
      result([
        ['a', 'b'],
        ['a', 'c'],
        ['a', 'd'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      { hop, frontier: ['a'], visited: ['a'], edgesSoFar: 98, truncatedSoFar: false, limits },
      execute
    );
    expect(out.edges.map((e) => e.target)).toEqual(['b', 'c']);
    expect(out.stats.dropped_edges).toBe(1);
    expect(out.stop_reason).toBe('max_edges_total');
    expect(out.truncated).toBe(true);
  });

  it('skips hub sources with more distinct targets than hub_degree', async () => {
    const hubRows: Array<[string, string]> = Array.from({ length: 4 }, (_, i) => ['hub', `t${i}`]);
    const execute = executor([result([...hubRows, ['small', 'u']]), result([])]);
    const out = await runHop(
      {
        hop,
        frontier: ['hub', 'small'],
        visited: ['hub', 'small'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits: { ...limits, hub_degree: 3 },
      },
      execute
    );
    expect(out.edges.map((e) => `${e.source}->${e.target}`)).toEqual(['small->u']);
    expect(out.stats.hubs_skipped).toEqual(['hub']);
    expect(out.truncated).toBe(true);
    expect(out.stop_reason).toBe('');
  });

  it('marks the run truncated when a query returns a full page', async () => {
    const rows: Array<[string, string]> = Array.from({ length: 5 }, (_, i) => ['a', `t${i}`]);
    const execute = executor([result(rows), result([])]);
    const out = await runHop(
      {
        hop,
        frontier: ['a'],
        visited: ['a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits: { ...limits, max_edges_per_hop: 5 },
      },
      execute
    );
    expect(out.truncated).toBe(true);
    expect(out.stop_reason).toBe('');
  });

  it('carries an earlier truncation forward and deduplicates repeated edges', async () => {
    const execute = executor([
      result([
        ['a', 'b'],
        ['a', 'b'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      { hop, frontier: ['a', 'a'], visited: ['a'], edgesSoFar: 0, truncatedSoFar: true, limits },
      execute
    );
    expect(out.edges).toHaveLength(1);
    expect(out.truncated).toBe(true);
    expect(out.stats.frontier_size).toBe(1);
  });

  it('runs a single query for an EUID target and labels its edges with the hop relation', async () => {
    const euidHop: TraversalHop = {
      ...hop,
      name: 'indicators_to_hosts',
      match_field: undefined,
      match_fields: [
        { field: 'process.hash.sha256' },
        { field: 'destination.ip', value_type: 'ip' },
      ],
      target_fields: [],
      target_euid: { type: 'host', relation: 'observed_on' },
      target_type: 'host',
    };
    const execute = executor([
      result([
        ['hash-1', 'host:SRV-DC01'],
        ['1.2.3.4', 'host:WIN-FIN-03'],
      ]),
    ]);
    const out = await runHop(
      {
        hop: euidHop,
        frontier: ['hash-1', '1.2.3.4'],
        visited: ['host:WKSTN-RECV01', 'hash-1', '1.2.3.4'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(execute.calls).toHaveLength(1);
    expect(out.stats.queries).toBe(1);
    expect(out.edges.map((e) => [e.source, e.target, e.relation])).toEqual([
      ['hash-1', 'host:SRV-DC01', 'observed_on'],
      ['1.2.3.4', 'host:WIN-FIN-03', 'observed_on'],
    ]);
    expect(out.nodes.map((n) => [n.id, n.type, n.via])).toEqual([
      ['host:SRV-DC01', 'host', 'observed_on'],
      ['host:WIN-FIN-03', 'host', 'observed_on'],
    ]);
  });

  it('runs no query when a match_fields hop can bind none of the frontier', async () => {
    const ipOnlyHop: TraversalHop = {
      ...hop,
      match_field: undefined,
      match_fields: [{ field: 'destination.ip', value_type: 'ip' }],
    };
    const execute = executor([]);
    const out = await runHop(
      {
        hop: ipOnlyHop,
        frontier: ['not-an-address'],
        visited: ['not-an-address'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(execute.calls).toHaveLength(0);
    expect(out.stats.queries).toBe(0);
    expect(out.edges).toEqual([]);
    expect(out.stop_reason).toBe('frontier_exhausted');
  });
});
