/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityOrigin } from './host_origin';
import {
  HostOrigins,
  MAX_ORIGIN_CLUSTERS,
  isKnownOrigin,
  originOfIndices,
  toEntityOrigin,
} from './host_origin';

const remoteB: EntityOrigin = { local: false, remote_clusters: ['cluster_b'] };
const localOnly: EntityOrigin = { local: true, remote_clusters: [] };

describe('originOfIndices', () => {
  it('reads an index with no cluster prefix as local', () => {
    expect(originOfIndices(['logs-endpoint.events-default'])).toEqual({
      local: true,
      remote_clusters: [],
    });
  });

  it('collects remote cluster aliases sorted and deduplicated', () => {
    expect(originOfIndices(['cluster_c:logs-a', 'cluster_b:logs-a', 'cluster_c:logs-b'])).toEqual({
      local: false,
      remote_clusters: ['cluster_b', 'cluster_c'],
    });
  });

  it('reads a mix of local and remote indices as local with the remote clusters named', () => {
    expect(originOfIndices(['logs-a', 'cluster_b:logs-a'])).toEqual({
      local: true,
      remote_clusters: ['cluster_b'],
    });
  });

  it('caps the cluster list at the schema bound', () => {
    const indices = Array.from({ length: MAX_ORIGIN_CLUSTERS + 5 }, (_, i) => `c${i}:logs-a`);

    const origin = originOfIndices(indices);

    expect(origin?.local).toBe(false);
    expect(origin?.remote_clusters).toHaveLength(MAX_ORIGIN_CLUSTERS);
  });

  it('leaves the origin unknown when there is no index to classify', () => {
    expect(originOfIndices([])).toBeUndefined();
  });
});

describe('isKnownOrigin', () => {
  it('needs a local sighting or a named cluster', () => {
    expect(isKnownOrigin(localOnly)).toBe(true);
    expect(isKnownOrigin(remoteB)).toBe(true);
    expect(isKnownOrigin({ local: false, remote_clusters: [] })).toBe(false);
  });
});

describe('toEntityOrigin', () => {
  it('reads the origin fields of an asset or entity', () => {
    expect(toEntityOrigin({ local: false, remote_clusters: ['cluster_b'] })).toEqual(remoteB);
    expect(toEntityOrigin({ local: true })).toEqual(localOnly);
  });

  it('reads an absent `local` as unknown', () => {
    expect(toEntityOrigin({})).toBeUndefined();
    expect(toEntityOrigin({ remote_clusters: ['cluster_b'] })).toBeUndefined();
  });

  it('reads a remote origin naming no cluster as unknown, not remote-only', () => {
    expect(toEntityOrigin({ local: false, remote_clusters: [] })).toBeUndefined();
    expect(toEntityOrigin({ local: false })).toBeUndefined();
  });
});

describe('HostOrigins', () => {
  const permutations = <T>(items: T[]): T[][] =>
    items.length <= 1
      ? [items]
      : items.flatMap((item, i) =>
          permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])
        );

  const originOfSightings = (sightings: Array<EntityOrigin | undefined>) => {
    const origins = new HostOrigins();
    for (const origin of sightings) origins.add('web-1', origin);
    return origins.originOf('web-1');
  };

  it('unions the clusters of remote sightings', () => {
    expect(originOfSightings([remoteB, { local: false, remote_clusters: ['cluster_a'] }])).toEqual({
      local: false,
      remote_clusters: ['cluster_a', 'cluster_b'],
    });
  });

  it('reads a single unknown sighting, or a name never seen, as unknown', () => {
    expect(originOfSightings([undefined])).toBeUndefined();
    expect(new HostOrigins().originOf('web-1')).toBeUndefined();
  });

  it('keeps a local sighting local next to an unknown one', () => {
    expect(originOfSightings([undefined, localOnly])).toEqual(localOnly);
  });

  it('keeps names apart', () => {
    const origins = new HostOrigins();
    origins.add('web-1', localOnly);
    origins.add('ubuntu', remoteB);

    expect(origins.originOf('web-1')).toEqual(localOnly);
    expect(origins.originOf('ubuntu')).toEqual(remoteB);
  });

  it.each(permutations([remoteB, undefined, localOnly]))(
    'reads remote, unknown and local sightings as local, keeping the cluster, in any order (%#)',
    (...sightings) => {
      expect(originOfSightings(sightings)).toEqual({
        local: true,
        remote_clusters: ['cluster_b'],
      });
    }
  );

  it.each(permutations([remoteB, undefined]))(
    // The unknown sighting could have been local, so "remote only" is not proven.
    'reads remote and unknown sightings as unknown in any order (%#)',
    (...sightings) => {
      expect(originOfSightings(sightings)).toBeUndefined();
    }
  );
});
