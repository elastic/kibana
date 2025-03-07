/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOSettingsResponse } from '@kbn/slo-schema';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from './constants';

export const getSLOSummaryIndices = (
  settings: GetSLOSettingsResponse,
  remoteClusters: Array<{ name: string; isConnected: boolean }>
): string[] => {
  const { useAllRemoteClusters, selectedRemoteClusters } = settings;
  if (!useAllRemoteClusters && selectedRemoteClusters.length === 0) {
    return [SUMMARY_DESTINATION_INDEX_PATTERN];
  }

  return remoteClusters.reduce(
    (acc, { name, isConnected }) => {
      if (isConnected && (useAllRemoteClusters || selectedRemoteClusters.includes(name))) {
        acc.push(`${name}:${SUMMARY_DESTINATION_INDEX_PATTERN}`);
      }
      return acc;
    },
    [SUMMARY_DESTINATION_INDEX_PATTERN]
  );
};
