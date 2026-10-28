/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Feature, TopologySnapshotProperties } from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import { REVISION_SIZE_LIMIT } from '../knowledge_indicator_client/revision_reader';
import {
  TOPOLOGY_INPUT_FEATURE_TYPES,
  buildTopologySnapshot,
  topologyNeighborhood,
} from './build_topology_snapshot';

/** Computes topology snapshots from source KIs. */
export class TopologySnapshotClient {
  constructor(
    private readonly deps: {
      reader: Pick<KnowledgeIndicatorClient, 'getFeatures'>;
      logger: Logger;
      now?: () => Date;
    }
  ) {}

  async get(sourceIds: string[]): Promise<TopologySnapshotProperties> {
    const { reader, logger } = this.deps;
    const builtAt = (this.deps.now?.() ?? new Date()).toISOString();

    let features: Feature[] = [];
    if (sourceIds.length > 0) {
      ({ hits: features } = await reader.getFeatures(sourceIds, {
        type: [...TOPOLOGY_INPUT_FEATURE_TYPES],
        limit: REVISION_SIZE_LIMIT,
      }));
      if (features.length >= REVISION_SIZE_LIMIT) {
        logger.warn(
          `Topology read ${features.length} features, the revision read cap; the snapshot may be incomplete.`
        );
      }
    }

    const snapshot = buildTopologySnapshot({
      features,
      sourceIds,
      builtAt,
      inputTruncated: features.length >= REVISION_SIZE_LIMIT,
    });
    logger.debug(
      `Topology computed: ${snapshot.node_count} nodes, ${snapshot.edge_count} edges from ${
        features.length
      } features${snapshot.truncated ? ' (truncated)' : ''}`
    );
    return snapshot;
  }

  async neighborhood(
    seedIds: string[],
    sourceIds: string[]
  ): Promise<{ featureIds: string[]; truncated: boolean }> {
    const snapshot = await this.get(sourceIds);
    return {
      featureIds: topologyNeighborhood({ snapshot, seedIds }),
      truncated: snapshot.truncated,
    };
  }
}
