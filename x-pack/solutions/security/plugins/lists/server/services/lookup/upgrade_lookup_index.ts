/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import {
  LOOKUP_AUTO_EXPAND_REPLICAS,
  STAMP_PROPERTIES,
  isRangeType,
} from './build_lookup_mappings';
import { assertLookupAccessName } from './get_lookup_index';

// Access names whose index is known to carry every field the current code reads and
// writes. Per process; a miss costs one mapping read.
const upToDate = new Set<string>();

/**
 * Bring a lookup index created by an earlier revision of this code up to the current
 * mapping before it is read or written. Two additions so far: the `src_range` field on
 * range lists (backfilled from the parsed bounds), and the creation and update stamps on
 * every list (no backfill is possible; documents written before this sort last).
 */
export const ensureLookupIndexCurrent = async ({
  esClient,
  index,
  type,
}: {
  esClient: ElasticsearchClient;
  index: string;
  type: Type;
}): Promise<void> => {
  // Runs as the provisioning client; only a name this module builds is touched.
  assertLookupAccessName(index);
  if (upToDate.has(index)) return;
  const mappings = await esClient.indices.getMapping({ index });
  const properties = Object.values(mappings)[0]?.mappings?.properties ?? {};

  const missing: Record<string, estypes.MappingProperty> = {};
  for (const [field, mapping] of Object.entries(STAMP_PROPERTIES)) {
    if (properties[field] == null) missing[field] = mapping;
  }
  const needsRange = isRangeType(type) && properties.src_range == null;
  if (needsRange) missing.src_range = { type } as estypes.MappingProperty;
  if (isRangeType(type) && properties.built_by == null) missing.built_by = { type: 'keyword' };
  if (Object.keys(missing).length > 0) {
    await esClient.indices.putMapping({ index, properties: missing });
  }

  // An index created with a fixed replica count gets the replica rule of a new index.
  const settings = await esClient.indices.getSettings({ index });
  const current = Object.values(settings)[0]?.settings?.index?.auto_expand_replicas;
  if (current !== LOOKUP_AUTO_EXPAND_REPLICAS) {
    await esClient.indices.putSettings({
      index,
      settings: { index: { auto_expand_replicas: LOOKUP_AUTO_EXPAND_REPLICAS } },
    });
  }

  if (needsRange) {
    await esClient.updateByQuery({
      conflicts: 'proceed',
      index,
      query: {
        bool: {
          filter: [{ term: { kind: 'source' } }],
          must_not: [{ exists: { field: 'src_range' } }],
        },
      },
      refresh: true,
      script: {
        lang: 'painless',
        source:
          "ctx._source.src_range = ['gte': ctx._source.src_start, 'lte': ctx._source.src_end]",
      },
    });
  }
  upToDate.add(index);
};

/** Forget which indices were checked; for tests. */
export const resetLookupIndexUpgrades = (): void => upToDate.clear();
