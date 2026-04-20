/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getSyntheticsIndices as buildSyntheticsIndices } from '../../common/get_synthetics_indices';
import type { SyntheticsCCSSettings } from '../../common/runtime_types';
import type { RemoteCluster } from '../../common/get_synthetics_indices';

export const getSyntheticsIndices = async (
  esClient: ElasticsearchClient,
  settings: SyntheticsCCSSettings
): Promise<{ indices: string }> => {
  const { useAllRemoteClusters, selectedRemoteClusters } = settings;

  if (useAllRemoteClusters || (!useAllRemoteClusters && selectedRemoteClusters.length === 0)) {
    return {
      indices: buildSyntheticsIndices({ useAllRemoteClusters, selectedRemoteClusters }).join(','),
    };
  }

  const clustersByName = await esClient.cluster.remoteInfo();
  const clusterNames = (clustersByName && Object.keys(clustersByName)) || [];
  const remoteClusters: RemoteCluster[] = clusterNames.map((clusterName) => ({
    name: clusterName,
    isConnected: clustersByName[clusterName].connected,
  }));

  return {
    indices: buildSyntheticsIndices({
      useAllRemoteClusters: settings.useAllRemoteClusters,
      selectedRemoteClusters: settings.selectedRemoteClusters,
      remoteClusters,
    }).join(','),
  };
};
