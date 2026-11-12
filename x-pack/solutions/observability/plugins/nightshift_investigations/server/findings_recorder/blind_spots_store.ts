/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { NIGHTSHIFT_BLIND_SPOTS_INDEX } from '@kbn/nightshift-shared';
import type { HypothesisStatus } from '@kbn/agentic-investigations-plugin/common';
import type { SelfAssessedResult, MissingDataItem } from '../../common/missing_data';

/**
 * Where the findings recorder keeps what an investigation could not settle. Written as the user of
 * the request, which for an investigation is the Nightshift service account: its role grants this
 * one index. Nothing in the product reads it yet, so the data can be checked across clusters first.
 */
export const BLIND_SPOTS_INDEX = NIGHTSHIFT_BLIND_SPOTS_INDEX;

/** Bump when the mapping changes: an index created with an older one is not updated. */
const MAPPING_VERSION = 1;

const MAPPINGS = {
  dynamic: 'strict',
  _meta: { version: MAPPING_VERSION },
  properties: {
    conversation_id: { type: 'keyword' },
    space_id: { type: 'keyword' },
    '@timestamp': { type: 'date' },
    /** The recorder's own reading of the conversation, not a verified result. */
    self_assessed_result: { type: 'keyword' },
    missing_data: {
      properties: {
        what: { type: 'text' },
        source: { type: 'text' },
        why: { type: 'keyword' },
        would_decide: { type: 'text' },
      },
    },
    hypotheses: {
      properties: {
        candidate: { type: 'text' },
        status: { type: 'keyword' },
        settled_by: { type: 'text' },
      },
    },
  },
} as const;

export interface BlindSpotsDocument {
  conversation_id: string;
  space_id: string;
  '@timestamp': string;
  /** Left out when the recorder did not say how the investigation ended. */
  self_assessed_result?: SelfAssessedResult;
  missing_data: MissingDataItem[];
  hypotheses: Array<{ candidate: string; status: HypothesisStatus; settled_by?: string }>;
}

/** Saves the blind spots of one investigation, replacing what an earlier pass stored for it. */
export interface BlindSpotsStore {
  save: (document: Omit<BlindSpotsDocument, 'space_id'>) => Promise<void>;
}

const isAlreadyExists = (error: unknown): boolean =>
  (error as { body?: { error?: { type?: string } } })?.body?.error?.type ===
  'resource_already_exists_exception';

// One check per process: the index is created once and only ever by its first writer.
let indexReady = false;

export const createBlindSpotsStore = ({
  esClient,
  logger,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}): BlindSpotsStore => {
  const ensureIndex = async (): Promise<void> => {
    if (indexReady) return;
    try {
      await esClient.indices.create({
        index: BLIND_SPOTS_INDEX,
        settings: { hidden: true, number_of_shards: 1, auto_expand_replicas: '0-1' },
        mappings: MAPPINGS,
      });
      logger.debug(`Created the ${BLIND_SPOTS_INDEX} index`);
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
    }
    indexReady = true;
  };

  return {
    save: async (document) => {
      await ensureIndex();
      await esClient.index({
        index: BLIND_SPOTS_INDEX,
        id: document.conversation_id,
        document: { ...document, space_id: spaceId },
      });
    },
  };
};

/** Lets a test start from an index that has not been checked yet. */
export const resetBlindSpotsIndexCheck = (): void => {
  indexReady = false;
};
