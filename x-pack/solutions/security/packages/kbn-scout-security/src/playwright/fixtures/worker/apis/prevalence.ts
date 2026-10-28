/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

export const PREVALENCE_SOURCE_IP = '1.2.3.4' as const;
export const PREVALENCE_DESTINATION_IP = '5.6.7.8' as const;
export const PREVALENCE_HOST_NAME = 'scout-host' as const;
export const PREVALENCE_USER_NAME = 'scout-user' as const;

export interface PrevalenceFixture {
  /** Index containing the source events; pass as the detection rule's target index. */
  sourceIndex: string;
}

export interface PrevalenceApiService {
  /**
   * Indexes a source document containing linked investigation fields used by the
   * document-flyout and prevalence tests.
   *
   * Index naming is space-scoped so parallel workers never collide.
   */
  createPrevalenceFixture: (spaceId: string) => Promise<PrevalenceFixture>;
  /**
   * Deletes the source index created by `createPrevalenceFixture`.
   * Safe to call even if the index was never created.
   */
  cleanupPrevalenceFixture: (spaceId: string) => Promise<void>;
}

export const getPrevalenceApiService = ({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ScoutLogger;
}): PrevalenceApiService => ({
  createPrevalenceFixture: async (spaceId) => {
    const sourceIndex = `scout-prevalence-source-${spaceId}`;

    await measurePerformanceAsync(log, 'security.prevalence.createPrevalenceFixture', async () => {
      await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });

      await esClient.index({
        index: sourceIndex,
        document: {
          '@timestamp': new Date().toISOString(),
          source: { ip: PREVALENCE_SOURCE_IP },
          destination: { ip: PREVALENCE_DESTINATION_IP },
          host: { name: PREVALENCE_HOST_NAME },
          user: { name: PREVALENCE_USER_NAME },
          event: { kind: 'event' },
        },
        refresh: true,
      });
    });

    return { sourceIndex };
  },

  cleanupPrevalenceFixture: async (spaceId) => {
    const sourceIndex = `scout-prevalence-source-${spaceId}`;
    await measurePerformanceAsync(log, 'security.prevalence.cleanupPrevalenceFixture', async () => {
      await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });
    });
  },
});
