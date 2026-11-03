/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Same shape as SLO settings: local index plus selected (or all) remotes. */
export interface RumCcsSettings {
  useAllRemoteClusters: boolean;
  selectedRemoteClusters: readonly string[];
}

export interface RumRemoteCluster {
  name: string;
  isConnected: boolean;
}

export interface RumCcsIndexOptions extends RumCcsSettings {
  remoteClusters?: readonly RumRemoteCluster[];
}

export const RUM_CCS_CLUSTER_NAME_MAX = 256;
export const RUM_CCS_CLUSTERS_MAX = 32;
export const RUM_CCS_CLUSTER_NAME = /^[A-Za-z0-9_\-]{1,256}$/;
export const RUM_REMOTE_CLUSTERS_API = '/internal/ux/rum/remote_clusters';

const splitIndexList = (index: string): string[] =>
  index
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const isPrefixed = (part: string): boolean => part.includes(':');

const remotePrefixes = ({
  useAllRemoteClusters,
  selectedRemoteClusters,
  remoteClusters = [],
}: RumCcsIndexOptions): string[] => {
  if (useAllRemoteClusters) {
    return ['*'];
  }
  if (selectedRemoteClusters.length === 0) {
    return [];
  }
  if (remoteClusters.length === 0) {
    return [...selectedRemoteClusters];
  }
  return remoteClusters
    .filter((cluster) => cluster.isConnected && selectedRemoteClusters.includes(cluster.name))
    .map((cluster) => cluster.name);
};

/**
 * Local index plus CCS remotes, matching SLO `getSLOSummaryIndices`.
 * Comma-separated patterns are prefixed per part. Already-prefixed parts stay as-is.
 */
export const expandRumCcsIndices = (index: string, options: RumCcsIndexOptions): string => {
  const prefixes = remotePrefixes(options);
  if (prefixes.length === 0) {
    return index;
  }
  const parts = splitIndexList(index);
  const locals = parts.filter((part) => !isPrefixed(part));
  const already = parts.filter(isPrefixed);
  const remotes = prefixes.flatMap((prefix) => locals.map((local) => `${prefix}:${local}`));
  return [...new Set([...locals, ...already, ...remotes])].join(',');
};

/** Expand `FROM a, b` with the same remote prefixes used for `_search`. */
export const expandRumEsqlFrom = (query: string, options: RumCcsIndexOptions): string => {
  if (remotePrefixes(options).length === 0) {
    return query;
  }
  const match = query.match(/^(\s*FROM\s+)(.+?)(\s*(?:\||$))/im);
  if (!match || match.index == null) {
    return query;
  }
  const args = match[2].replace(/\s+METADATA\b[\s\S]*$/i, '').trim();
  const expanded = expandRumCcsIndices(args, options);
  const start = match.index + match[1].length;
  return `${query.slice(0, start)}${expanded}${query.slice(start + match[2].length)}`;
};

export const normalizeRemoteClusterName = (value: string): string | undefined => {
  const name = value.trim();
  return RUM_CCS_CLUSTER_NAME.test(name) ? name : undefined;
};

export const normalizeSelectedRemoteClusters = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const names: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }
    const name = normalizeRemoteClusterName(item);
    if (name && !names.includes(name) && names.length < RUM_CCS_CLUSTERS_MAX) {
      names.push(name);
    }
  }
  return names;
};
