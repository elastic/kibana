/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, IStorageClient } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';

/**
 * Each document is one investigation's telemetry cutoff, keyed by the investigation id. Kibana
 * writes it with its internal user before the investigation runs; no agent tool reads or writes
 * this index, so the agent cannot move its own bound.
 */
const telemetryCutoffStorageSettings = {
  name: '.kibana-nightshift-telemetry-cutoffs',
  schema: {
    properties: {
      telemetry_not_after: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

type TelemetryCutoffStorageSettings = typeof telemetryCutoffStorageSettings;

interface TelemetryCutoffDocument {
  telemetry_not_after: string;
}

/** The per-investigation upper bound on sandbox Elasticsearch reads, which only the evals set. */
export interface TelemetryCutoffStore {
  /** The investigation's cutoff, or undefined when it has none. */
  get: (investigationId: string) => Promise<string | undefined>;
  set: (investigationId: string, telemetryNotAfter: string) => Promise<void>;
}

const isNotFound = (error: unknown): boolean =>
  (error as { statusCode?: number } | undefined)?.statusCode === 404;

export const createTelemetryCutoffStore = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): TelemetryCutoffStore => {
  const client: IStorageClient<TelemetryCutoffStorageSettings, TelemetryCutoffDocument> =
    new StorageIndexAdapter<TelemetryCutoffStorageSettings, TelemetryCutoffDocument>(
      esClient,
      logger,
      telemetryCutoffStorageSettings
    ).getClient();
  return {
    get: async (investigationId) => {
      try {
        const { _source: source } = await client.get({ id: investigationId });
        return source?.telemetry_not_after;
      } catch (error) {
        // A missing document, or an index no investigation has written yet, means no cutoff.
        if (isNotFound(error)) return undefined;
        throw error;
      }
    },
    set: async (investigationId, telemetryNotAfter) => {
      await client.index({
        id: investigationId,
        document: { telemetry_not_after: telemetryNotAfter },
      });
    },
  };
};
