/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { listItemArraySchema } from '../list_item_schema';

/**
 * NOTE: Although this is defined within "response" this does not expose a REST API
 * endpoint right now for this particular response. Instead this is only used internally
 * for the plugins at this moment. If this changes, please remove this message.
 */
export const searchListItemSchema = t.exact(
  t.type({
    items: listItemArraySchema,
    value: t.unknown,
  })
);

export type SearchListItemSchema = t.TypeOf<typeof searchListItemSchema>;

export const searchListItemArraySchema = t.array(searchListItemSchema);
export type SearchListItemArraySchema = t.TypeOf<typeof searchListItemArraySchema>;
