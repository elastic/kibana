/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttributeSelections, TimeWindow } from './generator';

/** What `InventoryService.list` reads: one type, a window and how many rows to return. */
export interface ListRequest {
  type: string;
  window: TimeWindow;
  limit: number;
  /** Aborts the probes and list queries, for example when the client disconnects. */
  signal?: AbortSignal;
}

/** What `InventoryService.listAttributeValues` reads: the values a dropdown can offer. */
export interface ListAttributeValuesRequest {
  /** The attribute or identity field whose values are listed; a type must suggest it as a filter. */
  attribute: string;
  /** The types in scope; a type that does not suggest `attribute` is left out. */
  types: string[];
  /** The other dropdowns' selections, which narrow the values. */
  selections: AttributeSelections;
  /** The values already selected for `attribute`; those not offered come back as invalid. */
  selected: string[];
  window: TimeWindow;
  limit: number;
  /** Aborts the probes and values queries, for example when the client disconnects. */
  signal?: AbortSignal;
}
