/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { getBriefEntityType } from './read_entities';
import type { BriefCandidate } from './types';

/** The members of a group whose records are matched by their identity fields. */
const MAX_MEMBERS_MATCHED_BY_RECORD = 20;

/**
 * One filter per record of a candidate and its members that has identity fields, matching the documents
 * that carry them, such as an alert without an entity id or an anomaly record. A document matches when
 * any of them does.
 */
export const buildRecordFilters = ({
  id,
  record,
  members = [],
}: BriefCandidate): QueryDslQueryContainer[] =>
  [{ id, record }, ...members.slice(0, MAX_MEMBERS_MATCHED_BY_RECORD)].flatMap((entity) => {
    const filter = euid.dsl.getEuidFilterBasedOnEntityRecord(
      getBuiltInEntityDefinition(getBriefEntityType(entity.record, entity.id)),
      entity.record
    );
    return filter ? [filter] : [];
  });
