/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rgb, nest } from 'd3';

interface ColorStat {
  key: string;
  value: number;
  withinTolerance?: boolean;
}

type ColorStats = ColorStat[];

/**
 * Returns if a given value is within the tolerated range of an expected value
 *
 * @param actualValue
 * @param expectedValue
 * @param toleranceRange
 * @returns if actualValue is within the tolerance of expectedValue
 */
function isValueWithinTolerance(actualValue: number, expectedValue: number, toleranceRange = 10) {
  const lower = expectedValue - toleranceRange / 2;
  const upper = expectedValue + toleranceRange / 2;
  return lower <= actualValue && upper >= actualValue;
}

/**
 * Returns color statistics for image data derived from a 2D Canvas element.
 *
 * @param imageData - a single level array of number where every 4 number represent a RGBA value.
 * @param expectedColorStats - optional stats to compare against and check if the percentage is within the tolerance.
 * @param threshold - colors below this percentage threshold will be filtered from the returned list of colors
 * @returns an array of colors and their percentage of appearance in the given image data
 */
export function getColorStats(
  imageData: number[],
  expectedColorStats?: ColorStats,
  threshold = 5
): ColorStats {
  // transform the array of RGBA numbers to an array of hex values
  const colors: string[] = [];
  for (let i = 0; i < imageData.length; i += 4) {
    // uses d3's `rgb` method create a color object, `toString()` returns the hex value
    colors.push(
      rgb(imageData[i], imageData[i + 1], imageData[i + 2])
        .toString()
        .toUpperCase()
    );
  }

  const expectedColorStatsMap =
    expectedColorStats !== undefined
      ? expectedColorStats.reduce((p, c) => {
          p[c.key] = c.value;
          return p;
        }, {} as Record<string, number>)
      : {};

  function getPixelPercentage(pixelsNum: number): number {
    return Math.round((pixelsNum / colors.length) * 100);
  }

  // - d3's nest/key/entries methods will group the array of hex values so we can count
  //   the number of times a color appears in the image.
  // - then we'll filter all colors below the given threshold
  // - last step is to return the ColorStat object which includes the color,
  //   the percentage it shows up in the image and optionally the check if it's within
  //   the tolerance of the expected value.
  return nest<string>()
    .key((d) => d)
    .entries(colors)
    .filter((s) => getPixelPercentage(s.values.length) >= threshold)
    .map((s) => {
      const value = getPixelPercentage(s.values.length);
      return {
        key: s.key,
        value,
        ...(expectedColorStats !== undefined
          ? { withinTolerance: isValueWithinTolerance(value, expectedColorStatsMap[s.key]) }
          : {}),
      };
    });
}
