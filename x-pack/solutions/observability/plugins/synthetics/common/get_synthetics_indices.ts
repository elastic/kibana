/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_INDEX_PATTERN } from './constants';

/**
 * Resolves the index to query for a monitor, prefixing it with a remote cluster
 * alias when the monitor lives on a remote cluster (so it is queried via
 * Cross-Cluster Search). Returns the local pattern unchanged when `remoteName`
 * is not provided.
 *
 * `indexPattern` defaults to {@link SYNTHETICS_INDEX_PATTERN} — the value used
 * by virtually every caller — so only pass it for the rare cases that target a
 * different base, e.g. the alerts index (`.alerts-observability*`) or a
 * `SyntheticsEsClient`'s configurable `heartbeatIndices`.
 *
 * @example
 *   getSyntheticsCcsIndex();                          // 'synthetics-*'
 *   getSyntheticsCcsIndex('cluster');                 // 'cluster:synthetics-*'
 *   getSyntheticsCcsIndex('cluster', alertsPattern);  // 'cluster:.alerts-observability*'
 */
export const getSyntheticsCcsIndex = (
  remoteName?: string,
  indexPattern: string = SYNTHETICS_INDEX_PATTERN
): string => (remoteName ? `${remoteName}:${indexPattern}` : indexPattern);

export interface RemoteCluster {
  name: string;
  isConnected: boolean;
}

interface Props {
  useAllRemoteClusters: boolean;
  selectedRemoteClusters: string[];
  remoteClusters?: RemoteCluster[];
}

/**
 * @returns the local synthetics index or the remote cluster indices based on the CCS settings.
 * If `useAllRemoteClusters` is false and no remote clusters are selected, returns only the local index.
 * If `useAllRemoteClusters` is true, returns both the local index and a wildcard remote index.
 * If specific clusters are selected, returns the local index plus indices for connected selected clusters.
 */
export const getSyntheticsIndices = ({
  useAllRemoteClusters,
  selectedRemoteClusters,
  remoteClusters = [],
}: Props): string[] => {
  if (!useAllRemoteClusters && selectedRemoteClusters.length === 0) {
    return [SYNTHETICS_INDEX_PATTERN];
  }

  if (useAllRemoteClusters) {
    return [SYNTHETICS_INDEX_PATTERN, `*:${SYNTHETICS_INDEX_PATTERN}`];
  }

  return remoteClusters.reduce(
    (acc, { name, isConnected }) => {
      if (isConnected && selectedRemoteClusters.includes(name)) {
        acc.push(`${name}:${SYNTHETICS_INDEX_PATTERN}`);
      }
      return acc;
    },
    [SYNTHETICS_INDEX_PATTERN] as string[]
  );
};
