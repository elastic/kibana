/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import { getHistorySnapshotIndexName } from '@kbn/entity-store/server/domain/asset_manager/history_snapshot_index';
import type { SeedEntityOptions } from './seed_entities';
import { buildEntityDoc } from './seed_entities';

export const seedEntityStoreHistorySnapshot = async ({
  esClient,
  namespace = 'default',
  date,
  ...options
}: SeedEntityOptions & {
  esClient: Client;
  namespace?: string;
  date: Date;
}): Promise<void> => {
  await esClient.index({
    index: getHistorySnapshotIndexName(namespace, date),
    id: hashEuid(options.euid),
    refresh: 'wait_for',
    document: buildEntityDoc(options),
  });
};
