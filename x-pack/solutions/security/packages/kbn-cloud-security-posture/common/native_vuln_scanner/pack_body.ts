/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVENTORY_QUERIES } from './queries';

export const INVENTORY_PACK_NAME = 'software-inventory';

/** Seconds between scheduled runs of the inventory pack. */
export const INVENTORY_PACK_INTERVAL_SECONDS = 86_400;

export interface InventoryPackQueryBody {
  id: string;
  query: string;
  platform: 'linux';
  snapshot: true;
}

export interface InventoryPackBody {
  name: string;
  description: string;
  enabled: true;
  /** osquery rejects a pack-level `interval` unless the pack also says `schedule_type: 'interval'`. */
  schedule_type: 'interval';
  interval: number;
  queries: Record<string, InventoryPackQueryBody>;
}

/**
 * The body of the `software-inventory` pack. The browser creates the pack from it and the server
 * compares the live pack against it, so the two cannot drift.
 */
export const INVENTORY_PACK_BODY: Readonly<InventoryPackBody> = {
  name: INVENTORY_PACK_NAME,
  description: 'Software inventory for native vulnerability scanning',
  enabled: true,
  schedule_type: 'interval',
  interval: INVENTORY_PACK_INTERVAL_SECONDS,
  queries: Object.fromEntries(
    Object.values(INVENTORY_QUERIES).map(({ id, query, platform, snapshot }) => [
      id,
      { id, query, platform, snapshot },
    ])
  ),
};
