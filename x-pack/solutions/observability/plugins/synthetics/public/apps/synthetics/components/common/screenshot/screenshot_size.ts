/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ScreenshotImageSize =
  | [96, 64]
  | [100, 64]
  | [180, 112]
  | [172, 120]
  | [260, 160]
  | [320, 200]
  | [640, 360]
  | 'full';

export const THUMBNAIL_SCREENSHOT_SIZE: ScreenshotImageSize = [96, 64];
export const THUMBNAIL_SCREENSHOT_SIZE_MOBILE: ScreenshotImageSize = [180, 112];
export const POPOVER_SCREENSHOT_SIZE: ScreenshotImageSize = [640, 360];

export function getConfinedScreenshotSize(
  size: ScreenshotImageSize | [number, number],
  maxSize?: [number, number]
) {
  const constrainedWidth = '86vw';
  const constrainedHeight = '70vh';
  const maxWidth = maxSize?.[0] ? `${maxSize[0]}px` : constrainedWidth;
  const maxHeight = maxSize?.[1] ? `${maxSize[1]}px` : constrainedHeight;
  const width = size === 'full' ? maxWidth : `${size[0]}px`;
  const height = size === 'full' ? maxHeight : `${size[1]}px`;

  return {
    width: `min(${width}, ${constrainedWidth})`,
    height: `min(${height}, ${constrainedHeight})`,
  };
}
