/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sumBy } from 'lodash';
import type { ForensicsSummaryViewModel } from './view_model';

// The sandboxed card can't measure itself, so its height is estimated from rounded sizes for the 736 px
// chat width with the system font the sandbox falls back to. The margin covers a wider font.

const MARGIN = 30;
const HEIGHTS = {
  /** The eyebrow, title, badge row and the gap below the header, without its line of facts. */
  header: 101,
  /** A line of body text, and a line of small text. */
  line: 21,
  meta: 16,
  /** A section's heading and the gap above it. */
  section: 49,
  /** The gap above the tiles, and the tiles. */
  tiles: 122,
  /** The callout's padding. */
  callout: 24,
  /** A row of kill-chain chips and the gap under it. */
  chainRow: 24,
  /** A proposal's padding, title row and line of facts, and the gap under it. */
  proposal: 65,
  /** The gap under a list row. */
  rowGap: 6,
  /** The alerts' summary line and the gap above it, and one alert's bar row. */
  alertsSummary: 49,
  alertBar: 24,
  reach: 29,
};
const CHARACTERS_PER_LINE = {
  /** Full-width prose. */
  prose: 90,
  /** A timeline event's description, beside its 150 px timestamp. */
  event: 70,
  /** Indicator values, monospaced, beside their label and count. */
  ioc: 75,
  /** Small text at full width. */
  meta: 120,
};
/** The kill-chain chips at 736 px fit about this many to a row. */
const TACTICS_PER_ROW = 11;

const countLines = (text: string, charactersPerLine: number): number =>
  Math.max(1, Math.ceil(text.length / charactersPerLine));

/** The height of the forensics summary card in pixels: an estimate, plus a margin. */
export const estimateForensicsSummaryHeight = (viewModel: ForensicsSummaryViewModel): number => {
  const { attackTitle, analyzedAt, summary, killChain, proposals, timeline, indicators, alerts } =
    viewModel;
  const headerFacts = [attackTitle, analyzedAt].filter(Boolean).join(' · ');

  const header =
    HEIGHTS.header +
    (headerFacts ? countLines(headerFacts, CHARACTERS_PER_LINE.meta) * HEIGHTS.meta : 0);
  const summaryHeight = summary
    ? HEIGHTS.section +
      HEIGHTS.callout +
      countLines(summary, CHARACTERS_PER_LINE.prose) * HEIGHTS.line
    : 0;
  const chain = killChain.length
    ? HEIGHTS.section + Math.ceil(killChain.length / TACTICS_PER_ROW) * HEIGHTS.chainRow
    : 0;
  const proposalsHeight = proposals.length
    ? HEIGHTS.section +
      sumBy(
        proposals,
        ({ title }) =>
          HEIGHTS.proposal + (countLines(title, CHARACTERS_PER_LINE.prose) - 1) * HEIGHTS.line
      )
    : 0;
  const timelineHeight = timeline.events.length
    ? HEIGHTS.section +
      sumBy(
        timeline.events,
        ({ description }) =>
          countLines(description, CHARACTERS_PER_LINE.event) * HEIGHTS.line + HEIGHTS.rowGap
      ) +
      (timeline.total > timeline.events.length ? HEIGHTS.meta : 0)
    : 0;
  const indicatorsHeight = indicators.length
    ? HEIGHTS.section +
      sumBy(
        indicators,
        ({ values }) =>
          Math.max(
            HEIGHTS.line,
            countLines(values.join(' · '), CHARACTERS_PER_LINE.ioc) * HEIGHTS.meta
          ) + HEIGHTS.rowGap
      )
    : 0;
  const alertsHeight =
    alerts.total > 0
      ? HEIGHTS.alertsSummary +
        (alerts.closePending
          ? Math.max(alerts.shown.length * HEIGHTS.alertBar, HEIGHTS.meta) + HEIGHTS.reach
          : 0)
      : 0;

  return (
    MARGIN +
    header +
    summaryHeight +
    HEIGHTS.tiles +
    chain +
    proposalsHeight +
    timelineHeight +
    indicatorsHeight +
    alertsHeight
  );
};
