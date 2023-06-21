/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

import type {
  QueryDslQueryContainer,
  MappingRuntimeFields,
  IndexName,
  Field,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

interface PerformSearchQueryArgs {
  es: Client;
  query: QueryDslQueryContainer;
  index: IndexName;
  size?: number;
  runtimeMappings?: MappingRuntimeFields;
  fields?: Field[];
}

/**
 * run ES search query
 */
export const performSearchQuery = async ({
  es,
  query,
  index,
  size = 10,
  runtimeMappings,
  fields,
}: PerformSearchQueryArgs) => {
  return es.search({
    index,
    size,
    fields,
    query,
    runtime_mappings: runtimeMappings,
  });
};
