/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PendingBlock,
  ScreenshotBlockCache,
  ScreenshotBlockDoc,
  SyntheticsJourneyApiResponse,
} from '../../../../../common/runtime_types';

export function isPendingBlock(data: unknown): data is PendingBlock {
  return ['pending', 'loading'].some((s) => s === (data as PendingBlock)?.status);
}

export interface CacheHitCount {
  hash: string;
  hitTime: number;
}

export interface BrowserJourneyState {
  blocks: ScreenshotBlockCache;
  cacheSize: number;
  hitCount: CacheHitCount[];
  journeys: Record<string, SyntheticsJourneyApiResponse>;
  journeysLoading: Record<string, boolean>;
}

export interface PutBlocksPayload {
  blocks: ScreenshotBlockDoc[];
}
