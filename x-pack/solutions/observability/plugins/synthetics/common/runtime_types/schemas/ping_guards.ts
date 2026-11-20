/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FullScreenshot,
  RefResult,
  ScreenshotBlockDoc,
  ScreenshotImageBlob,
  ScreenshotRefImageData,
} from '../ping/synthetics';
import {
  FullScreenshotType,
  RefResultType,
  ScreenshotBlockDocType,
  ScreenshotImageBlobType,
  ScreenshotRefImageDataType,
} from './ping';

export function isFullScreenshot(data: unknown): data is FullScreenshot {
  return FullScreenshotType.safeParse(data).success;
}

export function isRefResult(data: unknown): data is RefResult {
  return RefResultType.safeParse(data).success;
}

export function isScreenshotImageBlob(data: unknown): data is ScreenshotImageBlob {
  return ScreenshotImageBlobType.safeParse(data).success;
}

export function isScreenshotBlockDoc(data: unknown): data is ScreenshotBlockDoc {
  return ScreenshotBlockDocType.safeParse(data).success;
}

export function isScreenshotRef(data: unknown): data is ScreenshotRefImageData {
  return ScreenshotRefImageDataType.safeParse(data).success;
}
