/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { metadataIndexName } from '../../common/build_entity_query';
import type { MetadataField } from '../../common/metadata_filter';

export type { MetadataField };

/** Internal fields that are plumbing — never surfaced to the user. */
const EXCLUDED_FIELDS = new Set(['entity.id', 'entity', 'first_seen']);

/**
 * Returns the user-authored metadata fields for a definition's lookup index by calling
 * `_field_caps`. Excludes internal fields (`entity.id`, `entity`, `first_seen`), `_`-prefixed
 * system fields, and `.keyword` multi-field sub-fields.
 *
 * Returns `[]` on 404 (index not yet created) or if no user fields have been written yet.
 * Runs as `asInternalUser` — the metadata index is internal plumbing under `.entities.*`.
 */
export const getMetadataFields = async (
  esClient: ElasticsearchClient,
  definitionId: string
): Promise<MetadataField[]> => {
  const index = metadataIndexName(definitionId);
  let fieldCaps;
  try {
    fieldCaps = await esClient.fieldCaps({ index, fields: '*' });
  } catch (err: unknown) {
    const status = (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
    if (status === 404) {
      return [];
    }
    throw err;
  }

  const fields: MetadataField[] = [];
  for (const [fieldName, typesMap] of Object.entries(fieldCaps.fields)) {
    // Skip internal plumbing fields
    if (EXCLUDED_FIELDS.has(fieldName)) continue;
    // Skip system fields (prefixed with _)
    if (fieldName.startsWith('_')) continue;
    // Skip .keyword multi-field sub-fields
    if (fieldName.endsWith('.keyword')) continue;

    // Take the first (and usually only) type for this field
    const types = Object.keys(typesMap);
    if (types.length === 0) continue;
    fields.push({ name: fieldName, type: types[0] });
  }

  // Stable ordering makes the dropdown predictable
  fields.sort((a, b) => a.name.localeCompare(b.name));
  return fields;
};
