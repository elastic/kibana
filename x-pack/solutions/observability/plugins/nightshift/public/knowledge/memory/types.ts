/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  MEMORY_ARCHIVE_REASONS,
  MEMORY_FILTERS,
  type GetMemoryPageResponse,
  type ListMemoryPagesResponse,
  type MemoryArchiveReason,
  type MemoryFilter,
  type MemoryPage,
  type MemoryPageSummary,
  type MemoryStats,
} from '@kbn/nightshift-investigations-plugin/common';

import type {
  GetMemoryPageResponse,
  ListMemoryPagesResponse,
  MemoryPageSummary,
} from '@kbn/nightshift-investigations-plugin/common';

export type MemoryListResult = ListMemoryPagesResponse;
export type MemoryDetailResult = GetMemoryPageResponse;
export type MemorySummary = MemoryPageSummary;

/** The sidebar's own selection state, mirroring the Cortex tab. */
export type MemorySidebarSelection =
  | { kind: 'home' }
  | { kind: 'activity' }
  | { kind: 'page'; id: string };
