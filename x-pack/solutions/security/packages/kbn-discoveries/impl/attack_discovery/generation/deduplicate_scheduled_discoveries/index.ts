/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  deduplicateAttackDiscoveries,
  getScheduledIndexPattern,
  normalizeAttackDiscovery,
} from '@kbn/attack-discovery-schedules-common';
import type { Replacements } from '@kbn/elastic-assistant-common';

export interface DeduplicateScheduledDiscoveriesParams {
  /**
   * Isomorphic sha256 hasher injected by the scheduled executor so this layer
   * computes byte-identical alert hashes to the executor without importing the
   * Node.js `crypto` builtin (disallowed in this shared package).
   */
  computeSha256Hash: (input: string) => string;
  connectorId: string;
  /** The persist step handover, in workflow (snake_case) shape. */
  discoveriesToPersist: unknown[];
  esClient: ElasticsearchClient;
  logger: Logger;
  replacements: Replacements | undefined;
  /** The trusted in-process rule id (schedule owner). */
  ruleId: string;
  spaceId: string;
}

/**
 * Cross-execution de-duplication for FF-on scheduled runs.
 *
 * Normalizes the persist step handover to the camelCase shape the shared alert
 * hash expects, then drops any discovery whose deterministic alert hash already
 * exists in the scheduled attack discovery alerts index for this space — so
 * re-running a schedule does not re-persist attacks already stored.
 *
 * Best-effort: an Elasticsearch failure logs and falls back to NO dedup
 * (returns the original handover unchanged) so it can never fail the run,
 * mirroring `backfillAttackIdsBestEffort`.
 */
export const deduplicateScheduledDiscoveries = async ({
  computeSha256Hash,
  connectorId,
  discoveriesToPersist,
  esClient,
  logger,
  replacements,
  ruleId,
  spaceId,
}: DeduplicateScheduledDiscoveriesParams): Promise<unknown[]> => {
  if (discoveriesToPersist.length === 0) {
    return discoveriesToPersist;
  }

  try {
    const attackDiscoveries = discoveriesToPersist.map((discovery) =>
      normalizeAttackDiscovery(discovery)
    );

    return await deduplicateAttackDiscoveries({
      attackDiscoveries,
      computeSha256Hash,
      connectorId,
      esClient,
      indexPattern: getScheduledIndexPattern(spaceId),
      logger,
      ownerInfo: { id: ruleId, isSchedule: true },
      replacements,
      spaceId,
    });
  } catch (error) {
    logger.error(
      `Scheduled attack discovery de-duplication failed (rule_id=${ruleId}); falling back to no dedup: ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    return discoveriesToPersist;
  }
};
