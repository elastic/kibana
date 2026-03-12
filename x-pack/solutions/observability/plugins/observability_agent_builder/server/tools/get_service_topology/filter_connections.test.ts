/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterDownstreamConnections, filterUpstreamConnections } from './filter_connections';
import type { ConnectionWithKey } from './types';

function makeServiceConnection(source: string, target: string): ConnectionWithKey {
  return {
    source: { 'service.name': source },
    target: { 'service.name': target },
    metrics: undefined,
    _key: `${source}->${target}`,
    _sourceName: source,
    _dependencyName: target,
  };
}

function makeExternalConnection(
  source: string,
  resource: string,
  spanType = 'db',
  spanSubtype = 'postgresql'
): ConnectionWithKey {
  return {
    source: { 'service.name': source },
    target: {
      'span.destination.service.resource': resource,
      'span.type': spanType,
      'span.subtype': spanSubtype,
    },
    metrics: undefined,
    _key: `${source}->${resource}`,
    _sourceName: source,
    _dependencyName: resource,
  };
}

function getConnectionKeys(connections: ConnectionWithKey[]) {
  return connections.map((c) => c._key).sort();
}

describe('filterDownstreamConnections', () => {
  it('returns only connections reachable from root', () => {
    const connections = [
      makeServiceConnection('A', 'B'),
      makeServiceConnection('B', 'C'),
      makeServiceConnection('X', 'Y'),
    ];

    const result = filterDownstreamConnections(connections, 'A');
    expect(getConnectionKeys(result)).toEqual(['A->B', 'B->C']);
  });

  it('returns empty when root has no outgoing connections', () => {
    const result = filterDownstreamConnections([makeServiceConnection('X', 'Y')], 'A');
    expect(result).toEqual([]);
  });

  it('handles cycles without infinite loop', () => {
    const connections = [
      makeServiceConnection('A', 'B'),
      makeServiceConnection('B', 'C'),
      makeServiceConnection('C', 'A'),
    ];

    expect(getConnectionKeys(filterDownstreamConnections(connections, 'A'))).toEqual([
      'A->B',
      'B->C',
      'C->A',
    ]);
  });

  it('includes external dependency connections', () => {
    const connections = [makeServiceConnection('A', 'B'), makeExternalConnection('B', 'postgres')];

    expect(getConnectionKeys(filterDownstreamConnections(connections, 'A'))).toEqual([
      'A->B',
      'B->postgres',
    ]);
  });

  it('respects maxDepth', () => {
    const connections = [
      makeServiceConnection('A', 'B'),
      makeServiceConnection('B', 'C'),
      makeServiceConnection('C', 'D'),
    ];

    expect(getConnectionKeys(filterDownstreamConnections(connections, 'A', 2))).toEqual([
      'A->B',
      'B->C',
    ]);
  });

  /*
   * BFS correctness: when a node is reachable via two paths at different depths,
   * BFS discovers it at the minimum depth. This matters when maxDepth is set:
   *
   *   A → B (depth 1) → D (depth 2) → E (depth 3)
   *   A → C (depth 1) → B (depth 2, redundant)
   *
   * With DFS (pop), C→B might be processed before A→B, assigning B depth 2.
   * Then D would be at depth 3, which exceeds maxDepth=3 — losing D→E.
   * BFS (shift) always finds B at depth 1, so D is correctly at depth 2.
   */
  it('uses BFS to find nodes at minimum depth when multiple paths exist', () => {
    const connections = [
      makeServiceConnection('A', 'B'),
      makeServiceConnection('A', 'C'),
      makeServiceConnection('C', 'B'),
      makeServiceConnection('B', 'D'),
      makeServiceConnection('D', 'E'),
    ];

    expect(getConnectionKeys(filterDownstreamConnections(connections, 'A', 3))).toEqual([
      'A->B',
      'A->C',
      'B->D',
      'C->B',
      'D->E',
    ]);
  });
});

describe('filterUpstreamConnections', () => {
  it('returns only connections leading to root', () => {
    const connections = [
      makeServiceConnection('A', 'B'),
      makeServiceConnection('B', 'C'),
      makeServiceConnection('X', 'Y'),
    ];

    expect(getConnectionKeys(filterUpstreamConnections(connections, 'C'))).toEqual([
      'A->B',
      'B->C',
    ]);
  });

  it('returns empty when nothing points to root', () => {
    const result = filterUpstreamConnections([makeServiceConnection('X', 'Y')], 'A');
    expect(result).toEqual([]);
  });

  it('handles cycles without infinite loop', () => {
    const connections = [
      makeServiceConnection('A', 'B'),
      makeServiceConnection('B', 'C'),
      makeServiceConnection('C', 'A'),
    ];

    expect(getConnectionKeys(filterUpstreamConnections(connections, 'A'))).toEqual([
      'A->B',
      'B->C',
      'C->A',
    ]);
  });

  it('finds upstream callers of external dependency by dependency name', () => {
    const connections = [makeServiceConnection('A', 'B'), makeExternalConnection('B', 'postgres')];

    expect(getConnectionKeys(filterUpstreamConnections(connections, 'postgres'))).toEqual([
      'A->B',
      'B->postgres',
    ]);
  });

  it('respects maxDepth', () => {
    const connections = [
      makeServiceConnection('A', 'B'),
      makeServiceConnection('B', 'C'),
      makeServiceConnection('C', 'D'),
    ];

    expect(getConnectionKeys(filterUpstreamConnections(connections, 'D', 2))).toEqual([
      'B->C',
      'C->D',
    ]);
  });

  /*
   * Same BFS correctness concern as downstream, but in reverse:
   * when a service has multiple callers at different depths, BFS ensures
   * the minimum depth is used.
   */
  it('uses BFS to find callers at minimum depth when multiple paths exist', () => {
    const connections = [
      makeServiceConnection('B', 'A'),
      makeServiceConnection('C', 'B'),
      makeServiceConnection('D', 'B'),
      makeServiceConnection('D', 'C'),
      makeServiceConnection('E', 'D'),
    ];

    expect(getConnectionKeys(filterUpstreamConnections(connections, 'A', 3))).toEqual([
      'B->A',
      'C->B',
      'D->B',
      'D->C',
      'E->D',
    ]);
  });
});
