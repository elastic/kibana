/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

const keyword: MappingProperty = { type: 'keyword', ignore_above: 1024 };
const date: MappingProperty = { type: 'date' };

/** Strict, so Elasticsearch rejects a document carrying an unmapped field. */
export const checkpointMappings: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    release: keyword,
    feed: { properties: { etag: keyword, sha256: keyword } },
    inventory_sha256: keyword,
    matched_at: date,
    run_id: keyword,
    run_scope: keyword,
  },
};
