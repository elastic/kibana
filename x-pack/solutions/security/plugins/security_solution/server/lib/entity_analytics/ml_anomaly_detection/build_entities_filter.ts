/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Entity, EntityType } from '@kbn/entity-store/common';
import { euid } from '@kbn/entity-store/common/euid_helpers';

/**
 * Identity filter matching source documents of any of the given entity-store records (e.g. a
 * resolution group). One record yields its EUID filter unchanged; several are OR-ed in a
 * `bool.should`. Records without enough identity fields are skipped; `undefined` when none qualify.
 */
export const buildEntitiesFilter = (
  entityType: EntityType,
  entityRecords: Entity[]
): QueryDslQueryContainer | undefined => {
  const filters = entityRecords.flatMap((record) => {
    const filter = euid.dsl.getEuidFilterBasedOnEntityRecord(entityType, record);
    return filter ? [filter] : [];
  });
  if (filters.length === 0) {
    return undefined;
  }
  if (filters.length === 1) {
    return filters[0];
  }
  return { bool: { should: filters, minimum_should_match: 1 } };
};
