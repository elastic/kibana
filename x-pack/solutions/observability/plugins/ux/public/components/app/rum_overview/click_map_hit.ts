/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const clickMapStageFit = (
  stageWidth: number,
  stageHeight: number,
  pageWidth: number,
  pageHeight: number
): { scale: number; left: number; top: number } => {
  if (stageWidth <= 0 || stageHeight <= 0 || pageWidth <= 0 || pageHeight <= 0) {
    return { scale: 1, left: 0, top: 0 };
  }
  const scale = Math.min(stageWidth / pageWidth, stageHeight / pageHeight, 1);
  return {
    scale,
    left: Math.max(0, (stageWidth - pageWidth * scale) / 2),
    top: Math.max(0, (stageHeight - pageHeight * scale) / 2),
  };
};

/** Matches the painted heatmap blob radius in snapshot pixels. */
export const clickBinRadius = (count: number, maxCount: number): number =>
  28 + 16 * (count / Math.max(1, maxCount));
