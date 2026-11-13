/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { InventoryQuery, InventoryQueryKind } from './queries';
export { INVENTORY_QUERIES } from './queries';
export type {
  AgentInventoryRows,
  HostSkipReason,
  NormalizedHost,
  NormalizeResult,
  OsqueryRow,
} from './normalize';
export { normalizeDebRow, normalizeInventories, normalizeOs, normalizeRpmRow } from './normalize';
export type { ReadInventoriesOptions } from './reader';
export { OSQUERY_RESULTS_INDEX, readAgentInventories } from './reader';
