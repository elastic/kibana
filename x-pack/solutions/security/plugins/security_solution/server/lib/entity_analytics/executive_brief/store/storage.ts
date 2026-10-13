/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { EXECUTIVE_BRIEF_INDEX } from '../../../../../common/entity_analytics/executive_brief/constants';
import type { BriefDocument } from '../../../../../common/entity_analytics/executive_brief/document';

/** Stored in `_source` but neither indexed nor given doc values. */
const storedOnly = () => types.object({ enabled: false });

/**
 * Only the fields used for lookups, the cluster cap and cleanup are mapped. The root mapping is
 * `strict` (set by the adapter), so every top-level field is declared; nested payloads are stored
 * with `enabled: false` and sub-objects use `dynamic: false`.
 */
export const briefStorageSettings = {
  name: EXECUTIVE_BRIEF_INDEX,
  schema: {
    properties: {
      schema_version: types.long({ index: false, doc_values: false }),
      owner: types.object({
        dynamic: false,
        properties: {
          id: types.keyword({}),
        },
      }),
      space_id: types.keyword({}),
      job: types.object({
        dynamic: false,
        properties: {
          status: types.keyword({}),
          started_at: types.date({}),
        },
      }),
      generated_at: types.date({}),
      expires_at: types.date({}),
      params: storedOnly(),
      model: types.keyword({ index: false, doc_values: false }),
      tokens: storedOnly(),
      evidence: storedOnly(),
      brief: storedOnly(),
      verification: storedOnly(),
    },
  },
} satisfies IndexStorageSettings;

export type BriefStorageSettings = typeof briefStorageSettings;

export type BriefStorage = StorageIndexAdapter<BriefStorageSettings, BriefDocument>;

export type BriefStorageClient = ReturnType<BriefStorage['getClient']>;

/** Creates the storage adapter. Pass `asInternalUser`; every read filters on owner and space. */
export const createBriefStorage = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): BriefStorage =>
  new StorageIndexAdapter<BriefStorageSettings, BriefDocument>(
    esClient,
    logger,
    briefStorageSettings
  );
