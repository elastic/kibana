/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import { buildLookupMappings } from './build_lookup_mappings';

/**
 * Creates the per-list lookup-mode index for a value list. Single shard is
 * implied by `index.mode: lookup`.
 */
export const createLookupIndex = async ({
  esClient,
  index,
  type,
}: {
  esClient: ElasticsearchClient;
  index: string;
  type: Type;
}): Promise<void> => {
  const exists = await esClient.indices.exists({ index });
  if (exists) {
    return;
  }
  await esClient.indices.create({
    index,
    mappings: buildLookupMappings(type),
    settings: { index: { mode: 'lookup' } },
  });
};
