/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { clamp, escape, once, upperFirst } from 'lodash';
import Mustache from 'mustache';
import { CUSTOM_CONTENT_MAX_HEIGHT, CUSTOM_CONTENT_MIN_HEIGHT } from '@kbn/custom-content-common';
import { formatCount, formatStoredValue } from './describe_scope';
import { estimateBriefHeight } from './estimate_brief_height';
import { buildRiskHistoryContext } from './risk_history_chart';
import type { BriefViewModel } from './view_model';
import {
  NO_PRIORITIES_LINE,
  getHeaderRows,
  getPriorityFacts,
  getShownCounts,
  getTitle,
  hasPrioritiesSection,
} from './view_model';

/** The page's numeric font, inlined because the sandbox fetches nothing. Like Kibana's, it covers only digits and their punctuation. */
const loadNumericFontFace = (): string => {
  const font = fs
    .readFileSync(path.join(__dirname, 'fonts', 'ElasticUINumeric-Variable.woff2'))
    .toString('base64');
  return `@font-face{font-family:'Elastic UI Numeric';font-style:normal;font-weight:100 900;src:url(data:font/woff2;base64,${font}) format('woff2');unicode-range:U+20,U+24-25,U+28-29,U+2B-2F,U+30-3A,U+A0,U+202F,U+2212}\n`;
};

const loadFiles = once(() => ({
  template: fs.readFileSync(path.join(__dirname, 'brief.mustache.html'), 'utf8'),
  css: loadNumericFontFace() + fs.readFileSync(path.join(__dirname, 'brief.css'), 'utf8'),
  riskHistoryChart: fs.readFileSync(
    path.join(__dirname, 'risk_history_chart.mustache.html'),
    'utf8'
  ),
}));

/** Model text and names are data: escaped before they touch the HTML. `{` too, so a template can't come back. */
const escapeHtml = (text: unknown): string => escape(String(text)).replace(/\{/g, '&#123;');

const describeChange = (delta: number | undefined): { change: string; changeClass: string } => {
  if (delta === undefined) {
    return { change: 'No comparison', changeClass: 'flat' };
  }
  if (delta === 0) {
    return { change: 'No change', changeClass: 'flat' };
  }
  return delta > 0
    ? { change: `+${formatCount(delta)}`, changeClass: 'up' }
    : { change: `−${formatCount(-delta)}`, changeClass: 'down' };
};

/** What the template shows: the view model's words and numbers, as the text the card prints. */
const buildContext = (viewModel: BriefViewModel, css: string) => {
  const { scope, summary, recommendation, priorities } = viewModel;
  return {
    css,
    title: getTitle(viewModel),
    // `label` and `separator` are set on every part, so a part never reads its row's fields.
    headerRows: getHeaderRows(viewModel).map(({ key, parts }, rowIndex) => ({
      key,
      rowSeparator: rowIndex > 0,
      parts: parts.map(({ label = '', value }, index) => ({ label, value, separator: index > 0 })),
    })),
    summary,
    periodLabel: scope.periodLabel,
    hasCounts: getShownCounts(viewModel).length > 0,
    counts: getShownCounts(viewModel).map(({ tileId, title, description, value, delta }) => ({
      tileId,
      title,
      description,
      value: value === 0 ? '—' : formatCount(value),
      ...describeChange(delta),
    })),
    recommendation,
    hasPrioritiesSection: hasPrioritiesSection(viewModel),
    hasPriorities: priorities.length > 0,
    noPrioritiesLine: NO_PRIORITIES_LINE,
    priorities: priorities.map((priority) => ({
      ...priority,
      typeLabel: upperFirst(priority.type),
      facts: getPriorityFacts(priority).map((fact, index) => ({ ...fact, separator: index > 0 })),
      hasFacts: getPriorityFacts(priority).length > 0,
      risk: priority.risk && {
        ...priority.risk,
        score: formatCount(priority.risk.score),
        levelClass: `level-${priority.risk.level.toLowerCase()}`,
        isGroup: priority.risk.of === 'resolution group',
      },
      criticality: priority.assetCriticality && {
        text: formatStoredValue(priority.assetCriticality),
        key: priority.assetCriticality,
      },
      riskHistory:
        priority.riskHistory &&
        priority.riskHistory.points.length >= 2 &&
        buildRiskHistoryContext(priority.riskHistory, scope.periodLabel),
    })),
  };
};

/**
 * Renders the view model as the HTML of an inline `custom_content` visualization, and the height its card
 * needs. The sandbox allows no scripts or images, and links only to dashboards and Discover. Only `--cc-*`
 * theme tokens are used, so the brief follows light and dark. A brief taller than the card scrolls in it.
 */
export const renderBriefHtml = (viewModel: BriefViewModel): { html: string; height: number } => {
  const { template, css, riskHistoryChart } = loadFiles();
  return {
    html: Mustache.render(
      template,
      buildContext(viewModel, css),
      { riskHistoryChart },
      {
        escape: escapeHtml,
      }
    ),
    height: clamp(
      Math.ceil(estimateBriefHeight(viewModel)),
      CUSTOM_CONTENT_MIN_HEIGHT,
      CUSTOM_CONTENT_MAX_HEIGHT
    ),
  };
};
