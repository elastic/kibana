/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-list-types';
import { type } from '@kbn/securitysolution-io-ts-list-types';

import type { SearchEsListItemSchema } from '../../schemas/elastic_response';

export const findSourceType = (
  listItem: SearchEsListItemSchema,
  types: string[] = Object.keys(type.keys)
): Type | null => {
  const foundEntry = Object.entries(listItem).find(
    ([key, value]) => types.includes(key) && value != null
  );
  if (foundEntry != null && type.is(foundEntry[0])) {
    return foundEntry[0];
  } else {
    return null;
  }
};
