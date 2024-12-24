/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { either } from 'fp-ts/Either';
import { inventoryViewRT } from '../../../inventory_views';

export const INVENTORY_VIEW_URL = '/api/infra/inventory_views';
export const INVENTORY_VIEW_URL_ENTITY = `${INVENTORY_VIEW_URL}/{inventoryViewId}`;
export const getInventoryViewUrl = (inventoryViewId?: string) =>
  [INVENTORY_VIEW_URL, inventoryViewId].filter(Boolean).join('/');

const inventoryViewIdRT = new rt.Type<string, string, unknown>(
  'InventoryViewId',
  rt.string.is,
  (u, c) =>
    either.chain(rt.string.validate(u, c), (id) => {
      return id === '0'
        ? rt.failure(u, c, `The inventory view with id ${id} is not configurable.`)
        : rt.success(id);
    }),
  String
);

export const inventoryViewRequestParamsRT = rt.type({
  inventoryViewId: inventoryViewIdRT,
});

export const inventoryViewRequestQueryRT = rt.partial({
  sourceId: rt.string,
});

export const inventoryViewResponsePayloadRT = rt.type({
  data: inventoryViewRT,
});

export type InventoryViewRequestQuery = rt.TypeOf<typeof inventoryViewRequestQueryRT>;
