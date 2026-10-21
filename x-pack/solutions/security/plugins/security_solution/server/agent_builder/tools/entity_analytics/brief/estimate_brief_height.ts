/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sumBy } from 'lodash';
import { MIN_CHART_POINTS } from './risk_history_chart';
import type { BriefViewModel } from './view_model';
import { getNotes, getShownCounts, hasPrioritiesSection } from './view_model';

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

const countLines = (text: string, charactersPerLine = CHARACTERS_PER_LINE.wide): number =>
  Math.ceil(text.length / charactersPerLine);

/** The height of the brief's card in pixels: an estimate, plus a margin. */
export const estimateBriefHeight = (viewModel: BriefViewModel): number => {
  const { summary, recommendation, priorities } = viewModel;
  const prose = (text = ''): number =>
    text ? HEIGHTS.section + countLines(text) * HEIGHTS.line : 0;
  const priorityHeight = ({
    assessment,
    whyFirst,
    nextStep,
    riskHistory,
  }: BriefViewModel['priorities'][number]) =>
    HEIGHTS.priority +
    sumBy([assessment, whyFirst, nextStep], (text) => countLines(text, CHARACTERS_PER_LINE.prose)) *
      HEIGHTS.line +
    (riskHistory && riskHistory.points.length >= 2
      ? riskHistory.points.length >= MIN_CHART_POINTS
        ? HEIGHTS.chart
        : HEIGHTS.caption
      : 0);
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
