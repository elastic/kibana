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
import type { BriefDocument } from './types';

/** Stored in `_source` but neither indexed nor given doc values. */
const storedOnly = () => types.object({ enabled: false });

/** Only the fields the cluster cap reads are indexed; the adapter makes the root mapping `strict`. */
const storageSettings = {
  name: EXECUTIVE_BRIEF_INDEX,
  schema: {
    properties: {
      owner: types.object({ dynamic: false, properties: { id: types.keyword({}) } }),
      spaceId: types.keyword({}),
      schemaVersion: types.long({ index: false, doc_values: false }),
      job: types.object({
        dynamic: false,
        properties: { status: types.keyword({}), startedAt: types.date({}) },
      }),
      report: storedOnly(),
      metadata: storedOnly(),
    },
  },
} satisfies IndexStorageSettings;

export type ExecutiveBriefStorage = StorageIndexAdapter<typeof storageSettings, BriefDocument>;

/** Pass `asInternalUser`; the data client checks the owner and space. */
export const createStorage = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): ExecutiveBriefStorage =>
  new StorageIndexAdapter<typeof storageSettings, BriefDocument>(esClient, logger, storageSettings);
