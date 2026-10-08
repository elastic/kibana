/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import type {
  FullScreenshotType,
  JourneyStepType,
  RefResultType,
  ScreenshotBlockDocType,
  ScreenshotImageBlobType,
  ScreenshotRefImageDataType,
  SyntheticsJourneyApiResponseType,
} from '../schemas/ping';

export type JourneyStep = SchemaOutput<typeof JourneyStepType>;
export type FullScreenshot = SchemaOutput<typeof FullScreenshotType>;
export type RefResult = SchemaOutput<typeof RefResultType>;
export type ScreenshotImageBlob = SchemaOutput<typeof ScreenshotImageBlobType>;
export type ScreenshotBlockDoc = SchemaOutput<typeof ScreenshotBlockDocType>;
export type ScreenshotRefImageData = SchemaOutput<typeof ScreenshotRefImageDataType>;
export type SyntheticsJourneyApiResponse = SchemaOutput<typeof SyntheticsJourneyApiResponseType>;

export interface PendingBlock {
  status: 'pending' | 'loading';
}

export type StoreScreenshotBlock = ScreenshotBlockDoc | PendingBlock;
export interface ScreenshotBlockCache {
  [hash: string]: StoreScreenshotBlock;
}

export function isPendingBlock(data: unknown): data is PendingBlock {
  return ['pending', 'loading'].some((s) => s === (data as PendingBlock)?.status);
}
