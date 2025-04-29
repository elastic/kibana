/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ItemTypeRT } from '@kbn/metrics-data-access-plugin/common';

const CloudAccountRT = rt.type({
  value: rt.string,
  name: rt.string,
});

export const InventoryMetaResponseRT = rt.type({
  accounts: rt.array(CloudAccountRT),
  projects: rt.array(rt.string),
  regions: rt.array(rt.string),
});

export const InventoryMetaRequestRT = rt.type({
  sourceId: rt.string,
  nodeType: ItemTypeRT,
  currentTime: rt.number,
});

export type InventoryMetaRequest = rt.TypeOf<typeof InventoryMetaRequestRT>;
export type InventoryMetaResponse = rt.TypeOf<typeof InventoryMetaResponseRT>;
export type InventoryCloudAccount = rt.TypeOf<typeof CloudAccountRT>;
