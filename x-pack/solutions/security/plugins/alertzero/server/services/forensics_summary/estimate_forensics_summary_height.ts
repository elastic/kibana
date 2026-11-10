/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sumBy, uniq } from 'lodash';
import type { ForensicsSummaryViewModel } from './view_model';

// The sandboxed card can't measure itself, so its height is summed from section sizes measured in the
// Kibana chat frame at the 736 px card width. Every line of text is clamped or truncated to one line
// (the summary to two), so the sizes don't depend on the text's length. The margin covers a wider font.

const MARGIN = 16;
const HEIGHTS = {
  /** The frame and the renderer's padding, the header with its line of facts, the KPI tiles, and the Decide heading. */
  base: 316,
  /** The attack's title under the host. */
  subtitle: 20,
  /** The "What happened" callout with one line, and its second line. */
  callout: 43,
  calloutLine: 21,
  /** The "No endpoint evidence" banner. */
  banner: 73,
  /** The line saying nothing was proposed. */
  noProposals: 18,
  chain: 63,
  /** A category's label, a proposal card, its comment line, and the gap under it. */
  group: 18,
  proposal: 52,
  comment: 19,
  cardGap: 5,
  /** The timeline's heading, its chart, one event's line, and the line counting the rest. */
  timeline: 37,
  timelineChart: 52,
  event: 18,
  moreEvents: 18,
  /** The section gap, the taller of the entity graph's panel and the indicator panel's fixed part, and one indicator bar. */
  colsGap: 10,
  graphPanel: 200,
  indicatorPanel: 69,
  indicatorBar: 22,
  /** The alerts' summary line, the open section's scale and reach line, one alert's bar, and the line when none is left. */
  alertsSummary: 37,
  alertsOpen: 49,
  alertBar: 22,
  noAlertsLine: 18,
};
/** About this many characters fit on one line of the callout. */
const CALLOUT_CHARACTERS_PER_LINE = 90;

/** The height of the forensics summary card in pixels: an estimate, plus a margin. */
export const estimateForensicsSummaryHeight = (viewModel: ForensicsSummaryViewModel): number => {
  const { attackTitle, summary, killChain, proposals, timeline, indicators, alerts } = viewModel;
  const hasEvidence = timeline.total > 0 || indicators.length > 0;

  const header = HEIGHTS.base + (attackTitle ? HEIGHTS.subtitle : 0);
  const callout = summary
    ? HEIGHTS.callout + (summary.length > CALLOUT_CHARACTERS_PER_LINE ? HEIGHTS.calloutLine : 0)
    : 0;
  const decide = proposals.length
    ? uniq(proposals.map(({ category }) => category)).length * HEIGHTS.group +
      sumBy(
        proposals,
        ({ comment }) => HEIGHTS.proposal + (comment ? HEIGHTS.comment : 0) + HEIGHTS.cardGap
      )
    : HEIGHTS.noProposals;
  const timelineHeight = timeline.events.length
    ? HEIGHTS.timeline +
      (timeline.events.some(({ timestamp }) => !Number.isNaN(Date.parse(timestamp)))
        ? HEIGHTS.timelineChart
        : 0) +
      timeline.events.length * HEIGHTS.event +
      (timeline.total > timeline.events.length ? HEIGHTS.moreEvents : 0)
    : 0;
  const cols = indicators.length
    ? HEIGHTS.colsGap +
      Math.max(
        HEIGHTS.graphPanel,
        HEIGHTS.indicatorPanel + indicators.length * HEIGHTS.indicatorBar
      )
    : 0;
  const alertsHeight =
    alerts.total > 0
      ? HEIGHTS.alertsSummary +
        (alerts.closePending
          ? HEIGHTS.alertsOpen +
            (alerts.shown.length ? alerts.shown.length * HEIGHTS.alertBar : HEIGHTS.noAlertsLine)
          : 0)
      : 0;

  return (
    MARGIN +
    header +
    callout +
    (hasEvidence ? 0 : HEIGHTS.banner) +
    (killChain.length ? HEIGHTS.chain : 0) +
    decide +
    timelineHeight +
    cols +
    alertsHeight
  );
};
