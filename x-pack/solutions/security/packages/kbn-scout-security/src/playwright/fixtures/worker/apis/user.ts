/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

/** User name indexed by the user fixture and rendered as a clickable cell in the alerts table. */
export const USER_NAME = 'scout-user' as const;
/** Host ID required to derive the local user entity's canonical EUID. */
export const USER_HOST_ID = 'scout-user-host' as const;

const getSourceIndex = (spaceId: string) => `scout-user-source-${spaceId}`;

export interface UserFixture {
  /** Index containing the source event; pass as the detection rule's target index. */
  sourceIndex: string;
}

export interface UserApiService {
  /**
   * Indexes a source document containing `user.name` and `host.id` so that the alert can resolve
   * the local user's canonical EUID and render a clickable user-details cell.
   *
   * Index naming is space-scoped so parallel workers never collide.
   */
  createUserFixture: (spaceId: string) => Promise<UserFixture>;
  /**
   * Deletes the source index created by `createUserFixture`.
   * Safe to call even if the index was never created.
   */
  cleanupUserFixture: (spaceId: string) => Promise<void>;
}

export const getUserApiService = ({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ScoutLogger;
}): UserApiService => ({
  createUserFixture: async (spaceId) => {
    const sourceIndex = getSourceIndex(spaceId);

    await measurePerformanceAsync(log, 'security.user.createUserFixture', async () => {
      await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });

      await esClient.index({
        index: sourceIndex,
        document: {
          '@timestamp': new Date().toISOString(),
          user: { name: USER_NAME },
          host: { id: USER_HOST_ID },
          event: { kind: 'event' },
        },
        refresh: true,
      });
    });

    return { sourceIndex };
  },

  cleanupUserFixture: async (spaceId) => {
    const sourceIndex = getSourceIndex(spaceId);
    await measurePerformanceAsync(log, 'security.user.cleanupUserFixture', async () => {
      await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });
    });
  },
});
