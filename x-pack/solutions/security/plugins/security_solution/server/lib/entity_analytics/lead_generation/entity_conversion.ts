/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { LeadEntity } from './types';

/**
 * Convert an Entity Store V2 record into a LeadEntity, extracting the
 * convenience `type` and `name` fields from the nested `entity` object.
 * Falls back to `entity.id` (EUID) when `entity.name` is absent.
 */
export const entityRecordToLeadEntity = (record: Entity): LeadEntity => {
  const entityField = (record as Record<string, unknown>).entity as
    | { name?: string; type?: string; id?: string }
    | undefined;
  return {
    record,
    type: entityField?.type ?? 'unknown',
    name: entityField?.name ?? entityField?.id ?? 'unknown',
  };
};
