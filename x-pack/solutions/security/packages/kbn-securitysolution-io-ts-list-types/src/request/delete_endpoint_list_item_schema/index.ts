/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { id } from '../../common/id';
import type { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { item_id } from '../../common/item_id';

export const deleteEndpointListItemSchema = t.exact(
  t.partial({
    id,
    item_id,
  })
);

export type DeleteEndpointListItemSchema = t.OutputOf<typeof deleteEndpointListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type DeleteEndpointListItemSchemaDecoded = RequiredKeepUndefined<
  t.TypeOf<typeof deleteEndpointListItemSchema>
>;
