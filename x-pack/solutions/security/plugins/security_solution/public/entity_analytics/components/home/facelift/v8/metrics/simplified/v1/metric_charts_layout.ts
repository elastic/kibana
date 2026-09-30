/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared height for simplified-track metrics v.1: same cards as the full
 * track, without sparkline backgrounds or period deltas.
 */

/** Fits 2-line titles, 2-line subtitles, and the primary value — no delta row. */
export const METRIC_CARD_HEIGHT = 156;

/** Gap between separate metric cards. */
export const METRIC_CARD_GAP = 8;

/** Full metrics panel height (single row of cards). */
export const METRIC_CHARTS_BODY_HEIGHT = METRIC_CARD_HEIGHT;
