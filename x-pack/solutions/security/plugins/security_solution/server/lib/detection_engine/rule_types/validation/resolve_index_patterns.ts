/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { castArray } from 'lodash';

export interface ResolveIndexPatternsParams {
  esClient: ElasticsearchClient;
  indexPatterns: string[];
  fields: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
}

export interface ResolveIndexPatternsResult {
  matchedIndices: string[];
  fields: estypes.FieldCapsResponse['fields'];
}

const isExcludingIndexPattern = (indexPattern: string): boolean =>
  indexPattern.trim().startsWith('-');

/**
 * Resolves the index patterns of a rule with one field caps request. The patterns are sent in the order
 * the user specified them, so Elasticsearch applies an excluding pattern (starting with `-`) only to the
 * patterns listed before it, as it does when the rule searches them.
 *
 * Errors are not handled here. A failed request must not look like an empty result.
 */
export const resolveIndexPatterns = async ({
  esClient,
  indexPatterns,
  fields,
  runtimeMappings,
}: ResolveIndexPatternsParams): Promise<ResolveIndexPatternsResult> => {
  // An empty list would resolve to every index, and a list of only excluding patterns resolves to
  // nothing. Neither needs a request.
  if (indexPatterns.every(isExcludingIndexPattern)) {
    return { matchedIndices: [], fields: {} };
  }

  const { body } = await esClient.fieldCaps(
    {
      index: indexPatterns,
      fields,
      include_unmapped: true,
      runtime_mappings: runtimeMappings,
      ignore_unavailable: true,
      allow_no_indices: true,
      expand_wildcards: 'open',
    },
    { meta: true }
  );

  return { matchedIndices: castArray(body.indices), fields: body.fields };
};
