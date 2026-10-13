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
import type {
  BriefJob,
  BriefMetadata,
  BriefReport,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';

/**
 * One document per owner and space, mirroring the GET response. `job` is the latest run;
 * `report` and `metadata` hold the last successful one and are replaced only when a job succeeds.
 */
export interface BriefDocument {
  /** Stable principal id of the owner; the caller is always the owner. */
  owner: { id: string };
  spaceId: string;
  schemaVersion: 1;
  job: BriefJob;
  report?: BriefReport;
  metadata?: BriefMetadata;
  expiresAt: string;
}

/** Stored in `_source` but neither indexed nor given doc values. */
const storedOnly = () => types.object({ enabled: false });

/**
 * Only the fields used for the cluster cap and cleanup are indexed. The root mapping is `strict`
 * (set by the adapter), so every top-level field is declared.
 */
export const briefStorageSettings = {
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
      expiresAt: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export type BriefStorageClient = ReturnType<
  StorageIndexAdapter<typeof briefStorageSettings, BriefDocument>['getClient']
>;

/** Creates the storage client. Pass `asInternalUser`; the store checks owner and space. */
export const createBriefStorageClient = (
  esClient: ElasticsearchClient,
  logger: Logger
): BriefStorageClient =>
  new StorageIndexAdapter<typeof briefStorageSettings, BriefDocument>(
    esClient,
    logger,
    briefStorageSettings
  ).getClient();
