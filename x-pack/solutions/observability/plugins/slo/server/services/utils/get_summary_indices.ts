/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getSLOSummaryIndices } from '../../../common/get_slo_summary_indices';
import type { SLOSettings } from '../../domain/models';

export const getSummaryIndices = async (
  esClient: ElasticsearchClient,
  settings: SLOSettings
): Promise<{ indices: string[] }> => {
  const { useAllRemoteClusters, selectedRemoteClusters } = settings;
  // If remote clusters are not used, we don't need to fetch the remote cluster info
  if (useAllRemoteClusters || (!useAllRemoteClusters && selectedRemoteClusters.length === 0)) {
    return {
      indices: getSLOSummaryIndices({ useAllRemoteClusters, selectedRemoteClusters }),
    };
  }

  const clustersByName = await esClient.cluster.remoteInfo();
  const clusterNames = (clustersByName && Object.keys(clustersByName)) || [];
  const remoteClusters = clusterNames.map((clusterName) => ({
    name: clusterName,
    isConnected: clustersByName[clusterName].connected,
  }));

  return {
    indices: getSLOSummaryIndices({
      useAllRemoteClusters: settings.useAllRemoteClusters,
      selectedRemoteClusters: settings.selectedRemoteClusters,
      remoteClusters,
    }),
  };
};
