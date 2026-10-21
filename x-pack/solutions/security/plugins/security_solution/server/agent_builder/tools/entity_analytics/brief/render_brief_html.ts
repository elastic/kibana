/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clamp, sumBy } from 'lodash';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { CUSTOM_CONTENT_MAX_HEIGHT, CUSTOM_CONTENT_MIN_HEIGHT } from '@kbn/custom-content-common';
import { formatCount, formatCountOf } from './describe_scope';
import type { BriefRiskHistory, BriefViewModel } from './view_model';
import { NO_PRIORITIES_LINE } from './view_model';

type Priority = BriefViewModel['priorities'][number];

/**
 * Renders the view model as the HTML of an inline `custom_content` visualization, and the height its card
 * needs. The sandbox allows no scripts or images, and links only to dashboards and Discover. Only `--cc-*`
 * theme tokens are used, so the brief follows light and dark. A brief taller than the card scrolls in it.
 */
export const renderBriefHtml = (viewModel: BriefViewModel): { html: string; height: number } => ({
  html: `<style>${CSS}</style>
<div class="brief">
  ${renderHeader(viewModel)}
  ${renderNotes(viewModel)}
  ${renderSummary(viewModel)}
  ${renderCounts(viewModel)}
  ${renderRecommendation(viewModel)}
  ${renderPriorities(viewModel)}
</div>`,
  height: clamp(
    Math.ceil(estimateHeight(viewModel) + HEIGHT_MARGIN),
    CUSTOM_CONTENT_MIN_HEIGHT,
    CUSTOM_CONTENT_MAX_HEIGHT
  ),
});

const renderHeader = (viewModel: BriefViewModel): string => {
  const { scope, priorities } = viewModel;
  const priorityCount = formatCountOf(priorities.length, 'priority', 'priorities');
  return `<header class="header">
    <div>
      <p class="eyebrow">Entity Analytics AI brief</p>
      <h1>${getTitleParts(viewModel)
        .map(escapeHtml)
        .join(' <span class="separator">&middot;</span> ')}</h1>
      <p class="muted small">Captured ${formatDateTime(
        scope.capturedAt
      )}. Numbers are the page's own.</p>
    </div>
    <span class="pill pill-primary">${
      priorities.length === 0 ? 'No priorities' : priorityCount
    }</span>
  </header>`;
};

const getTitleParts = ({ scope }: BriefViewModel): string[] => [
  `Last ${scope.periodLabel}`,
  ...(scope.focusTileTitle ? [`Selected: ${scope.focusTileTitle}`] : []),
  ...scope.entityFilters,
  ...(scope.spaceId === DEFAULT_SPACE_ID ? [] : [`Space ${scope.spaceId}`]),
];

const getNotes = ({ notes, scope }: BriefViewModel): string[] =>
  scope.sample ? [...notes, scope.sample] : notes;

const renderNotes = (viewModel: BriefViewModel): string => {
  const notes = getNotes(viewModel);
  if (notes.length === 0) {
    return '';
  }
  return `<div class="notes">${notes
    .map((note) => `<p class="note">${escapeHtml(note)}</p>`)
    .join('')}</div>`;
};

const renderSummary = ({ summary }: BriefViewModel): string =>
  summary
    ? `<section class="section">
    <h2>What needs attention</h2>
    <p class="lead">${escapeHtml(summary)}</p>
  </section>`
    : '';

/** A zero that didn't change says nothing, so it gets no count. */
const getShownCounts = ({ counts }: BriefViewModel): BriefViewModel['counts'] =>
  counts.filter(({ value, delta }) => value > 0 || (delta ?? 0) !== 0);

/** The page's counts in its order, never summed. A dash is the page's zero. */
const renderCounts = (viewModel: BriefViewModel): string => {
  const counts = getShownCounts(viewModel);
  if (counts.length === 0) {
    return '';
  }
  return `<section class="section">
    <h2>This period at a glance <span class="muted small">vs previous ${escapeHtml(
      viewModel.scope.periodLabel
    )}</span></h2>
    <div class="counts">${counts.map(renderCount).join('')}</div>
  </section>`;
};

const renderCount = ({ title, value, delta }: BriefViewModel['counts'][number]): string => {
  const change = describeChange(delta);
  const shownValue = value === 0 ? '<span aria-label="0">&mdash;</span>' : formatCount(value);
  return `<div class="count">
      <div class="count-label">${escapeHtml(title)}</div>
      <div class="count-row">
        <span class="count-value${value === 0 ? ' count-zero' : ''}">${shownValue}</span>
        <span class="count-change ${change.className}">${escapeHtml(change.text)}</span>
      </div>
    </div>`;
};

const describeChange = (delta: number | undefined): { text: string; className: string } => {
  if (delta === undefined) {
    return { text: 'No comparison', className: 'muted' };
  }
  if (delta === 0) {
    return { text: 'No change', className: 'muted' };
  }
  return delta > 0
    ? { text: `+${formatCount(delta)}`, className: 'up' }
    : { text: `−${formatCount(-delta)}`, className: 'down' };
};

const renderRecommendation = ({ recommendation }: BriefViewModel): string =>
  recommendation
    ? `<section class="section callout">
    <h2>Recommended next step</h2>
    <p class="lead">${escapeHtml(recommendation)}</p>
  </section>`
    : '';

const renderPriorities = ({ priorities }: BriefViewModel): string => `<section class="section">
    <h2>Priorities</h2>
    ${
      priorities.length === 0
        ? `<p class="lead muted">${NO_PRIORITIES_LINE}</p>`
        : `<ol class="priorities">${priorities.map(renderPriority).join('')}</ol>`
    }
  </section>`;

const renderPriority = (priority: Priority): string => {
  const { rank, name, type, risk, assetCriticality, privilegedUser, firstSeen } = priority;
  const riskPill = risk
    ? `<span class="pill level-${escapeHtml(risk.level.toLowerCase())}">Risk ${formatCount(
        risk.score
      )} ${escapeHtml(risk.level)}${
        risk.of === 'resolution group' ? ' <span class="pill-detail">group</span>' : ''
      }</span>`
    : '';
  const criticalityPill = assetCriticality
    ? `<span class="pill pill-outline">${escapeHtml(assetCriticality)}</span>`
    : '';
  const privilegedPill = privilegedUser
    ? '<span class="pill pill-outline">Privileged user</span>'
    : '';
  const chips = priority.flaggedFor
    .map((title) => `<span class="chip">${escapeHtml(title)}</span>`)
    .join('');
  return `<li class="priority">
      <div class="priority-head">
        <span class="rank" aria-hidden="true">${rank}</span>
        <div class="priority-title">
          <span class="name">${escapeHtml(name)}</span>
          <span class="muted small">${escapeHtml(type)}${
    firstSeen ? ` &middot; first seen ${escapeHtml(firstSeen)}` : ''
  }</span>
        </div>
        <div class="pills">${riskPill}${criticalityPill}${privilegedPill}</div>
      </div>
      <div class="evidence"><span class="label">Flagged by</span>${chips}</div>
      <p class="priority-text">${escapeHtml(priority.observed)} ${escapeHtml(
    priority.whyItMatters
  )}</p>
      <p class="next"><span class="label">Next</span>${escapeHtml(priority.nextStep)}</p>
      ${priority.riskHistory ? renderRiskHistory(name, priority.riskHistory) : ''}
    </li>`;
};

/** Bands are labelled only when the labels don't overlap in the chart. */
const BANDS = [
  { label: 'Critical 90', score: 90 },
  { label: 'High 70', score: 70 },
  { label: 'Moderate 40', score: 40 },
];
const MIN_BAND_LABEL_GAP = 11;

/**
 * The risk history over the period. The first and last scores are written as text too, so the chart is
 * never the only place the change is stated.
 */
const renderRiskHistory = (name: string, { points, of }: BriefRiskHistory): string => {
  if (points.length < 2) {
    return '';
  }
  const width = 640;
  const height = 80;
  const left = 30;
  const right = width - 70;
  const top = 14;
  const bottom = height - 22;
  const first = points[0];
  const last = points[points.length - 1];
  const start = new Date(first.t).getTime();
  const duration = new Date(last.t).getTime() - start || 1;
  const x = (time: string): number =>
    left + ((new Date(time).getTime() - start) / duration) * (right - left);
  const y = (score: number): number => top + (1 - score / 100) * (bottom - top);
  const path = points.map(({ t, score }) => `${x(t).toFixed(1)},${y(score).toFixed(1)}`).join(' ');
  const firstScore = Math.round(first.score);
  const lastScore = Math.round(last.score);
  // One dated tick at the end of each day, and at both ends, never closer than 60 px.
  const ticks = points
    .filter(
      ({ t }, index) => [0, points.length - 1].includes(index) || new Date(t).getUTCHours() === 23
    )
    .filter(({ t }, index, all) => index === 0 || x(t) - x(all[index - 1].t) > 60);
  const bands = BANDS.map(({ label, score }, index) => {
    const below = BANDS[index + 1];
    const hasLabel = !below || y(below.score) - y(score) >= MIN_BAND_LABEL_GAP;
    return `<line class="band" x1="${left}" x2="${right}" y1="${y(score).toFixed(1)}" y2="${y(
      score
    ).toFixed(1)}" />${
      hasLabel
        ? `<text class="band-label" x="${right + 6}" y="${(y(score) + 3).toFixed(
            1
          )}">${label}</text>`
        : ''
    }`;
  });
  return `<figure class="chart">
        <figcaption>
          <span>Risk score over the period for <strong>${escapeHtml(name)}</strong>${
    of === 'resolution group' ? ' (resolution group)' : ''
  }</span>
          <span class="chart-change">${firstScore} ${escapeHtml(first.level)}
            <span aria-hidden="true">&rarr;</span>
            <span class="screen-reader">to</span> ${lastScore} ${escapeHtml(last.level)}</span>
        </figcaption>
        <svg viewBox="0 0 ${width} ${height}" width="100%" role="img"
          aria-label="Risk score ${describeTrend(
            firstScore,
            lastScore
          )} ${firstScore} on ${formatMonthDay(first.t)} to ${lastScore} on ${formatMonthDay(
    last.t
  )}">
          ${bands.join('')}
          <polygon class="area" points="${left},${y(0)} ${path} ${x(last.t).toFixed(1)},${y(0)}" />
          <polyline class="line" points="${path}" />
          ${points
            .map(
              ({ t, score }) =>
                `<circle class="dot" cx="${x(t).toFixed(1)}" cy="${y(score).toFixed(1)}" r="3" />`
            )
            .join('')}
          <text class="point-label" x="${x(first.t).toFixed(1)}" y="${(y(first.score) - 7).toFixed(
    1
  )}" text-anchor="middle">${firstScore}</text>
          <text class="point-label strong" x="${(x(last.t) - 7).toFixed(1)}" y="${(
    y(last.score) - 6
  ).toFixed(1)}" text-anchor="end">${lastScore}</text>
          ${ticks
            .map(
              ({ t }) =>
                `<text class="tick" x="${x(t).toFixed(1)}" y="${
                  height - 6
                }" text-anchor="middle">${formatMonthDay(t)}</text>`
            )
            .join('')}
        </svg>
      </figure>`;
};

const describeTrend = (first: number, last: number): string => {
  if (last > first) {
    return 'rose from';
  }
  return last < first ? 'fell from' : 'stayed at';
};

// Height. The card needs a height up front, so it is estimated from the sections. The constants are
// measured in Chromium at the card's 832 px width, with the system font the sandbox falls back to
// because it allows no web fonts. The margin covers a wider font.

const HEIGHT_MARGIN = 60;
const CHARACTERS_PER_LINE = { title: 80, note: 120, lead: 104, text: 100 };
const LINE_HEIGHTS = { title: 23.4, note: 18, lead: 22.5, text: 21 };
const HEIGHTS = {
  /** The padding around the brief. */
  page: 32,
  /** The eyebrow, one line of title, the captured line and the rule under them, and the gap below. */
  header: 82.4,
  /** A note's padding and border, and the gap below it. */
  note: 18,
  /** The gap below the notes. */
  notes: 12,
  /** A section's heading, and the gap below the section. */
  section: 41,
  /** A callout's padding on top of a section. */
  callout: 20,
  /** A priority's padding, title row, one line each of evidence, text and next step, and the gap below. */
  priority: 154.5,
  /** The row the evidence chips need when they don't fit one line, with its gap. */
  chipRow: 28,
  chart: 131,
};
/** The counts' height by how many there are, as labels and changes wrap in narrower counts. */
const COUNTS_HEIGHTS: Record<number, number> = { 4: 55.6, 5: 71.2, 6: 89.2 };
/** The width the chips of a priority share in a row, and what a chip takes: per character, and around it. */
const CHIP_ROW_WIDTH = 590;
const CHIP_CHARACTER_WIDTH = 6.2;
const CHIP_PADDING = 24;

const countLines = (text: string, charactersPerLine: number): number =>
  Math.max(1, Math.ceil(text.length / charactersPerLine));

const estimateHeight = (viewModel: BriefViewModel): number => {
  const { summary, recommendation, priorities } = viewModel;
  const counts = getShownCounts(viewModel);
  const notes = getNotes(viewModel);
  const proseHeight = (text: string | undefined): number =>
    text ? HEIGHTS.section + countLines(text, CHARACTERS_PER_LINE.lead) * LINE_HEIGHTS.lead : 0;
  const titleLines = countLines(getTitleParts(viewModel).join('  ·  '), CHARACTERS_PER_LINE.title);
  return (
    HEIGHTS.page +
    HEIGHTS.header +
    (titleLines - 1) * LINE_HEIGHTS.title +
    (notes.length > 0 ? HEIGHTS.notes : 0) +
    sumBy(
      notes,
      (note) => HEIGHTS.note + countLines(note, CHARACTERS_PER_LINE.note) * LINE_HEIGHTS.note
    ) +
    proseHeight(summary) +
    (counts.length > 0 ? HEIGHTS.section + COUNTS_HEIGHTS[Math.max(4, counts.length)] : 0) +
    proseHeight(recommendation) +
    (recommendation ? HEIGHTS.callout : 0) +
    HEIGHTS.section +
    (priorities.length === 0
      ? countLines(NO_PRIORITIES_LINE, CHARACTERS_PER_LINE.lead) * LINE_HEIGHTS.lead
      : sumBy(priorities, estimatePriorityHeight))
  );
};

const estimatePriorityHeight = ({
  flaggedFor,
  observed,
  whyItMatters,
  nextStep,
  riskHistory,
}: Priority): number => {
  const chipsWidth = sumBy(
    flaggedFor,
    (title) => title.length * CHIP_CHARACTER_WIDTH + CHIP_PADDING
  );
  const chipRows = Math.max(1, Math.ceil(chipsWidth / CHIP_ROW_WIDTH));
  const textLines =
    countLines(`${observed} ${whyItMatters}`, CHARACTERS_PER_LINE.text) +
    countLines(nextStep, CHARACTERS_PER_LINE.text);
  return (
    HEIGHTS.priority +
    (chipRows - 1) * HEIGHTS.chipRow +
    (textLines - 2) * LINE_HEIGHTS.text +
    (riskHistory ? HEIGHTS.chart : 0)
  );
};

// Text and dates

/** Model text and names are data: escaped before they touch the HTML, `{` included. */
const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\{/g, '&#123;');

const formatMonthDay = (iso: string): string => {
  const date = new Date(iso);
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${date.getUTCDate()} ${month}`;
};

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  const time = [date.getUTCHours(), date.getUTCMinutes()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
  return `${formatMonthDay(iso)} ${date.getUTCFullYear()}, ${time} UTC`;
};

// Only --cc-* tokens. Literal colours appear for the risk level fills only, each checked on both themes.

const CSS = `
.brief{max-width:736px;margin:0;font-family:var(--cc-font-family);font-size:14px;line-height:1.5;color:var(--cc-color-text);font-variant-numeric:tabular-nums;}
.brief *{box-sizing:border-box;}
.brief h1,.brief h2,.brief p,.brief ol,.brief figure{margin:0;}
.brief .muted{opacity:.72;}
.brief .small{font-size:12px;}
.brief .screen-reader{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);}
.brief .header{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--cc-space-m);padding-bottom:var(--cc-space-s);margin-bottom:var(--cc-space-m);border-bottom:1px solid var(--cc-color-border);}
.brief .eyebrow{font-size:12px;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:var(--cc-color-primary);margin-bottom:2px;}
.brief h1{font-size:18px;font-weight:700;line-height:1.3;}
.brief h1 .separator{opacity:.5;font-weight:400;padding:0 2px;}
.brief h2{font-size:14px;font-weight:600;margin-bottom:var(--cc-space-s);}
.brief .section{margin-bottom:var(--cc-space-m);}
.brief .lead{font-size:15px;}
.brief .notes{margin-bottom:var(--cc-space-m);}
.brief .note{font-size:12px;padding:6px 10px;border:1px solid var(--cc-color-border);border-radius:var(--cc-radius-s);background:var(--cc-color-surface);margin-bottom:4px;}
.brief .pill{display:inline-flex;align-items:center;gap:4px;padding:0 8px;line-height:20px;border-radius:var(--cc-radius-s);font-size:12px;font-weight:600;white-space:nowrap;border:1px solid transparent;}
.brief .pill-primary{background:var(--cc-color-primary);color:var(--cc-color-surface);}
.brief .pill-outline{border-color:var(--cc-color-border);background:var(--cc-color-surface);color:var(--cc-color-text);}
.brief .pill-detail{font-weight:400;opacity:.85;}
.brief .level-critical{background:var(--cc-color-danger);color:#fff;}
.brief .level-high{background:#C86100;color:#fff;}
.brief .level-moderate{background:var(--cc-color-warning);color:#1D2A3E;}
.brief .level-low,.brief .level-unknown{border-color:var(--cc-color-border);background:var(--cc-color-surface);color:var(--cc-color-text);}
.brief .counts{display:flex;flex-wrap:wrap;gap:var(--cc-space-s);}
.brief .count{flex:1 1 104px;max-width:180px;padding:6px 10px;border:1px solid var(--cc-color-border);border-radius:var(--cc-radius);background:var(--cc-color-surface);min-width:0;}
.brief .count-label{font-size:12px;line-height:1.3;}
.brief .count-row{display:flex;align-items:baseline;flex-wrap:wrap;column-gap:6px;margin-top:2px;}
.brief .count-value{font-size:20px;font-weight:700;line-height:1.2;letter-spacing:-.02em;}
.brief .count-zero{opacity:.5;}
.brief .count-change{font-size:12px;font-weight:600;}
.brief .count-change.muted{font-weight:400;}
.brief .count-change.up{color:var(--cc-color-danger);}
.brief .count-change.down{color:var(--cc-color-accent);}
.brief .priorities{list-style:none;padding:0;display:flex;flex-direction:column;gap:var(--cc-space-s);}
.brief .priority{border:1px solid var(--cc-color-border);border-radius:var(--cc-radius);background:var(--cc-color-surface);padding:10px 14px;}
.brief .priority-head{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;}
.brief .rank{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--cc-color-primary);color:var(--cc-color-surface);font-weight:700;font-size:12px;flex:none;margin-top:1px;}
.brief .priority-title{display:flex;flex-direction:column;min-width:0;flex:1 1 160px;}
.brief .name{font-weight:700;font-size:15px;overflow-wrap:anywhere;}
.brief .pills{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;}
.brief .evidence{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 6px 32px;}
.brief .label{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.72;margin-right:2px;}
.brief .chip{display:inline-block;padding:0 8px;line-height:20px;border-radius:var(--cc-radius-s);border:1px solid var(--cc-color-border);font-size:12px;}
.brief .priority-text{margin-left:32px;}
.brief .next{margin:6px 0 0 32px;}
.brief .next .label{margin-right:6px;}
.brief .chart{margin:10px 0 0 32px;padding:8px 12px;border:1px solid var(--cc-color-border);border-radius:var(--cc-radius);}
.brief .chart figcaption{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;margin-bottom:4px;}
.brief .chart-change{font-weight:600;}
.brief .chart svg{display:block;color:var(--cc-color-primary);}
.brief .chart .band{stroke:var(--cc-color-border);stroke-dasharray:3 3;}
.brief .chart .band-label,.brief .chart .tick,.brief .chart .point-label{font-size:10px;fill:var(--cc-color-text);opacity:.72;}
.brief .chart .point-label.strong{opacity:1;font-weight:700;}
.brief .chart .area{fill:currentColor;opacity:.10;}
.brief .chart .line{fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round;}
.brief .chart .dot{fill:currentColor;}
.brief .callout{border-left:3px solid var(--cc-color-primary);padding:10px 14px;background:var(--cc-color-surface);border-radius:var(--cc-radius);}
@media (max-width:420px){.brief .header{flex-direction:column;} .brief .pills{justify-content:flex-start;} .brief .evidence,.brief .priority-text,.brief .next,.brief .chart{margin-left:0;}}
`;
