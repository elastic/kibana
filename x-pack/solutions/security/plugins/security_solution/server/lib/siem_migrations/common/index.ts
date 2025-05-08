/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import assert from 'assert';
import type { Stored } from '../types';

export function processHit<T extends object>(
  hit: SearchHit<T>,
  override: Partial<T> = {}
): Stored<T> {
  const { _id, _source } = hit;
  assert(_id, 'document should have _id');
  assert(_source, 'document should have _source');
  return { ..._source, ...override, id: _id };
}

export function processHits<T extends object>(
  hits: Array<SearchHit<T>> = [],
  override: Partial<T> = {}
): Array<Stored<T>> {
  return hits.map((hit) => processHit(hit, override));
}

export function processResponseHits<T extends object>(
  response: SearchResponse<T>,
  override?: Partial<T>
): Array<Stored<T>> {
  return processHits(response.hits.hits, override);
}

export function getTotalHits(response: SearchResponse) {
  return typeof response.hits.total === 'number'
    ? response.hits.total
    : response.hits.total?.value ?? 0;
}
