/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rgb, nest } from 'd3';

interface ColorStat {
  key: string;
  value: number;
  withinTolerance?: boolean;
}

type ColorStats = ColorStat[];

import { FtrProviderContext } from '../ftr_provider_context';

export async function CanvasElementProvider({ getService }: FtrProviderContext) {
  const { driver } = await getService('__webdriver__').init();

  return new (class CanvasElementService {
    // disable font anti-aliasing to be more resilient
    // against OS rendering differences
    public async disableAntiAliasing() {
      await driver.executeScript(
        `
        document.body.style["font-smooth"] = "never";
        document.body.style["-webkit-font-smoothing"] = "none";
        document.body.classList.add("mlDisableAntiAliasing");
        `
      );
    }

    public async resetAntiAliasing() {
      await driver.executeScript(
        `
        document.body.style["font-smooth"] = "";
        document.body.style["-webkit-font-smoothing"] = "";
        document.body.classList.remove("mlDisableAntiAliasing");
        `
      );
    }

    /**
     * Gets the image data of a canvas element
     * @param selector querySelector to access the canvas element.
     *
     * @returns {Promise<number[]>} a single level array of number where every 4 numbers represent a RGBA value.
     */
    public async getImageData(selector: string): Promise<number[]> {
      return await driver.executeScript(
        `
        try {
          const el = document.querySelector('${selector}');
          const ctx = el.getContext('2d');
          return ctx.getImageData(0, 0, el.width, el.height).data;
        } catch(e) {
          return [];
        }
        `
      );
    }

    /**
     * Returns color statistics for image data derived from a 2D Canvas element.
     *
     * @param selector querySelector to access the canvas element.
     * @param expectedColorStats - optional stats to compare against and check if the percentage is within the tolerance.
     * @param percentageThreshold - colors below this percentage threshold will be filtered from the returned list of colors
     * @param channelTolerance - tolerance for each RGB channel value
     * @param exclude - colors to exclude, useful for e.g. known background color values
     * @returns an array of colors and their percentage of appearance in the given image data
     */
    public async getColorStats(
      selector: string,
      expectedColorStats?: ColorStats,
      exclude?: string[],
      percentageThreshold = 5,
      channelTolerance = 10,
      valueTolerance = 10
    ): Promise<ColorStats> {
      const imageData = await this.getImageData(selector);
      // transform the array of RGBA numbers to an array of hex values
      const colors: string[] = [];
      for (let i = 0; i < imageData.length; i += 4) {
        // uses d3's `rgb` method create a color object, `toString()` returns the hex value
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const color = rgb(r, g, b).toString().toUpperCase();
        if (exclude === undefined || !exclude.includes(color)) colors.push(color);
      }

      function getPixelPercentage(pixelsNum: number): number {
        return (pixelsNum / colors.length) * 100;
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
        .filter((s) => getPixelPercentage(s.values.length) >= percentageThreshold)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((s, i) => {
          const value = getPixelPercentage(s.values.length);
          return {
            key: s.key,
            value,
            ...(expectedColorStats !== undefined
              ? {
                  withinTolerance:
                    this.isValueWithinTolerance(
                      value,
                      expectedColorStats[i]?.value,
                      valueTolerance
                    ) &&
                    this.isColorWithinTolerance(
                      s.key,
                      expectedColorStats[i]?.key,
                      channelTolerance
                    ),
                }
              : {}),
          };
        });
    }

    /**
     * Same as getColorStats() but also checks if each supplied
     * expected color lies within channelTolerance.
     */
    public async getColorStatsWithColorTolerance(
      selector: string,
      expectedColorStats: ColorStats,
      exclude?: string[],
      percentageThreshold = 0,
      channelTolerance = 10,
      valueTolerance = 10
    ) {
      const actualColorStats = await this.getColorStats(
        selector,
        undefined,
        exclude,
        percentageThreshold,
        channelTolerance,
        valueTolerance
      );

      return expectedColorStats.map((expectedColor) => {
        const colorPercentageWithinTolerance = actualColorStats
          .filter((d) => this.isColorWithinTolerance(d.key, expectedColor.key, channelTolerance))
          .reduce((sum, x) => sum + x.value, 0);

        return {
          key: expectedColor.key,
          value: colorPercentageWithinTolerance,
          withinTolerance: this.isValueWithinTolerance(
            colorPercentageWithinTolerance,
            expectedColor.value,
            valueTolerance
          ),
        };
      });
    }

    /**
     * Returns if a given color is within the tolerated range of an expected color
     *
     * @param actualColor
     * @param expectedColor
     * @param toleranceRange
     * @returns if actualColor is within the tolerance of expectedColor
     */
    public isColorWithinTolerance(actualColor: string, expectedColor: string, toleranceRange = 10) {
      const actualRGB = rgb(actualColor);
      const expectedRGB = rgb(expectedColor);

      const lowerR = expectedRGB.r - toleranceRange / 2;
      const upperR = expectedRGB.r + toleranceRange / 2;
      const lowerG = expectedRGB.g - toleranceRange / 2;
      const upperG = expectedRGB.g + toleranceRange / 2;
      const lowerB = expectedRGB.b - toleranceRange / 2;
      const upperB = expectedRGB.b + toleranceRange / 2;

      return (
        lowerR <= actualRGB.r &&
        upperR >= actualRGB.r &&
        lowerG <= actualRGB.g &&
        upperG >= actualRGB.g &&
        lowerB <= actualRGB.b &&
        upperB >= actualRGB.b
      );
    }

    /**
     * Returns if a given value is within the tolerated range of an expected value
     *
     * @param actualValue
     * @param expectedValue
     * @param toleranceRange
     * @returns if actualValue is within the tolerance of expectedValue
     */
    public isValueWithinTolerance(actualValue: number, expectedValue: number, toleranceRange = 10) {
      const lower = expectedValue - toleranceRange / 2;
      const upper = expectedValue + toleranceRange / 2;
      return actualValue > 0 && lower <= actualValue && upper >= actualValue;
    }
  })();
}
