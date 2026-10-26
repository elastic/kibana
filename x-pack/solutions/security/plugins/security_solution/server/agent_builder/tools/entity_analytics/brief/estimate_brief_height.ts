/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum, sumBy } from 'lodash';
import { MIN_CHART_POINTS } from './risk_history_chart';
import type { BriefViewModel } from './view_model';
import { MAX_WATCHLIST_PILLS, getNotes, getShownCounts, hasPrioritiesSection } from './view_model';

// The card needs its height up front, so it is estimated from rounded sizes, measured in Chromium at the
// card's 832 px width with the system font the sandbox falls back to. The margin covers a wider font.

const MARGIN = 30;
const CHARACTERS_PER_LINE = { prose: 76, wide: 100, note: 120 };
const HEIGHTS = {
  /** The padding around the brief, its header, and the gap below. */
  header: 115,
  /** A line of text. */
  line: 21,
  /** A section's heading and the gap above the section. */
  section: 45,
  /** A line of notes under the header. */
  note: 17,
  /** The counts. */
  counts: 100,
  /** A priority's padding and title row, and the gaps between its blocks, on top of its lines. */
  priority: 100,
  /** The risk history with its chart, or with the caption alone. */
  chart: 140,
  caption: 40,
};

/** The title row is 666 px wide. Pills sit beside the title when they leave it 12 characters (about 92 px) and the gap. */
const TITLE_ROW = { width: 666, gap: 12, minTitle: 92, nameCharacter: 9.5, nameLine: 21 };
/** The widths of the pills, from measurements: the risk and criticality pills, and a character of a watchlist name. */
const PILL_WIDTHS = {
  risk: 115,
  criticality: 125,
  more: 85,
  watchlistCharacter: 6.6,
  watchlistPadding: 18,
};
/** A watchlist pill shows at most 40 characters of its name. */
const MAX_WATCHLIST_CHARACTERS = 40;
const PILL_ROW = { height: 24, gap: 6 };

const countLines = (text: string, charactersPerLine = CHARACTERS_PER_LINE.wide): number =>
  Math.ceil(text.length / charactersPerLine);

/** The height of the brief's card in pixels: an estimate, plus a margin. */
export const estimateBriefHeight = (viewModel: BriefViewModel): number => {
  const { summary, recommendation, priorities } = viewModel;
  const prose = (text = ''): number =>
    text ? HEIGHTS.section + countLines(text) * HEIGHTS.line : 0;
  /** What the pills add to the title row: rows under the title when they don't fit beside it, else the lines the title wraps to. */
  const pillsHeight = ({
    name,
    risk,
    assetCriticality,
    watchlists,
  }: BriefViewModel['priorities'][number]): number => {
    const widths = [
      ...(risk ? [PILL_WIDTHS.risk] : []),
      ...(assetCriticality ? [PILL_WIDTHS.criticality] : []),
      ...watchlists
        .slice(0, MAX_WATCHLIST_PILLS)
        .map(
          (watchlist) =>
            Math.min(watchlist.length, MAX_WATCHLIST_CHARACTERS) * PILL_WIDTHS.watchlistCharacter +
            PILL_WIDTHS.watchlistPadding
        ),
      ...(watchlists.length > MAX_WATCHLIST_PILLS ? [PILL_WIDTHS.more] : []),
    ];
    const total = sum(widths) + PILL_ROW.gap * Math.max(0, widths.length - 1);
    const { width, gap, minTitle, nameCharacter, nameLine } = TITLE_ROW;
    if (total + gap + minTitle > width) {
      const rows = Math.ceil(total / width);
      return PILL_ROW.gap + rows * PILL_ROW.height + (rows - 1) * PILL_ROW.gap;
    }
    const nameLines = Math.ceil((name.length * nameCharacter) / (width - gap - total));
    return (nameLines - 1) * nameLine;
  };
  const priorityHeight = (priority: BriefViewModel['priorities'][number]) => {
    const { assessment, whyFirst, nextStep, riskHistory } = priority;
    return (
      pillsHeight(priority) +
      HEIGHTS.priority +
      sumBy([assessment, whyFirst, nextStep], (text) =>
        countLines(text, CHARACTERS_PER_LINE.prose)
      ) *
        HEIGHTS.line +
      (riskHistory && riskHistory.points.length >= 2
        ? riskHistory.points.length >= MIN_CHART_POINTS
          ? HEIGHTS.chart
          : HEIGHTS.caption
        : 0)
    );
  };
  return (
    MARGIN +
    HEIGHTS.header +
    sumBy(
      getNotes(viewModel),
      (note) => countLines(note, CHARACTERS_PER_LINE.note) * HEIGHTS.note
    ) +
    prose(summary) +
    (getShownCounts(viewModel).length > 0 ? HEIGHTS.section + HEIGHTS.counts : 0) +
    prose(recommendation) +
    (hasPrioritiesSection(viewModel) ? HEIGHTS.section : 0) +
    (priorities.length === 0 && hasPrioritiesSection(viewModel) ? HEIGHTS.line : 0) +
    sumBy(priorities, priorityHeight)
  );
};
