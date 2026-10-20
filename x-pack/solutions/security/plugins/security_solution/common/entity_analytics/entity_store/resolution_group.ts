/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * `single` covers only the record whose `entity.id` matches; `resolved` also covers every record
 * that resolves to that id (the target plus its aliases), i.e. the whole resolution group.
 */
export type EntityViewMode = 'single' | 'resolved';

export const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

/** Upper bound on records fetched for a resolution group; matches the list API's `per_page` ceiling. */
export const RESOLVED_MODE_MAX_RECORDS = 10_000;

/**
 * Entity Store filter selecting the records `entityId` covers in the given `mode`. In `resolved`
 * mode the target is matched on `entity.id` and its aliases on
 * `entity.relationships.resolution.resolved_to`.
 */
export const buildEntityIdFilter = (
  entityId: string,
  mode: EntityViewMode
): QueryDslQueryContainer => {
  if (mode === 'resolved') {
    return {
      bool: {
        should: [{ term: { 'entity.id': entityId } }, { term: { [RESOLVED_TO_FIELD]: entityId } }],
        minimum_should_match: 1,
      },
    };
  }
  return {
    bool: {
      filter: [{ term: { 'entity.id': entityId } }],
    },
  };
};
