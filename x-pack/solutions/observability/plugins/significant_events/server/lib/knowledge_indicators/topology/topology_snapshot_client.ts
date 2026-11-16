/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Feature, TopologySnapshotProperties } from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import {
  TOPOLOGY_INPUT_FEATURE_TYPES,
  buildTopologySnapshot,
  topologyNeighborhoodSelection,
} from './build_topology_snapshot';

const TOPOLOGY_FEATURE_PAGE_SIZE = 5_000;
const MAX_TOPOLOGY_FEATURE_PAGES = 3;

export class TopologySnapshotClient {
  constructor(
    private readonly deps: {
      reader: Pick<KnowledgeIndicatorClient, 'getTopologyFeaturesPage'>;
      logger: Logger;
      now?: () => Date;
    }
  ) {}

  async get(sourceIds: string[]): Promise<TopologySnapshotProperties> {
    const { reader, logger } = this.deps;
    const builtAt = (this.deps.now?.() ?? new Date()).toISOString();

    const features: Feature[] = [];
    let truncated = false;
    if (sourceIds.length > 0) {
      let after: Parameters<KnowledgeIndicatorClient['getTopologyFeaturesPage']>[0]['after'];
      for (let pageNumber = 0; pageNumber < MAX_TOPOLOGY_FEATURE_PAGES; pageNumber++) {
        const page = await reader.getTopologyFeaturesPage({
          sourceIds,
          featureTypes: [...TOPOLOGY_INPUT_FEATURE_TYPES],
          asOf: builtAt,
          after,
          size: TOPOLOGY_FEATURE_PAGE_SIZE,
        });
        features.push(...page.hits);
        after = page.nextCursor;
        if (!after) {
          break;
        }
        if (pageNumber === MAX_TOPOLOGY_FEATURE_PAGES - 1) {
          truncated = true;
        }
      }
    }

    const snapshot = buildTopologySnapshot({
      features,
      sourceIds,
      builtAt,
      truncated,
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
  ): Promise<{ featureIds: string[]; selectedFeatureUuids: string[]; truncated: boolean }> {
    const snapshot = await this.get(sourceIds);
    const selection = topologyNeighborhoodSelection({ snapshot, seedIds });
    return {
      ...selection,
      truncated: snapshot.truncated,
    };
  }
}
