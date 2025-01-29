/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOSettingsResponse } from '@kbn/slo-schema';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from './constants';

export const getListOfSloSummaryIndices = (
  settings: GetSLOSettingsResponse,
  clustersByName: Array<{ name: string; isConnected: boolean }>
) => {
  const { useAllRemoteClusters, selectedRemoteClusters } = settings;
  if (!useAllRemoteClusters && selectedRemoteClusters.length === 0) {
    return SUMMARY_DESTINATION_INDEX_PATTERN;
  }

  const indices: string[] = [SUMMARY_DESTINATION_INDEX_PATTERN];
  clustersByName.forEach(({ name, isConnected }) => {
    if (isConnected && (useAllRemoteClusters || selectedRemoteClusters.includes(name))) {
      indices.push(`${name}:${SUMMARY_DESTINATION_INDEX_PATTERN}`);
    }
  });

  return indices.join(',');
};
