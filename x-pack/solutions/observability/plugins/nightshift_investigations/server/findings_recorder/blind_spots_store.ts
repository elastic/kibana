/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { HypothesisStatus } from '@kbn/agentic-investigations-plugin/common';
import type { MissingDataItem } from '../../common/missing_data';

/**
 * Where the findings recorder keeps what an investigation could not settle. Dot-prefixed, like the
 * chat system indices, and read-only for now: nothing in the product reads it, so the data can be checked across clusters first.
 */
export const BLIND_SPOTS_INDEX = '.nightshift-blind-spots';

const storageSettings = {
  name: BLIND_SPOTS_INDEX,
  schema: {
    properties: {
      conversation_id: types.keyword({}),
      space_id: types.keyword({}),
      '@timestamp': types.date({}),
      /** `cause_not_confirmed` when the verdict says so, `cause_found` otherwise. */
      outcome: types.keyword({}),
      missing_data: types.object({
        properties: {
          what: types.text({}),
          source: types.text({}),
          why: types.keyword({}),
          would_decide: types.text({}),
        },
      }),
      hypotheses: types.object({
        properties: {
          candidate: types.text({}),
          status: types.keyword({}),
          settled_by: types.text({}),
        },
      }),
    },
  },
} satisfies IndexStorageSettings;

export type BlindSpotsOutcome = 'cause_not_confirmed' | 'cause_found';

export interface BlindSpotsDocument {
  conversation_id: string;
  space_id: string;
  '@timestamp': string;
  outcome: BlindSpotsOutcome;
  missing_data: MissingDataItem[];
  hypotheses: Array<{ candidate: string; status: HypothesisStatus; settled_by?: string }>;
}

type BlindSpotsStorageSettings = typeof storageSettings;

/** Saves the blind spots of one investigation, replacing what an earlier pass stored for it. */
export interface BlindSpotsStore {
  save: (document: Omit<BlindSpotsDocument, 'space_id'>) => Promise<void>;
}

export const createBlindSpotsStore = ({
  esClient,
  logger,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}): BlindSpotsStore => {
  const client = new StorageIndexAdapter<BlindSpotsStorageSettings, BlindSpotsDocument>(
    esClient,
    logger,
    storageSettings
  ).getClient();
  return {
    save: async (document) => {
      await client.index({
        id: document.conversation_id,
        document: { ...document, space_id: spaceId },
      });
    },
  };
};
