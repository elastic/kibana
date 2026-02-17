/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUMMARY_DESTINATION_INDEX_PATTERN } from './constants';

interface Props {
  useAllRemoteClusters: boolean;
  selectedRemoteClusters: string[];
  remoteClusters?: Array<{ name: string; isConnected: boolean }>;
}

/**
 * @returns the local SLO summary index or the remote cluster indices based on the settings.
 * If `useAllRemoteClusters` is false and no remote clusters are selected it returns only the local index.
 * If `useAllRemoteClusters` is true, it returns both the local index and a wildcard remote index.
 * If `useAllRemoteClusters` is false, it returns the local index and only the indices of the selected remote clusters that are connected.
 */
export function getSLOSummaryIndices({
  useAllRemoteClusters,
  selectedRemoteClusters,
  remoteClusters = [],
}: Props): string[] {
  if (!useAllRemoteClusters && selectedRemoteClusters.length === 0) {
    return [SUMMARY_DESTINATION_INDEX_PATTERN];
  }

  if (useAllRemoteClusters) {
    return [SUMMARY_DESTINATION_INDEX_PATTERN, `*:${SUMMARY_DESTINATION_INDEX_PATTERN}`];
  }

  return remoteClusters.reduce(
    (acc, { name, isConnected }) => {
      if (isConnected && selectedRemoteClusters.includes(name)) {
        acc.push(`${name}:${SUMMARY_DESTINATION_INDEX_PATTERN}`);
      }
      return acc;
    },
    [SUMMARY_DESTINATION_INDEX_PATTERN]
  );
}
