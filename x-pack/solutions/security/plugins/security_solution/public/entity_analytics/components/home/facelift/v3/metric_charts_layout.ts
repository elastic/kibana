/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared layout for the metric-charts accordion body (Needs attention + Summary).
 *
 * Both tabs must share the same outer body height so toggling views does not
 * jump the page. Summary panels (padding + header + content) define the size;
 * Needs attention metric cards fill the same height.
 */

/** Chart/table body height inside each Summary panel (risk legend + 175px donuts). */
export const SUMMARY_CONTENT_HEIGHT = 200;

/**
 * Entities-by header row (title + compressed StackByComboBox). Combo controls
 * are 32px; plain Sources title aligns to the same row height via stretch.
 */
export const SUMMARY_PANEL_HEADER_HEIGHT = 32;

/**
 * Full panel / cards body height:
 * padding (16×2) + header (32) + header margin (16) + content.
 */
export const METRIC_CHARTS_BODY_HEIGHT =
  16 + SUMMARY_PANEL_HEADER_HEIGHT + 16 + SUMMARY_CONTENT_HEIGHT + 16;
