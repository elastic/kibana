/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { range } from 'lodash';
import type { MobileReleaseRow } from '../../../../../common/types/mobile';

type VisColors = EuiThemeComputed['colors']['vis'];

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

/** A colour per release, by its rank among every release so it keeps it when filtered. */
export const getReleaseColors = (
  releases: readonly MobileReleaseRow[],
  vis: VisColors,
  rankedReleases: readonly string[] = []
): Map<string, string> => {
  const palette = categoricalColors(vis);
  const named = releases.filter(({ isOther }) => !isOther).map(({ release }) => release);
  const rankOf = (release: string) => rankedReleases.indexOf(release) % palette.length;
  const used = new Set(named.map(rankOf).filter((rank) => rank >= 0));
  // A release the ranking misses, e.g. while the OS changes, takes a colour no ranked one has
  const free = range(palette.length).filter((index) => !used.has(index));
  const colors = new Map<string, string>();
  named.forEach((release) => {
    const rank = rankOf(release);
    colors.set(release, palette[rank >= 0 ? rank : (free.shift() ?? 0)]);
  });
  releases
    .filter(({ isOther }) => isOther)
    .forEach(({ release }) => colors.set(release, vis.euiColorVisGrey2));
  return colors;
};
