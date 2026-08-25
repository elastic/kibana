/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared height for the v.5 overview pair: Needs-attention metrics (2×3) and
 * the Entities-by pie panel.
 */

/** Height of each metric card / row in the 2×3 grid. */
export const METRIC_CARD_HEIGHT = 156;

/** Full metrics panel height (two rows). */
export const METRIC_CHARTS_BODY_HEIGHT = METRIC_CARD_HEIGHT * 2;

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
