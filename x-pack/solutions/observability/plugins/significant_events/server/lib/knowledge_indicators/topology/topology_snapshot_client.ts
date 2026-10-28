/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  Feature,
  TopologySnapshotProperties,
  TopologySnapshotSummary,
} from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import { REVISION_SIZE_LIMIT } from '../knowledge_indicator_client/revision_reader';
import {
  TOPOLOGY_INPUT_FEATURE_TYPES,
  buildTopologySnapshot,
  topologyNeighborhood,
} from './build_topology_snapshot';

/** Computes the topology from the KIs of the given sources; KIs are read as the internal user, so callers pass sources the user can read. */
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

    const snapshot = buildTopologySnapshot({ features, sourceIds, builtAt });
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
  ): Promise<{ featureIds: string[]; snapshot: TopologySnapshotSummary }> {
    const snapshot = await this.get(sourceIds);
    const { built_at: builtAt, node_count: nodeCount, edge_count: edgeCount, truncated } = snapshot;
    return {
      featureIds: topologyNeighborhood({ snapshot, seedIds }),
      snapshot: { built_at: builtAt, node_count: nodeCount, edge_count: edgeCount, truncated },
    };
  }
}
