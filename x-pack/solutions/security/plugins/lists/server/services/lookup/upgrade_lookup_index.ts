/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import { isRangeType } from './build_lookup_mappings';

// Access names whose index is known to carry every field the current code reads and
// writes. Per process; a miss costs one mapping read.
const upToDate = new Set<string>();

/**
 * Bring a range lookup index created by an earlier revision up to the current mapping:
 * add the `src_range` field and fill it from the stored bounds of every source document.
 * The mapping is strict, so without this a write to such an index fails and the
 * membership query, which reads `src_range`, matches nothing. Runs once per access name
 * per process; the mapping read is cheap and the update runs only when the field is
 * missing. Must run with a client allowed to change the mapping (the provisioning client).
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
  if (!isRangeType(type) || upToDate.has(index)) return;
  const mappings = await esClient.indices.getMapping({ index });
  const properties = Object.values(mappings)[0]?.mappings?.properties ?? {};
  if (properties.src_range == null) {
    await esClient.indices.putMapping({
      index,
      properties: { src_range: { type } as estypes.MappingProperty },
    });
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

/** Test hook: forget which indices were checked. */
export const resetLookupIndexUpgrades = (): void => upToDate.clear();
