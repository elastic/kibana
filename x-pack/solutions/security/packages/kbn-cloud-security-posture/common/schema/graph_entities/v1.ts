/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  COUNTRY_CODE_MAX_LENGTH,
  COUNTRY_CODES_MAX_SIZE,
  DETAIL_PAGE_SIZE_MAX,
  ENTITY_ID_MAX_LENGTH,
  ENUM_LIKE_MAX_LENGTH,
  INDEX_NAME_MAX_LENGTH,
  INDEX_PATTERN_REGEX,
  INDEX_PATTERNS_MAX_SIZE,
  IP_ADDRESS_MAX_LENGTH,
  IPS_MAX_SIZE,
  LABEL_MAX_LENGTH,
  TIMESTAMP_STRING_MAX_LENGTH,
} from '../graph/v1';

// ============================================
// ENTITIES ENDPOINT: /internal/cloud_security_posture/graph/entities
// ============================================

export const entityItemSchema = schema.object({
  id: schema.string({ maxLength: ENTITY_ID_MAX_LENGTH }),
  timestamp: schema.maybe(schema.string({ maxLength: TIMESTAMP_STRING_MAX_LENGTH })),
  name: schema.maybe(schema.string({ maxLength: LABEL_MAX_LENGTH })),
  type: schema.maybe(schema.string({ maxLength: ENUM_LIKE_MAX_LENGTH })),
  subType: schema.maybe(schema.string({ maxLength: ENUM_LIKE_MAX_LENGTH })),
  ecsParentField: schema.maybe(schema.string({ maxLength: ENUM_LIKE_MAX_LENGTH })),
  // Risk score is not currently populated but will be in a future iteration
  risk: schema.maybe(schema.number()),
  icon: schema.maybe(schema.string({ maxLength: ENUM_LIKE_MAX_LENGTH })),
  availableInEntityStore: schema.maybe(schema.boolean()),
  host: schema.maybe(
    schema.object({
      ip: schema.maybe(schema.string({ maxLength: IP_ADDRESS_MAX_LENGTH })),
    })
  ),
  ips: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: IP_ADDRESS_MAX_LENGTH }), {
      maxSize: IPS_MAX_SIZE,
    })
  ),
  countryCodes: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: COUNTRY_CODE_MAX_LENGTH }), {
      maxSize: COUNTRY_CODES_MAX_SIZE,
    })
  ),
});

export const entitiesRequestSchema = schema.object({
  page: schema.object({
    index: schema.number({ min: 0 }),
    size: schema.number({ min: 1, max: DETAIL_PAGE_SIZE_MAX }),
  }),
  query: schema.object({
    entityIds: schema.arrayOf(schema.string({ maxLength: ENTITY_ID_MAX_LENGTH }), {
      minSize: 1,
      maxSize: 5000,
    }),
    start: schema.oneOf([
      schema.number(),
      schema.string({ maxLength: TIMESTAMP_STRING_MAX_LENGTH }),
    ]),
    end: schema.oneOf([schema.number(), schema.string({ maxLength: TIMESTAMP_STRING_MAX_LENGTH })]),
    indexPatterns: schema.maybe(
      schema.arrayOf(
        schema.string({
          minLength: 1,
          maxLength: INDEX_NAME_MAX_LENGTH,
          validate: (value) => {
            if (!INDEX_PATTERN_REGEX.test(value)) {
              return `Invalid index pattern: ${value}. Contains illegal characters.`;
            }
          },
        }),
        { minSize: 1, maxSize: INDEX_PATTERNS_MAX_SIZE }
      )
    ),
  }),
});

export const entitiesResponseSchema = () =>
  schema.object({
    entities: schema.arrayOf(entityItemSchema, { maxSize: DETAIL_PAGE_SIZE_MAX }),
    totalRecords: schema.number(),
  });
