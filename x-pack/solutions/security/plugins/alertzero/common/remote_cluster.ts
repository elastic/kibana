/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RemoteClusterName {
  /** The remote cluster alias before the first `:`; undefined for a local name. */
  cluster?: string;
  /** The index, data stream, or pattern on that cluster. */
  index: string;
}

/**
 * Splits a cross-cluster `<cluster>:<index>` name (`infosec_zocalo:.ds-logs-aws...`) into its
 * cluster alias and index part. A `::` is a selector (`logs-*::failures`), not a cluster
 * separator, so a name whose first `:` starts one stays local, selector included.
 */
export const splitRemoteCluster = (name: string): RemoteClusterName => {
  const separator = name.indexOf(':');
  if (separator <= 0 || name[separator + 1] === ':') return { index: name };
  return { cluster: name.slice(0, separator), index: name.slice(separator + 1) };
};

/** Puts a `<cluster>:` prefix back in front of an index part; a local name stays bare. */
export const joinRemoteCluster = ({ cluster, index }: RemoteClusterName): string =>
  cluster === undefined ? index : `${cluster}:${index}`;

/** Rewrites the index part of a name and keeps its `<cluster>:` prefix, if any. */
export const mapIndexPart = (name: string, transform: (index: string) => string): string => {
  const { cluster, index } = splitRemoteCluster(name);
  return joinRemoteCluster({ cluster, index: transform(index) });
};

/** Prefix of a data stream's backing indices (`.ds-logs-okta.system-default-2026.09.30-000001`). */
export const DATA_STREAM_BACKING_PREFIX = '.ds-';

/** Drops a data stream backing prefix from the index part, keeping any `<cluster>:` prefix. */
export const stripBackingPrefix = (name: string): string =>
  mapIndexPart(name, (index) =>
    index.startsWith(DATA_STREAM_BACKING_PREFIX)
      ? index.slice(DATA_STREAM_BACKING_PREFIX.length)
      : index
  );

export interface IndexScopeEntry extends RemoteClusterName {
  /** True for an exclusion; `index` then holds the excluded pattern without its `-`. */
  exclude: boolean;
}

/**
 * Reads one multi-target entry the way Elasticsearch does: `-pattern` excludes a local pattern,
 * `-cluster:*` a whole remote cluster, and `cluster:-pattern` (or `-cluster:pattern`, accepted
 * since 9.5) a pattern on that cluster. Anything else is a positive pattern.
 */
export const parseIndexScopeEntry = (entry: string): IndexScopeEntry => {
  if (entry.startsWith('-')) return { exclude: true, ...splitRemoteCluster(entry.slice(1)) };
  const { cluster, index } = splitRemoteCluster(entry);
  if (cluster !== undefined && index.startsWith('-')) {
    return { exclude: true, cluster, index: index.slice(1) };
  }
  return { exclude: false, cluster, index };
};

/** Whether a multi-target entry excludes rather than includes, local or remote. */
export const isIndexExclusion = (entry: string): boolean => parseIndexScopeEntry(entry).exclude;
