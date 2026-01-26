/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Color utilities for the waffle map visualization.
 * Adapted from the inventory view's color_from_value.ts to work with LegendConfig.
 */

import { mix, parseToRgb, toColorString, readableColor } from 'polished';
import {
  euiPaletteForStatus,
  euiPaletteForTemperature,
  euiPaletteWarm,
  euiPaletteCool,
  euiPaletteGreen,
  euiPaletteRed,
} from '@elastic/eui';
import type { LegendConfig, ColorPaletteName, WaffleBounds } from '../types';

const DEFAULT_COLOR = 'rgba(217, 217, 217, 1)';

/**
 * Get a color palette array based on the palette name
 */
export const getColorPalette = (
  paletteName: ColorPaletteName,
  colorCount: number,
  reverse: boolean = false
): string[] => {
  let colors: string[];

  switch (paletteName) {
    case 'temperature':
      colors = euiPaletteForTemperature(colorCount);
      break;
    case 'status':
      colors = euiPaletteForStatus(colorCount);
      break;
    case 'cool':
      colors = euiPaletteCool(colorCount);
      break;
    case 'warm':
      colors = euiPaletteWarm(colorCount);
      break;
    case 'positive':
      colors = euiPaletteGreen(colorCount);
      break;
    case 'negative':
      colors = euiPaletteRed(colorCount);
      break;
    default:
      colors = euiPaletteForStatus(colorCount);
  }

  return reverse ? [...colors].reverse() : colors;
};

/**
 * Normalize a value to a 0-1 range based on bounds
 */
const normalizeValue = (min: number, max: number, value: number): number => {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

/**
 * Convert any color string to an RGB string
 */
const convertToRgbString = (color: string): string => {
  try {
    return toColorString(parseToRgb(color));
  } catch {
    return DEFAULT_COLOR;
  }
};

/**
 * Calculate a gradient color based on the normalized position
 */
const calculateGradientColor = (colors: string[], normalizedValue: number): string => {
  if (colors.length === 0) return DEFAULT_COLOR;
  if (colors.length === 1) return colors[0];

  // Map normalized value to color array index
  const scaledIndex = normalizedValue * (colors.length - 1);
  const lowerIndex = Math.floor(scaledIndex);
  const upperIndex = Math.ceil(scaledIndex);

  // Handle edge cases
  if (lowerIndex === upperIndex) {
    return colors[lowerIndex];
  }

  // Interpolate between the two colors
  const mixValue = scaledIndex - lowerIndex;
  return mix(mixValue, colors[upperIndex], colors[lowerIndex]);
};

/**
 * Get the color for a value based on legend configuration
 */
export const colorFromValue = (
  legendConfig: LegendConfig,
  value: number,
  bounds: WaffleBounds
): string => {
  try {
    // Use legend bounds or provided bounds
    const effectiveBounds = legendConfig.autoBounds
      ? bounds
      : { min: legendConfig.bounds.min, max: legendConfig.bounds.max };

    // Normalize the value
    const normalizedValue = normalizeValue(effectiveBounds.min, effectiveBounds.max, value);

    // Get the color palette
    const colors = getColorPalette(
      legendConfig.palette,
      legendConfig.steps,
      legendConfig.reverseColors
    );

    // Calculate color using gradient interpolation
    const color = calculateGradientColor(colors, normalizedValue);

    return convertToRgbString(color);
  } catch {
    return DEFAULT_COLOR;
  }
};

/**
 * Get a readable text color (black or white) based on the background color
 */
export const getTextColor = (backgroundColor: string): string => {
  try {
    return readableColor(backgroundColor);
  } catch {
    return '#000000';
  }
};

/**
 * Get the color for text or background based on legend configuration
 */
export const getNodeColors = (
  legendConfig: LegendConfig,
  value: number,
  bounds: WaffleBounds
): { background: string; text: string } => {
  const computedColor = colorFromValue(legendConfig, value, bounds);

  if (legendConfig.applyColorTo === 'text') {
    return {
      background: '#ffffff',
      text: computedColor,
    };
  }

  // Apply to background (default)
  return {
    background: computedColor,
    text: getTextColor(computedColor),
  };
};
