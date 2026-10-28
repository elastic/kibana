/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitRemoteCluster } from '../../../../../common/remote_cluster';

/** The schema cap on `remote_clusters` everywhere an origin is carried. */
export const MAX_ORIGIN_CLUSTERS = 20;

/** Where an entity was seen: on a local index, on remote clusters, or both. */
export interface EntityOrigin {
  local: boolean;
  remote_clusters: string[];
}

/**
 * Whether an origin says anything: an origin naming no local index and no cluster is no
 * evidence of being remote-only, so it is read as unknown.
 */
export const isKnownOrigin = (origin: EntityOrigin): boolean =>
  origin.local || origin.remote_clusters.length > 0;

/**
 * Classifies concrete `_index` values by their `<cluster>:` prefix. Undefined when there is
 * no index to classify.
 */
export const originOfIndices = (indices: Iterable<string>): EntityOrigin | undefined => {
  let local = false;
  const clusters = new Set<string>();
  for (const index of indices) {
    const { cluster } = splitRemoteCluster(index);
    if (cluster === undefined) local = true;
    else clusters.add(cluster);
  }
  const origin = { local, remote_clusters: [...clusters].sort().slice(0, MAX_ORIGIN_CLUSTERS) };
  return isKnownOrigin(origin) ? origin : undefined;
};

/** Reads the optional origin fields of an asset or entity; absent or empty means unknown. */
export const toEntityOrigin = ({
  local,
  remote_clusters: remoteClusters,
}: {
  local?: boolean;
  remote_clusters?: string[];
}): EntityOrigin | undefined => {
  if (local === undefined) return undefined;
  const origin = { local, remote_clusters: remoteClusters ?? [] };
  return isKnownOrigin(origin) ? origin : undefined;
};

interface Sightings {
  local: boolean;
  unknown: boolean;
  clusters: Set<string>;
}

/**
 * Every sighting of each name, folded into one origin per name by `originOf`. Sightings are
 * kept rather than merged pairwise so the answer does not depend on the order they arrive in.
 */
export class HostOrigins {
  private readonly sightings = new Map<string, Sightings>();

  /** Records one sighting of `name`; `undefined` is a sighting whose origin is unknown. */
  add(name: string, origin: EntityOrigin | undefined): void {
    const entry = this.sightings.get(name) ?? { local: false, unknown: false, clusters: new Set() };
    if (origin === undefined) {
      entry.unknown = true;
    } else {
      entry.local ||= origin.local;
      for (const cluster of origin.remote_clusters) entry.clusters.add(cluster);
    }
    this.sightings.set(name, entry);
  }

  /**
   * Local when any sighting was local. Otherwise any unknown sighting makes the name
   * unknown, since it could have been local; only then is it remote-only.
   */
  originOf(name: string): EntityOrigin | undefined {
    const entry = this.sightings.get(name);
    if (entry === undefined || (!entry.local && entry.unknown)) return undefined;
    const origin = {
      local: entry.local,
      remote_clusters: [...entry.clusters].sort().slice(0, MAX_ORIGIN_CLUSTERS),
    };
    return isKnownOrigin(origin) ? origin : undefined;
  }
}
