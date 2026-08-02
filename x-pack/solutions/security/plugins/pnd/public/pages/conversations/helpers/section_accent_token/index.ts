/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecommendedAction } from '@kbn/pnd-common';

/** The EUI visualization tokens the four KPI tiles are accented with. */
export type SectionAccentToken = 'euiColorVis2' | 'euiColorVis4' | 'euiColorVis6' | 'euiColorVis8';

/**
 * The accent on each KPI tile — `euiColorVis6 | 8 | 2 | 4`, in section order (decision D11), drawn
 * as its sparkline's stroke.
 *
 * A **second** palette, beside `@kbn/pnd-common`'s `CONVERSATION_CATEGORY_COLORS`, on purpose. That
 * one is semantic: `contain` is
 * `danger` because containing is the urgent thing, and that meaning has to survive everywhere a
 * bucket is named. The tiles are a summary row, where four adjacent semantic colors read as four
 * severities rather than four phases; the visualization ramp is what makes them read as a legend.
 * Unifying the two loses one of those two jobs, so they stay apart — see the test that pins them
 * disjoint.
 *
 * Tokens rather than resolved colors, because the resolved value comes from `useEuiTheme()` and
 * depends on the active theme: `euiTheme.colors.vis[SECTION_ACCENT_TOKEN[action]]`.
 */
export const SECTION_ACCENT_TOKEN: Readonly<Record<RecommendedAction, SectionAccentToken>> = {
  contain: 'euiColorVis6',
  escalate: 'euiColorVis8',
  investigate: 'euiColorVis2',
  tune: 'euiColorVis4',
};
