/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared height for this metrics version’s overview: Needs-attention
 * metrics in one equal-width row.
 */

/** Height of each metric card (fits 2-line titles and 2-line subtitles). */
export const METRIC_CARD_HEIGHT = 180;

/** Same cards without the sparkline or delta row. */
export const SIMPLIFIED_METRIC_CARD_HEIGHT = 156;

/** Gap between separate metric cards. */
export const METRIC_CARD_GAP = 8;

/** Full metrics panel height (single row of cards). */
export const METRIC_CHARTS_BODY_HEIGHT = METRIC_CARD_HEIGHT;

/**
 * Entities-by header row (title + compressed StackByComboBox).
 */
export const SUMMARY_PANEL_HEADER_HEIGHT = 32;

/**
 * Chart/table body height inside the Entities-by panel so the pie half matches
 * the metrics panel: padding (16×2) + header (32) + header margin (16) + content.
 */
export const SUMMARY_CONTENT_HEIGHT =
  METRIC_CHARTS_BODY_HEIGHT - 16 - SUMMARY_PANEL_HEADER_HEIGHT - 16 - 16;
