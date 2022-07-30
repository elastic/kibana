/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  exceptionListItemSchema,
  exceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

export const fullResponseSchema = t.intersection([exceptionListSchema, exceptionListItemSchema]);

export type FullResponseSchema = t.TypeOf<typeof fullResponseSchema>;

/**
 * This will remove server generated properties such as date times, etc...
 * @param rule Rule to pass in to remove typical server generated properties
 */
export const removeExceptionsServerGeneratedProperties = (
  data: FullResponseSchema
): Partial<FullResponseSchema> => {
  const {
    /* eslint-disable @typescript-eslint/naming-convention */
    id,
    created_at,
    updated_at,
    _version,
    tie_breaker_id,
    list_id,
    item_id,
    ...removedProperties
  } = data;
  return removedProperties;
};
