/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

export interface ThreatIntelligenceFixture {
  /** Index containing the source event; pass as the detection rule's target index. */
  sourceIndex: string;
}

export interface ThreatIntelligenceApiService {
  /**
   * Indexes a source event document with `file.hash.sha256` into the given index.
   * Use this to create a document that a detection rule can match, so the resulting
   * alert inherits the hash field for investigation-time enrichment.
   */
  indexSourceEvent: (options: { index: string; sha256: string }) => Promise<void>;
  /**
   * Indexes a minimal threat indicator document into the given index.
   * The index should match `logs-ti_*` (the default threat index pattern) so the
   * flyout's investigation-time enrichment query picks it up.
   */
  indexThreatIndicator: (options: { index: string; sha256: string }) => Promise<void>;
  /**
   * Deletes one or more indices, ignoring missing ones. Use in teardown to clean up
   * test-only indices created by the methods above.
   */
  deleteIndices: (indices: string[]) => Promise<void>;
  /**
   * Creates a space-isolated source event and a matching threat indicator, then
   * returns a fixture with the `sourceIndex` to target from a detection rule.
   *
   * Index naming is space-scoped so parallel workers never collide with each other
   * or with pre-existing data in the cluster.
   */
  createFileHashEnrichmentFixture: (spaceId: string) => Promise<ThreatIntelligenceFixture>;
  /**
   * Deletes the source and indicator indices created by `createFileHashEnrichmentFixture`.
   * Safe to call even if the indices were never created (`ignore_unavailable: true`).
   * Call this unconditionally in `afterEach` so cleanup always runs, even when
   * `createFileHashEnrichmentFixture` throws partway through.
   */
  cleanupFileHashEnrichmentFixture: (spaceId: string) => Promise<void>;
}

export const getThreatIntelligenceApiService = ({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ScoutLogger;
}): ThreatIntelligenceApiService => {
  const service: ThreatIntelligenceApiService = {
    indexSourceEvent: async ({ index, sha256 }) => {
      await measurePerformanceAsync(
        log,
        'security.threatIntelligence.indexSourceEvent',
        async () => {
          await esClient.index({
            index,
            document: {
              '@timestamp': new Date().toISOString(),
              file: { hash: { sha256 } },
            },
            refresh: true,
          });
        }
      );
    },

    indexThreatIndicator: async ({ index, sha256 }) => {
      await measurePerformanceAsync(
        log,
        'security.threatIntelligence.indexThreatIndicator',
        async () => {
          await esClient.index({
            index,
            document: {
              '@timestamp': new Date().toISOString(),
              event: { kind: 'enrichment', category: 'threat', type: 'indicator' },
              threat: {
                indicator: { type: 'file', file: { hash: { sha256 } } },
                feed: { name: 'Scout Test Feed' },
              },
            },
            refresh: true,
          });
        }
      );
    },

    deleteIndices: async (indices) => {
      await measurePerformanceAsync(log, 'security.threatIntelligence.deleteIndices', async () => {
        // Indices matching logs-* are auto-created as data streams by the Fleet index
        // template. Data streams are silently ignored by indices.delete, so we attempt
        // a data stream deletion first, then fall back to regular index deletion.
        await esClient.indices.deleteDataStream({ name: indices }).catch(() => {});
        await esClient.indices.delete({ index: indices, ignore_unavailable: true });
      });
    },

    createFileHashEnrichmentFixture: async (spaceId) => {
      const sha256 = `scout-ti-test-${spaceId}`;
      const sourceIndex = `scout-ti-source-${spaceId}`;
      // logs-ti_* is the default threat index pattern queried by investigation-time enrichment
      const indicatorIndex = `logs-ti_scout_${spaceId}`;

      // Delete before creating so stale documents from a crashed prior run don't accumulate.
      await service.deleteIndices([sourceIndex, indicatorIndex]);
      await service.indexSourceEvent({ index: sourceIndex, sha256 });
      await service.indexThreatIndicator({ index: indicatorIndex, sha256 });

      return { sourceIndex };
    },

    cleanupFileHashEnrichmentFixture: async (spaceId) => {
      const sourceIndex = `scout-ti-source-${spaceId}`;
      const indicatorIndex = `logs-ti_scout_${spaceId}`;
      await service.deleteIndices([sourceIndex, indicatorIndex]);
    },
  };

  return service;
};
