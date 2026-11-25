/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { MobileReleaseRow } from '../../../../../common/types/mobile';

type VisColors = EuiThemeComputed['colors']['vis'];

/** The theme's categorical colours, in order. */
const categoricalColors = (vis: VisColors): string[] => [
  vis.euiColorVis0,
  vis.euiColorVis1,
  vis.euiColorVis2,
  vis.euiColorVis3,
  vis.euiColorVis4,
  vis.euiColorVis5,
  vis.euiColorVis6,
  vis.euiColorVis7,
  vis.euiColorVis8,
  vis.euiColorVis9,
];

/**
 * A colour per release, from the theme, so the table and both charts agree; "Other" is grey. Each
 * release takes the colour of its place in `rankedReleases`, every release with data most sessions
 * first, so it keeps it when the page is filtered to it; one missing from it takes its place in
 * `releases`.
 */
export const getReleaseColors = (
  releases: readonly MobileReleaseRow[],
  vis: VisColors,
  rankedReleases: readonly string[] = []
): Map<string, string> => {
  const palette = categoricalColors(vis);
  const colors = new Map<string, string>();
  releases
    .filter(({ isOther }) => !isOther)
    .forEach(({ release }, index) => {
      const rank = rankedReleases.indexOf(release);
      colors.set(release, palette[(rank === -1 ? index : rank) % palette.length]);
    });
  releases
    .filter(({ isOther }) => isOther)
    .forEach(({ release }) => colors.set(release, vis.euiColorVisGrey2));
  return colors;
};
