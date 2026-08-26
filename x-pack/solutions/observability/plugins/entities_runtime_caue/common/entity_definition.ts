/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

const MAX_NAME_LENGTH = 200;
const MAX_TYPE_LENGTH = 128;
const MAX_FIELD_NAME_LENGTH = 1024;
const MAX_IDENTITY_FIELDS = 5;
const MAX_INDEX_PATTERN_LENGTH = 4096;
const MAX_LOOKBACK_PERIOD_LENGTH = 16;

export const entityDefinitionAttributesSchema = schema.object({
  name: schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
  type: schema.string({ minLength: 1, maxLength: MAX_TYPE_LENGTH }),
  identityFields: schema.arrayOf(
    schema.string({ minLength: 1, maxLength: MAX_FIELD_NAME_LENGTH }),
    { minSize: 1, maxSize: MAX_IDENTITY_FIELDS }
  ),
  indexPattern: schema.string({ minLength: 1, maxLength: MAX_INDEX_PATTERN_LENGTH }),
  lookbackPeriod: schema.string({ minLength: 1, maxLength: MAX_LOOKBACK_PERIOD_LENGTH }),
});

export type EntityDefinitionAttributes = TypeOf<typeof entityDefinitionAttributesSchema>;

export interface EntityDefinition extends EntityDefinitionAttributes {
  id: string;
}

export interface DiscoveredEntity {
  'entity.id': string;
  first_seen: string | null;
  last_seen: string;
  doc_count: number;
  /** One entry per identity field, key = field name, value = the field value for this entity */
  identityValues: Record<string, string>;
}

export interface DiscoverEntitiesResponse {
  entities: DiscoveredEntity[];
  definitionId: string;
}
