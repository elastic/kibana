/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

/**
 * No rule under a table's last row (2026-08-10 declutter, bead kibana-phf4.33).
 *
 * The bottom rule reads as the start of a row that is not there, and every one of these tables sits
 * inside a bordered `SettingsSection` panel that already draws the boundary. EUI styles its cells
 * with `border-block`, not `border-bottom`, so clearing `border-bottom` here would look correct in a
 * snapshot and change nothing in a browser.
 */
export const flushLastRowStyles = css`
  .euiTableRow:last-child .euiTableRowCell {
    border-block-end: none;
  }
`;

/**
 * A catalog row's description is one line, with the full text on hover (same decision).
 *
 * Truncation needs a bounded cell, so a table using this must keep EUI's default
 * `tableLayout="fixed"` — under `auto` the column widens to fit the longest description instead and
 * nothing ever ellipsises. The two rules on `.euiTableCellContent` are what stop a long single line
 * from pushing its way into the neighbouring column.
 */
export const oneLineCellStyles = css`
  .euiTableCellContent {
    overflow: hidden;
  }

  .euiTableCellContent > * {
    min-width: 0;
    max-width: 100%;
  }
`;

/** Applied to the description text itself; the full text belongs in a `title` on the same node. */
export const truncatedDescriptionStyles = css`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/**
 * No column headers on a watch detail table (2026-08-13 declutter, bead kibana-phf4.27).
 *
 * "The section titles already name the lists" — a two-word header row above two rows of content is
 * chrome. Only the **watch detail** page's tables take this: the standalone Workers and Skills
 * catalogs are sortable, multi-column tables where the header is the affordance, so they keep theirs.
 *
 * `display: none` on the `thead` takes the column names out of the accessibility tree with them, so
 * every table using this must pass a `tableCaption` — that becomes the table's accessible name, and
 * each row's meaning is carried by its own content rather than by a column position.
 *
 * The first-row rule is not decoration: with the header gone, EUI's top cell border becomes the top
 * edge of the panel the table sits in, drawn a second time. Same `border-block` trap as
 * {@link flushLastRowStyles}.
 */
export const hiddenColumnHeaderStyles = css`
  thead {
    display: none;
  }

  .euiTableRow:first-child .euiTableRowCell {
    border-block-start: none;
  }
`;
