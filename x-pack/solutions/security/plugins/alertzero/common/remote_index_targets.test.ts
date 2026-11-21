/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REMOTE_INDEX_TARGETS_MAX_LENGTH, remoteIndexTargets } from './remote_index_targets';

const ENDPOINT_EVENTS_INDEX = 'logs-endpoint.events.*';
const ENDPOINT_EVENT_INDICES_MAX_LENGTH = REMOTE_INDEX_TARGETS_MAX_LENGTH;

// The Attack Discovery check reads one pattern: every case below is the single-target contract.
const endpointEventIndices = (patterns: readonly string[]): string =>
  remoteIndexTargets(patterns, [ENDPOINT_EVENTS_INDEX]).index;

describe('remoteIndexTargets with one local pattern', () => {
  it('adds one endpoint pattern per cluster alias in the data view', () => {
    expect(
      endpointEventIndices(['remote_a:logs-aws.cloudtrail*', 'remote_*:logs-*', 'logs-*'])
    ).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_a:${ENDPOINT_EVENTS_INDEX},remote_*:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('stays local when the data view names no cluster', () => {
    expect(endpointEventIndices(['logs-*', 'filebeat-*', 'endgame-*'])).toBe(ENDPOINT_EVENTS_INDEX);
  });

  it('does not search an excluded cluster, and does not name it when nothing would search it', () => {
    expect(
      endpointEventIndices([
        '-remote_a:logs-*',
        'remote_b:-logs-*',
        '-logs-*',
        'remote_kept:logs-*',
      ])
    ).toBe(`${ENDPOINT_EVENTS_INDEX},remote_kept:${ENDPOINT_EVENTS_INDEX}`);
  });

  it('keeps a wildcard include from searching an excluded cluster', () => {
    expect(endpointEventIndices(['*:logs-*', '-remote_excluded:*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},*:${ENDPOINT_EVENTS_INDEX},-remote_excluded:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('does not add a cluster the data view excludes, and does not name it', () => {
    expect(endpointEventIndices(['remote_excluded:logs-*', '-remote_excluded:*'])).toBe(
      ENDPOINT_EVENTS_INDEX
    );
  });

  it('keeps a stale excluded alias out of the target', () => {
    // Elasticsearch fails the whole request for an alias that is not a configured remote,
    // including one that only appears in an exclusion.
    expect(endpointEventIndices(['remote_a:logs-*', '-ghost:logs-*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_a:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('names an excluded cluster when a wildcard alias would search it', () => {
    expect(endpointEventIndices(['remote_*:logs-*', '-remote_a:logs-*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_*:${ENDPOINT_EVENTS_INDEX},-remote_a:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('does not name an exclusion that a different wildcard alias cannot reach', () => {
    expect(endpointEventIndices(['other_*:logs-*', '-remote_a:logs-*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},other_*:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('leaves a cluster in place when the exclusion does not cover endpoint events', () => {
    expect(endpointEventIndices(['remote_kept:logs-*', '-remote_kept:filebeat-*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_kept:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('passes a narrower endpoint exclusion through and keeps the cluster', () => {
    expect(
      endpointEventIndices(['remote_a:logs-*', '-remote_a:logs-endpoint.events.network-*'])
    ).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_a:${ENDPOINT_EVENTS_INDEX},-remote_a:logs-endpoint.events.network-*`
    );
  });

  it('does not treat a :: selector as a cluster separator', () => {
    expect(endpointEventIndices(['logs-*::failures'])).toBe(ENDPOINT_EVENTS_INDEX);
    expect(endpointEventIndices(['remote_a:logs-*::data'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_a:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('skips ES|QL mode prefixes', () => {
    expect(
      endpointEventIndices(['_any:logs-*', '_remote:logs-*', '_coordinator:logs-*', 'logs-*'])
    ).toBe(ENDPOINT_EVENTS_INDEX);
  });

  it('names each cluster alias once', () => {
    expect(endpointEventIndices(['remote_a:logs-*', 'remote_a:filebeat-*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_a:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('keeps a wildcard-all alias', () => {
    expect(endpointEventIndices(['*:logs-*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},*:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('returns the local pattern for an empty or unusable list', () => {
    expect(endpointEventIndices([])).toBe(ENDPOINT_EVENTS_INDEX);
    expect(endpointEventIndices(['', '   ', ':logs-*'])).toBe(ENDPOINT_EVENTS_INDEX);
  });

  it('treats a run of wildcards as one wildcard', () => {
    const stars = '*'.repeat(40);

    expect(endpointEventIndices(['remote_a:logs-*', `-remote_a:logs-${stars}`])).toBe(
      ENDPOINT_EVENTS_INDEX
    );
    expect(endpointEventIndices(['remote_a:logs-*', `-remote_a:logs-${stars}x`])).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_a:${ENDPOINT_EVENTS_INDEX},-remote_a:logs-${stars}x`
    );
  });

  it('drops a searched cluster when its exclusions do not fit', () => {
    const exclusions = Array.from({ length: 120 }, (_, index) => {
      const dataset = `logs-endpoint.events.network-${String(index).padStart(3, '0')}${'n'.repeat(
        30
      )}*`;
      return `-remote_a:${dataset}`;
    });
    const result = endpointEventIndices([
      '*:logs-*',
      'remote_a:logs-*',
      'remote_b:logs-*',
      ...exclusions,
    ]);
    const parts = result.split(',');

    expect(result.length).toBeLessThanOrEqual(ENDPOINT_EVENT_INDICES_MAX_LENGTH);
    expect(parts).not.toContain(`*:${ENDPOINT_EVENTS_INDEX}`);
    expect(parts).not.toContain(`remote_a:${ENDPOINT_EVENTS_INDEX}`);
    expect(parts).toContain(`remote_b:${ENDPOINT_EVENTS_INDEX}`);
  });

  it('drops an overlapping wildcard when a wildcard exclusion does not fit', () => {
    const exclusions = Array.from({ length: 120 }, (_, index) => {
      const dataset = `logs-endpoint.events.network-${String(index).padStart(3, '0')}${'n'.repeat(
        30
      )}*`;
      return `-remote_a*:${dataset}`;
    });
    const result = endpointEventIndices([
      '*:logs-*',
      'remote_*:logs-*',
      'other_*:logs-*',
      ...exclusions,
    ]);
    const parts = result.split(',');

    expect(result.length).toBeLessThanOrEqual(ENDPOINT_EVENT_INDICES_MAX_LENGTH);
    expect(parts).not.toContain(`*:${ENDPOINT_EVENTS_INDEX}`);
    expect(parts).not.toContain(`remote_*:${ENDPOINT_EVENTS_INDEX}`);
    expect(parts).toContain(`other_*:${ENDPOINT_EVENTS_INDEX}`);
  });

  it('stops adding aliases once the search target reaches its length cap', () => {
    const patterns = Array.from({ length: 200 }, (_, i) => `cluster${i}:logs-*`);

    expect(endpointEventIndices(patterns).length).toBeLessThanOrEqual(
      ENDPOINT_EVENT_INDICES_MAX_LENGTH
    );
    expect(endpointEventIndices(patterns).startsWith(ENDPOINT_EVENTS_INDEX)).toBe(true);
  });
});

describe('remoteIndexTargets with several local patterns', () => {
  const PROCESS = 'logs-endpoint.events.process-*';
  const NETWORK = 'logs-endpoint.events.network-*';

  it('adds every local pattern for each cluster alias', () => {
    expect(remoteIndexTargets(['remote_a:logs-*', 'logs-*'], [PROCESS, NETWORK])).toEqual({
      index: `${PROCESS},${NETWORK},remote_a:${PROCESS},remote_a:${NETWORK}`,
      clusters: ['remote_a'],
      incomplete: false,
    });
  });

  it('stays local, with no clusters, when the data view names none', () => {
    expect(remoteIndexTargets(['logs-*', 'filebeat-*'], [PROCESS, NETWORK])).toEqual({
      index: `${PROCESS},${NETWORK}`,
      clusters: [],
      incomplete: false,
    });
  });

  it('names each searched cluster once, in data view order', () => {
    expect(
      remoteIndexTargets(['remote_b:logs-*', 'remote_a:logs-*', 'remote_b:filebeat-*'], [PROCESS])
        .clusters
    ).toEqual(['remote_b', 'remote_a']);
  });

  it('drops only the pattern a remote exclusion covers, and does not name the exclusion', () => {
    expect(
      remoteIndexTargets(['remote_a:logs-*', `-remote_a:${PROCESS}`], [PROCESS, NETWORK])
    ).toEqual({
      index: `${PROCESS},${NETWORK},remote_a:${NETWORK}`,
      clusters: ['remote_a'],
      incomplete: false,
    });
  });

  it('reports no cluster, and names no exclusion, when an exclusion covers every pattern', () => {
    expect(
      remoteIndexTargets(
        ['remote_a:logs-*', '-remote_a:logs-endpoint.events.*'],
        [PROCESS, NETWORK]
      )
    ).toEqual({
      index: `${PROCESS},${NETWORK}`,
      clusters: [],
      incomplete: false,
    });
  });

  it('ignores an exclusion that matches none of the local patterns', () => {
    expect(
      remoteIndexTargets(['remote_a:logs-*', '-remote_a:filebeat-*'], [PROCESS, NETWORK]).index
    ).toBe(`${PROCESS},${NETWORK},remote_a:${PROCESS},remote_a:${NETWORK}`);
  });

  it('keeps the unrelated pattern of a cluster when an exclusion for the other does not fit', () => {
    const exclusions = Array.from(
      { length: 120 },
      (_, index) =>
        `-remote_a:logs-endpoint.events.network-${String(index).padStart(3, '0')}${'n'.repeat(30)}*`
    );
    const { index, clusters } = remoteIndexTargets(
      ['remote_a:logs-*', 'remote_b:logs-*', ...exclusions],
      [PROCESS, NETWORK]
    );
    const parts = index.split(',');

    expect(index.length).toBeLessThanOrEqual(REMOTE_INDEX_TARGETS_MAX_LENGTH);
    expect(parts).toContain(`remote_a:${PROCESS}`);
    expect(parts).not.toContain(`remote_a:${NETWORK}`);
    expect(parts).toContain(`remote_b:${NETWORK}`);
    expect(clusters).toEqual(['remote_a', 'remote_b']);
  });

  it('keeps the whole target under the length cap with several patterns', () => {
    const patterns = Array.from({ length: 200 }, (_, i) => `cluster${i}:logs-*`);
    const { index, clusters } = remoteIndexTargets(patterns, [PROCESS, NETWORK]);

    expect(index.length).toBeLessThanOrEqual(REMOTE_INDEX_TARGETS_MAX_LENGTH);
    expect(index.startsWith(`${PROCESS},${NETWORK}`)).toBe(true);
    expect(clusters.length).toBeLessThan(200);
  });

  it('ignores duplicate or empty local patterns', () => {
    expect(remoteIndexTargets(['remote_a:logs-*'], [PROCESS, '', PROCESS]).index).toBe(
      `${PROCESS},remote_a:${PROCESS}`
    );
  });
});

describe('remoteIndexTargets with a data view it cannot read in full', () => {
  const E = 'logs-endpoint.events.*';
  const filler = (count: number) => Array.from({ length: count }, (_, i) => `filler-${i}-*`);

  it('keeps an exclusion that follows the 200th entry by searching locally only', () => {
    // A wildcard include whose exclusion falls past the cap would otherwise read the excluded cluster.
    expect(remoteIndexTargets(['*:logs-*', ...filler(205), '-remote_private:*'], [E])).toEqual({
      index: E,
      clusters: [],
      incomplete: true,
    });
  });

  it('reads a list of exactly 200 entries in full', () => {
    expect(remoteIndexTargets(['*:logs-*', ...filler(198), '-remote_private:*'], [E])).toEqual({
      index: `${E},*:${E},-remote_private:${E}`,
      clusters: ['*'],
      incomplete: false,
    });
  });

  it('searches locally only when one entry is longer than the helper reads', () => {
    expect(
      remoteIndexTargets(['*:logs-*', `-remote_private:logs-${'a'.repeat(1100)}*`], [E])
    ).toEqual({ index: E, clusters: [], incomplete: true });
  });

  it('searches every local pattern when it falls back', () => {
    expect(remoteIndexTargets(filler(201), ['a-*', 'b-*'])).toEqual({
      index: 'a-*,b-*',
      clusters: [],
      incomplete: true,
    });
  });

  it('searches locally only when the data view is not a list', () => {
    expect(remoteIndexTargets(undefined as unknown as readonly string[], [E])).toEqual({
      index: E,
      clusters: [],
      incomplete: true,
    });
  });

  it('is complete for a data view that names no cluster', () => {
    expect(remoteIndexTargets(['logs-*', 'filebeat-*'], [E]).incomplete).toBe(false);
  });
});

describe('remoteIndexTargets and the length cap', () => {
  const E = 'logs-endpoint.events.*';
  const narrowExclusions = (cluster: string, count: number) =>
    Array.from(
      { length: count },
      (_, index) =>
        `-${cluster}:logs-endpoint.events.network-${String(index).padStart(3, '0')}${'n'.repeat(
          30
        )}*`
    );

  it('is incomplete when an include does not fit', () => {
    const patterns = Array.from({ length: 200 }, (_, i) => `cluster${i}:logs-*`);
    const { index, clusters, incomplete } = remoteIndexTargets(patterns, [E]);

    expect(index.length).toBeLessThanOrEqual(REMOTE_INDEX_TARGETS_MAX_LENGTH);
    expect(clusters.length).toBeLessThan(200);
    expect(incomplete).toBe(true);
  });

  it('is incomplete when an include is taken back out so its exclusion fits', () => {
    const { clusters, incomplete } = remoteIndexTargets(
      ['remote_a:logs-*', 'remote_b:logs-*', ...narrowExclusions('remote_a', 120)],
      [E]
    );

    expect(clusters).toEqual(['remote_b']);
    expect(incomplete).toBe(true);
  });

  it('is incomplete when a wildcard include is taken back out so its exclusion fits', () => {
    const { incomplete } = remoteIndexTargets(
      ['*:logs-*', 'remote_b:logs-*', ...narrowExclusions('remote_a*', 120)],
      [E]
    );

    expect(incomplete).toBe(true);
  });

  it('is incomplete when one of several local patterns cannot be added for a cluster', () => {
    const PROCESS = 'logs-endpoint.events.process-*';
    const NETWORK = 'logs-endpoint.events.network-*';
    const patterns = Array.from({ length: 80 }, (_, i) => `cluster_number_${i}:logs-*`);
    const { index, incomplete } = remoteIndexTargets(patterns, [PROCESS, NETWORK]);

    expect(index.length).toBeLessThanOrEqual(REMOTE_INDEX_TARGETS_MAX_LENGTH);
    expect(incomplete).toBe(true);
  });

  it('keeps the URL-encoded target inside the Elasticsearch request-line limit', () => {
    // The search step encodes the target into the path, and Elasticsearch rejects a line over 4096.
    const longAliases = Array.from({ length: 200 }, (_, i) => `fake_cluster_number_${i}:logs-*`);
    const shortAliases = Array.from({ length: 200 }, (_, i) => `c${i}:logs-*`);

    for (const patterns of [longAliases, shortAliases]) {
      const { index, incomplete } = remoteIndexTargets(patterns, [E]);

      expect(encodeURIComponent(index).length).toBeLessThanOrEqual(3900);
      expect(incomplete).toBe(true);
    }
  });

  it('is complete when a cluster is dropped only because the data view excludes it', () => {
    expect(remoteIndexTargets(['remote_a:logs-*', '-remote_a:*'], [E])).toEqual({
      index: E,
      clusters: [],
      incomplete: false,
    });
  });

  it('is complete when every include and exclusion fits', () => {
    expect(
      remoteIndexTargets(['remote_a:logs-*', '-remote_a:logs-endpoint.events.network-*'], [E])
        .incomplete
    ).toBe(false);
  });
});
