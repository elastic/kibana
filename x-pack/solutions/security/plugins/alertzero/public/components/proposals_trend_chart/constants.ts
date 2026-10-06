/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

/**
 * One card per proposal category. `id` *is* the category an action declares —
 * there is no translation table, so a card can only ever be reading the
 * category it is named after.
 *
 * Any other category (`escalate`, or the `uncategorized` fallback a proposal
 * with no action gets) has no card of its own but still reaches the header
 * count, which the proposals list API totals over every pending proposal.
 *
 * Frozen rather than only `as const`: `as const` is a compile-time promise,
 * and this module-level array is shared by every card on the page.
 */
export const TREND_CHART_PANELS = Object.freeze([
  { id: 'respond', label: i18n.RESPOND_LABEL, color: 'danger' },
  { id: 'investigate', label: i18n.INVESTIGATE_LABEL, color: 'warning' },
  { id: 'configure', label: i18n.CONFIGURE_LABEL, color: 'primary' },
] as const);

/** Doubles as the proposal category the card counts. */
export type TrendChartPanelId = (typeof TREND_CHART_PANELS)[number]['id'];
export type TrendChartPanelColor = (typeof TREND_CHART_PANELS)[number]['color'];
