/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum, sumBy } from 'lodash';
import { MIN_CHART_POINTS } from './risk_history_chart';
import type { BriefViewModel } from './view_model';
import {
  factText,
  getHeaderFacts,
  getPriorityFacts,
  getShownCounts,
  hasPrioritiesSection,
} from './view_model';

// The card needs its height up front, so it is estimated from rounded sizes, measured in Chromium at the
// card's 832 px width with the system font the sandbox falls back to. The margin covers a wider font.

const MARGIN = 30;
const CHARACTERS_PER_LINE = { prose: 90, wide: 100, note: 120 };
const HEIGHTS = {
  /** The padding around the brief, its header without the facts under the title, and the gap below. */
  header: 114,
  /** A line of text. */
  line: 21,
  /** A section's heading and the gap above the section. */
  section: 57,
  /** A line of facts, under the header or a priority's badges. */
  fact: 16,
  /** A priority's padding, a line of its title and a row of badges, three headings, and the gaps between its blocks, on top of its lines. */
  priority: 181,
  /** The gap above a priority's facts. */
  factsGap: 12,
  /** The risk history with its chart and the gap above it, or with the caption alone. */
  chart: 152,
  caption: 52,
};

/** The title and the badges under it are 666 px wide. */
const TITLE_ROW = { width: 666, nameCharacter: 9.5, nameLine: 21 };
/** The widths of the badges, from their text: the type, risk and criticality badges. */
const BADGE_WIDTHS = { type: 60, risk: 135, criticality: 125 };
const BADGE_ROW = { height: 20, gap: 6 };
/** The counts sit in a grid of tiles at least 160 px wide, so four fit in a row of the 736 px brief. */
const COUNT_GRID = { perRow: 4, rowHeight: 146, gap: 8, top: 4 };

const countsHeight = (count: number): number => {
  const rows = Math.ceil(count / COUNT_GRID.perRow);
  return COUNT_GRID.top + rows * COUNT_GRID.rowHeight + (rows - 1) * COUNT_GRID.gap;
};

const countLines = (text: string, charactersPerLine = CHARACTERS_PER_LINE.wide): number =>
  Math.ceil(text.length / charactersPerLine);

/** The height of the brief's card in pixels: an estimate, plus a margin. */
export const estimateBriefHeight = (viewModel: BriefViewModel): number => {
  const { summary, recommendation, priorities } = viewModel;
  const prose = (text = ''): number =>
    text ? HEIGHTS.section + countLines(text) * HEIGHTS.line : 0;
  /** What the title and badges add past one line of title and one row of badges: the lines it wraps to, and the rows they wrap to. */
  const headHeight = ({
    name,
    risk,
    assetCriticality,
  }: BriefViewModel['priorities'][number]): number => {
    const widths = [
      BADGE_WIDTHS.type,
      ...(risk ? [BADGE_WIDTHS.risk] : []),
      ...(assetCriticality ? [BADGE_WIDTHS.criticality] : []),
    ];
    const total = sum(widths) + BADGE_ROW.gap * (widths.length - 1);
    const { width, nameCharacter, nameLine } = TITLE_ROW;
    const nameLines = Math.ceil((name.length * nameCharacter) / width);
    return (
      (nameLines - 1) * nameLine +
      (Math.ceil(total / width) - 1) * (BADGE_ROW.height + BADGE_ROW.gap)
    );
  };
  const priorityHeight = (priority: BriefViewModel['priorities'][number]) => {
    const { assessment, whyFirst, nextStep, riskHistory } = priority;
    const facts = getPriorityFacts(priority).map(factText).join(' · ');
    return (
      headHeight(priority) +
      HEIGHTS.priority +
      (facts ? HEIGHTS.factsGap + countLines(facts, CHARACTERS_PER_LINE.note) * HEIGHTS.fact : 0) +
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
    countLines(getHeaderFacts(viewModel).map(factText).join(' · '), CHARACTERS_PER_LINE.note) *
      HEIGHTS.fact +
    prose(summary) +
    (getShownCounts(viewModel).length > 0
      ? HEIGHTS.section + countsHeight(getShownCounts(viewModel).length)
      : 0) +
    prose(recommendation) +
    (hasPrioritiesSection(viewModel) ? HEIGHTS.section : 0) +
    (priorities.length === 0 && hasPrioritiesSection(viewModel) ? HEIGHTS.line : 0) +
    sumBy(priorities, priorityHeight)
  );
};
