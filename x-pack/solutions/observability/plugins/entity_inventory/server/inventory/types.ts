/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeWindow } from './generator';

/** What `InventoryService.list` reads: one type, a window and how many rows to return. */
export interface ListRequest {
  type: string;
  window: TimeWindow;
  limit: number;
  /** Aborts the probes and list queries, for example when the client disconnects. */
  signal?: AbortSignal;
}
