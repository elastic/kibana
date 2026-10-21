/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clamp, escape, sumBy } from 'lodash';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { CUSTOM_CONTENT_MAX_HEIGHT, CUSTOM_CONTENT_MIN_HEIGHT } from '@kbn/custom-content-common';
import { EntityRiskLevelsEnum } from '../../../../../common/api/entity_analytics/common';
import { RISK_LEVEL_RANGES } from '../../../../../common/entity_analytics/risk_engine/risk_levels';
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
      <p class="meta">Captured ${formatDateTime(scope.capturedAt)}. Numbers are the page's own.</p>
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
    <h2>This period at a glance <span class="meta">vs previous ${escapeHtml(
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

/** Without priorities a summary already says why, as in a brief with no model call, so only a brief without a summary needs the section. */
const hasPrioritiesSection = ({ priorities, summary }: BriefViewModel): boolean =>
  priorities.length > 0 || !summary;

const renderPriorities = (viewModel: BriefViewModel): string => {
  const { priorities, scope } = viewModel;
  if (!hasPrioritiesSection(viewModel)) {
    return '';
  }
  return `<section class="section">
    <h2>Priorities</h2>
    ${
      priorities.length === 0
        ? `<p class="lead muted">${NO_PRIORITIES_LINE}</p>`
        : `<ol class="priorities">${priorities
            .map((priority) => renderPriority(priority, scope.periodLabel))
            .join('')}</ol>`
    }
  </section>`;
};

/** The page's colour for each criticality level, repeated by the dot before the level. */
const CRITICALITY_DOTS: Record<string, string> = {
  'Extreme impact': 'extreme',
  'High impact': 'high',
  'Medium impact': 'medium',
  'Low impact': 'low',
};

const renderPriority = (priority: Priority, periodLabel: string): string => {
  const { rank, name, type, risk, assetCriticality, privilegedUser, firstSeen } = priority;
  const riskPill = risk
    ? `<span class="pill level-${escapeHtml(risk.level.toLowerCase())}">Risk ${formatCount(
        risk.score
      )} ${escapeHtml(risk.level)}${
        risk.of === 'resolution group' ? ' <span class="pill-detail">group</span>' : ''
      }</span>`
    : '';
  const criticalityPill = assetCriticality
    ? `<span class="pill pill-outline"><span class="criticality-dot criticality-${
        CRITICALITY_DOTS[assetCriticality] ?? 'unassigned'
      }"></span>${escapeHtml(assetCriticality)}</span>`
    : '';
  const watchlistPill = privilegedUser
    ? '<span class="pill pill-watchlist">Watchlist: privileged users</span>'
    : '';
  return `<li class="priority">
      <div class="priority-head">
        <span class="rank" aria-hidden="true">${rank}</span>
        <div class="priority-title">
          <div class="name">${escapeHtml(name)}</div>
          <div class="meta">${escapeHtml(type)}${
    firstSeen ? ` &middot; first seen ${escapeHtml(firstSeen)}` : ''
  }</div>
        </div>
        <div class="pills">${riskPill}${criticalityPill}${watchlistPill}</div>
      </div>
      <div class="body">
        <p class="assessment">${escapeHtml(priority.assessment)}</p>
        <p class="why-first">${escapeHtml(priority.whyFirst)}</p>
        <div class="row"><span class="label">Next</span><p class="next">${escapeHtml(
          priority.nextStep
        )}</p></div>
      </div>
      ${priority.riskHistory ? renderRiskHistory(priority.riskHistory, periodLabel) : ''}
    </li>`;
};

/** The risk levels the chart marks, highest first, at the score each starts. */
const BANDS = [
  EntityRiskLevelsEnum.Critical,
  EntityRiskLevelsEnum.High,
  EntityRiskLevelsEnum.Moderate,
].map((level) => ({
  label: `${level} ${RISK_LEVEL_RANGES[level].start}`,
  score: RISK_LEVEL_RANGES[level].start,
}));

/** The fewest points that make a line worth drawing. */
const MIN_CHART_POINTS = 3;

/**
 * The risk history over the period. The first and last scores are written as text, and the chart is
 * drawn from enough points, so the chart is never the only place the change is stated.
 */
const renderRiskHistory = (riskHistory: BriefRiskHistory, periodLabel: string): string => {
  const { points, of } = riskHistory;
  if (points.length < 2) {
    return '';
  }
  const first = points[0];
  const last = points[points.length - 1];
  return `<figure class="chart">
        <figcaption>
          <span class="label">Risk score, last ${escapeHtml(periodLabel)}${
    of === 'resolution group' ? ', resolution group' : ''
  }</span>
          <span class="chart-change">${Math.round(first.score)} ${escapeHtml(first.level)}
            <span aria-hidden="true">&rarr;</span>
            <span class="screen-reader">to</span> ${Math.round(last.score)} ${escapeHtml(
    last.level
  )}</span>
        </figcaption>
        ${points.length >= MIN_CHART_POINTS ? renderChart(points) : ''}
      </figure>`;
};

const renderChart = (points: BriefRiskHistory['points']): string => {
  const width = 640;
  const height = 96;
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
  const bands = BANDS.map(
    ({ label, score }) =>
      `<line class="band" x1="${left}" x2="${right}" y1="${y(score).toFixed(1)}" y2="${y(
        score
      ).toFixed(1)}" /><text class="band-label" x="${right + 6}" y="${(y(score) + 3).toFixed(
        1
      )}">${label}</text>`
  );
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img"
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
        </svg>`;
};

const describeTrend = (first: number, last: number): string => {
  if (last > first) {
    return 'rose from';
  }
  return last < first ? 'fell from' : 'stayed at';
};

// Height. The card needs its height up front, so it is estimated from rounded sizes, measured in Chromium
// at the card's 832 px width with the system font the sandbox falls back to. The margin covers a wider font.

const HEIGHT_MARGIN = 30;
const CHARACTERS_PER_LINE = 100;
/** A priority's text is set in a narrower measure. */
const TEXT_CHARACTERS_PER_LINE = 76;
const HEIGHTS = {
  /** The padding around the brief, its header, and the gap below. */
  header: 115,
  /** A line of text. */
  line: 21,
  /** A section's heading and the gap above the section. */
  section: 45,
  /** A note's padding and gap, on top of its lines. */
  note: 20,
  /** One row of counts. */
  counts: 80,
  /** A priority's padding and title row, and the gaps between its blocks, on top of its lines. */
  priority: 90,
  /** The risk history with its chart, or with the caption alone. */
  chart: 140,
  caption: 40,
};

const countLines = (text: string, charactersPerLine = CHARACTERS_PER_LINE): number =>
  Math.ceil(text.length / charactersPerLine);

const estimateHeight = (viewModel: BriefViewModel): number => {
  const { summary, recommendation, priorities } = viewModel;
  const prose = (text = ''): number =>
    text ? HEIGHTS.section + countLines(text) * HEIGHTS.line : 0;
  return (
    HEIGHTS.header +
    sumBy(getNotes(viewModel), (note) => HEIGHTS.note + countLines(note) * HEIGHTS.line) +
    prose(summary) +
    (getShownCounts(viewModel).length > 0 ? HEIGHTS.section + HEIGHTS.counts : 0) +
    prose(recommendation) +
    (hasPrioritiesSection(viewModel) ? HEIGHTS.section : 0) +
    (priorities.length === 0
      ? hasPrioritiesSection(viewModel)
        ? HEIGHTS.line
        : 0
      : sumBy(priorities, ({ assessment, whyFirst, nextStep, riskHistory }) => {
          const lines = [assessment, whyFirst, nextStep].reduce(
            (sum, text) => sum + countLines(text, TEXT_CHARACTERS_PER_LINE),
            0
          );
          return (
            HEIGHTS.priority +
            lines * HEIGHTS.line +
            (riskHistory ? estimateRiskHistoryHeight(riskHistory) : 0)
          );
        }))
  );
};

const estimateRiskHistoryHeight = ({ points }: BriefRiskHistory): number => {
  if (points.length < 2) {
    return 0;
  }
  return points.length >= MIN_CHART_POINTS ? HEIGHTS.chart : HEIGHTS.caption;
};

// Text and dates

/** Model text and names are data: escaped before they touch the HTML. `{` too, so a template can't come back. */
const escapeHtml = (text: string): string => escape(text).replace(/\{/g, '&#123;');

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

// Only --cc-* tokens. Literal colours appear for the risk level fills and the high criticality dot only, each checked on both themes.
// Type scale: 11 px labels, 12 px meta, 14 px body, 16 px headings and names, 20 px title.
// Rhythm: 16 px between sections with 8 px under a heading, 8 px between blocks in a card, 2 to 4 px between lines.

const CSS = `
.brief{max-width:736px;margin:0;font-family:var(--cc-font-family);font-size:14px;line-height:1.5;color:var(--cc-color-text);font-variant-numeric:tabular-nums;}
.brief *{box-sizing:border-box;}
.brief h1,.brief h2,.brief p,.brief ol,.brief ul,.brief figure{margin:0;}
.brief .muted{opacity:.7;}
.brief .meta{font-size:12px;line-height:1.4;opacity:.7;}
.brief .label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.6;}
.brief .screen-reader{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);}
.brief .header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--cc-color-border);}
.brief .eyebrow{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--cc-color-primary);margin-bottom:4px;}
.brief h1{font-size:20px;font-weight:700;line-height:1.25;margin-bottom:4px;}
.brief h1 .separator{opacity:.5;font-weight:400;padding:0 2px;}
.brief .section{margin-top:16px;}
.brief h2{font-size:16px;font-weight:600;line-height:1.3;margin-bottom:8px;}
.brief h2 .meta{font-weight:400;margin-left:6px;}
.brief .lead{font-size:14px;max-width:68ch;}
.brief .notes{margin-top:16px;}
.brief .note{font-size:12px;padding:6px 10px;border:1px solid var(--cc-color-border);border-radius:var(--cc-radius-s);background:var(--cc-color-surface);margin-bottom:4px;}
.brief .pill{display:inline-flex;align-items:center;gap:4px;padding:0 8px;line-height:22px;border-radius:var(--cc-radius-s);font-size:12px;font-weight:600;white-space:nowrap;border:1px solid transparent;}
.brief .pill-primary{background:var(--cc-color-primary);color:var(--cc-color-surface);}
.brief .pill-outline{border-color:var(--cc-color-border);background:var(--cc-color-surface);color:var(--cc-color-text);}
.brief .pill-watchlist{background:color-mix(in srgb,var(--cc-color-primary) 10%,transparent);border-color:color-mix(in srgb,var(--cc-color-primary) 30%,transparent);color:var(--cc-color-text);font-weight:500;}
.brief .pill-detail{font-weight:400;opacity:.85;}
.brief .level-critical{background:var(--cc-color-danger);color:#fff;}
.brief .level-high{background:#C86100;color:#fff;}
.brief .level-moderate{background:var(--cc-color-warning);color:#1D2A3E;}
.brief .level-low,.brief .level-unknown{border-color:var(--cc-color-border);background:var(--cc-color-surface);color:var(--cc-color-text);}
.brief .criticality-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:2px;}
.brief .criticality-extreme{background:var(--cc-color-danger);}
.brief .criticality-high{background:#D36108;}
.brief .criticality-medium{background:var(--cc-color-warning);}
.brief .criticality-low,.brief .criticality-unassigned{background:color-mix(in srgb,var(--cc-color-text) 40%,transparent);}
.brief .counts{display:flex;flex-wrap:wrap;gap:8px;}
.brief .count{flex:1 1 104px;max-width:180px;padding:8px 12px;border:1px solid var(--cc-color-border);border-radius:var(--cc-radius);background:var(--cc-color-surface);}
.brief .count-label{font-size:12px;line-height:1.3;opacity:.8;min-height:2.6em;}
.brief .count-row{display:flex;align-items:baseline;flex-wrap:wrap;column-gap:8px;margin-top:4px;}
.brief .count-value{font-size:22px;font-weight:700;line-height:1.1;letter-spacing:-.02em;}
.brief .count-zero{opacity:.5;}
.brief .count-change{font-size:12px;font-weight:600;}
.brief .count-change.muted{font-weight:400;}
.brief .count-change.up{color:var(--cc-color-danger);}
.brief .count-change.down{color:var(--cc-color-accent);}
.brief .callout{margin-top:16px;padding:10px 16px;border-left:3px solid var(--cc-color-primary);background:var(--cc-color-surface);border-radius:var(--cc-radius);}
.brief .callout h2{font-size:14px;margin-bottom:4px;}
.brief .priorities{list-style:none;padding:0;display:flex;flex-direction:column;gap:8px;}
.brief .priority{border:1px solid var(--cc-color-border);border-radius:var(--cc-radius);background:var(--cc-color-surface);padding:12px 16px;}
.brief .priority-head{display:flex;align-items:flex-start;flex-wrap:wrap;gap:12px;}
.brief .rank{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--cc-color-primary);color:var(--cc-color-surface);font-weight:700;font-size:12px;flex:none;margin-top:2px;}
.brief .priority-title{flex:1 1 160px;min-width:0;}
.brief .name{font-weight:700;font-size:16px;line-height:1.3;overflow-wrap:anywhere;}
.brief .pills{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;}
.brief .body{margin-left:36px;}
.brief .assessment{margin-top:8px;max-width:62ch;}
.brief .why-first{margin-top:4px;max-width:62ch;opacity:.7;}
.brief .row{display:grid;grid-template-columns:56px 1fr;column-gap:12px;margin-top:8px;align-items:baseline;}
.brief .row .label{padding-top:2px;}
.brief .next{max-width:62ch;}
.brief .chart{margin:8px 0 0 36px;padding-top:8px;border-top:1px solid var(--cc-color-border);}
.brief .chart figcaption{display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-bottom:4px;}
.brief .chart-change{font-weight:600;}
.brief .chart svg{display:block;color:var(--cc-color-primary);}
.brief .chart .band{stroke:var(--cc-color-border);stroke-dasharray:3 3;}
.brief .chart .band-label,.brief .chart .tick,.brief .chart .point-label{font-size:10px;fill:var(--cc-color-text);opacity:.6;}
.brief .chart .point-label.strong{opacity:1;font-weight:700;}
.brief .chart .area{fill:currentColor;opacity:.08;}
.brief .chart .line{fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round;}
.brief .chart .dot{fill:currentColor;}
@media (max-width:420px){.brief .header{flex-direction:column;} .brief .pills{justify-content:flex-start;} .brief .body,.brief .chart{margin-left:0;}}
`;
