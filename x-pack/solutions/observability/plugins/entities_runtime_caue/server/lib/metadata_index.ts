/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { metadataIndexName } from '../../common/build_entity_query';

const METADATA_INDEX_SETTINGS = {
  'index.mode': 'lookup', // create-only; required for LOOKUP JOIN
  'index.auto_expand_replicas': '0-1',
} as const;

const METADATA_INDEX_MAPPINGS = {
  dynamic: true as const,
  dynamic_templates: [
    {
      strings_as_keyword: {
        match_mapping_type: 'string',
        // No .text subfield — the entity store's template adds one and it causes phantom
        // columns in LOOKUP JOIN results that then conflict on write-back.
        mapping: {
          type: 'keyword' as const,
          ignore_above: 1024,
          fields: undefined,
          meta: undefined,
        },
      },
    },
  ],
  properties: {
    'entity.id': { type: 'keyword' as const }, // join key — must be keyword
    first_seen: { type: 'date' as const },
  },
};

/**
 * Creates the per-definition metadata lookup index if it does not already exist.
 * index.mode: lookup is a create-only setting — the index must be created with it,
 * it cannot be added via update-settings.
 */
export const ensureMetadataIndex = async (
  esClient: ElasticsearchClient,
  definitionId: string
): Promise<void> => {
  const index = metadataIndexName(definitionId);
  try {
    await esClient.indices.create({
      index,
      settings: METADATA_INDEX_SETTINGS,
      mappings: METADATA_INDEX_MAPPINGS,
    });
  } catch (err: unknown) {
    // resource_already_exists_exception is expected and fine
    if (
      (err as { meta?: { body?: { error?: { type?: string } } } })?.meta?.body?.error?.type ===
      'resource_already_exists_exception'
    ) {
      return;
    }
    throw err;
  }
};

/**
 * Deletes the per-definition metadata lookup index.
 * Called when a definition is deleted. Silently ignores index_not_found.
 */
export const deleteMetadataIndex = async (
  esClient: ElasticsearchClient,
  definitionId: string
): Promise<void> => {
  const index = metadataIndexName(definitionId);
  try {
    await esClient.indices.delete({ index });
  } catch (err: unknown) {
    if (
      (err as { meta?: { body?: { error?: { type?: string } } } })?.meta?.body?.error?.type ===
      'index_not_found_exception'
    ) {
      return;
    }
    throw err;
  }
};
