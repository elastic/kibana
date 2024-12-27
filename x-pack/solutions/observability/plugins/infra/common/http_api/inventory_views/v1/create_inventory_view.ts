/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { inventoryViewAttributesRT, inventoryViewRT } from '../../../inventory_views';

export const createInventoryViewAttributesRequestPayloadRT = rt.exact(
  rt.intersection([
    inventoryViewAttributesRT,
    rt.partial({
      isDefault: rt.undefined,
      isStatic: rt.undefined,
    }),
  ])
);

export type CreateInventoryViewAttributesRequestPayload = rt.TypeOf<
  typeof createInventoryViewAttributesRequestPayloadRT
>;

export const createInventoryViewRequestPayloadRT = rt.type({
  attributes: createInventoryViewAttributesRequestPayloadRT,
});

export type CreateInventoryViewResponsePayload = rt.TypeOf<typeof inventoryViewRT>;
