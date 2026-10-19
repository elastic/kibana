/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, dropRightWhile } from 'lodash';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { SignalCardId } from '../../../../../common/entity_analytics/home/constants';
import { SIGNAL_CARD_IDS } from '../../../../../common/entity_analytics/home/constants';
import type { EntityFacts } from './types';
import type { BriefPriority } from './prompts';
import {
  BRIEF_PERIOD_LABELS,
  describeDelta,
  describeEntityFilter,
  describeSample,
  filterLabel,
  formatCount,
  formatCountOf,
  getScopeFilters,
} from './describe_scope';
import type { CandidateEntities } from './read_entities';
import type { VerifiedBrief } from './verify_draft';
import { MENTION_PATTERN } from './verify_draft';

const HEADINGS = {
  summary: '**What needs attention**',
  counts: '**This period at a glance**',
  priorities: '**Priorities**',
  recommendation: '**Recommended next step**',
};

export const QUIET_LINE =
  'Nothing in this view is flagged as needing attention. That does not mean the environment is safe.';
export const NO_PRIORITIES_LINE =
  'No entity in this view has enough evidence to prioritize. That does not mean the environment is safe.';

const ENTITY_TABLE_INTRO =
  '_The priority entities at a glance, with their current risk score and asset criticality from the Entity Store:_';

/** A chart explains a priority whose risk the page flags as changed. */
const RISK_CHART_TILE_IDS: readonly SignalCardId[] = ['riskMovers', 'newlyHighCritical'];

export interface RiskChart {
  tag: string;
  /** The priority the chart goes under. */
  entityId: string;
  of: 'entity' | 'resolution group';
}

/** The first priority a risk tile flags. Only it gets a chart. */
export const getRiskChartEntityId = (
  priorities: BriefPriority[],
  facts: EntityFacts[]
): string | undefined =>
  priorities.find(({ entityId }) =>
    facts
      .find((entity) => entity.entityId === entityId)
      ?.flaggedFor.some((tileId) => RISK_CHART_TILE_IDS.includes(tileId))
  )?.entityId;

/** Renders the brief as markdown, for the agent to present verbatim. */
export const renderBrief = ({
  scope,
  spaceId,
  entities,
  verified,
  entityTableTag,
  riskChart,
}: {
  scope: EntityAnalyticsScope;
  spaceId: string;
  entities: CandidateEntities;
  /** Absent when no model call was made. */
  verified?: VerifiedBrief;
  entityTableTag?: string;
  riskChart?: RiskChart;
}): string => {
  const namesById = new Map(entities.candidates.map(({ id, name }) => [id, name]));
  const boldName = (entityId: string) =>
    `**${escapeMarkdown(namesById.get(entityId) ?? entityId)}**`;
  // Model text is prose: markdown is escaped, and mentions become bold names.
  const withNames = (text: string) =>
    text
      .split(MENTION_PATTERN)
      .map((part, index) => (index % 2 === 1 ? boldName(part) : escapeMarkdown(part)))
      .join('');
  const sample = describeSample(scope, entities);

  const sections = [
    [renderScope(scope, spaceId), ...renderNotes(scope, entities)],
    renderSummary(scope, verified, withNames),
    renderCounts(scope),
    renderPriorities({ verified, entityTableTag, riskChart, boldName, withNames }),
    verified?.recommendation ? [HEADINGS.recommendation, withNames(verified.recommendation)] : [],
    sample ? [`_${sample}_`] : [],
  ];
  return sections
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join('\n'))
    .join('\n\n');
};

const renderScope = (scope: EntityAnalyticsScope, spaceId: string): string => {
  const { period, query, entityFilters = {}, focusTileId, tiles } = scope;
  const selectedTitle = focusTileId && tiles[focusTileId]?.title;
  const parts = [
    `Last ${BRIEF_PERIOD_LABELS[period]}`,
    selectedTitle ? `Selected: ${selectedTitle}` : undefined,
    ...Object.entries(entityFilters).map(([key, values]) => describeEntityFilter(key, values)),
    query?.query ? `Search "${query.query}"` : undefined,
    ...getScopeFilters(scope).map(filterLabel),
    spaceId === DEFAULT_SPACE_ID ? undefined : `Space ${spaceId}`,
  ];
  return `**Scope:** ${escapeMarkdown(compact(parts).join(' · '))}`;
};

const renderNotes = (scope: EntityAnalyticsScope, entities: CandidateEntities): string[] => {
  const unavailableTitles = SIGNAL_CARD_IDS.flatMap((tileId) => {
    const tile = scope.tiles[tileId];
    return tile?.unavailable ? [tile.title] : [];
  });
  const notes = [
    matchesNoEntity(entities) ? 'None of the flagged entities match the search query.' : undefined,
    entities.notFoundCount > 0
      ? `${formatCountOf(
          entities.notFoundCount,
          'flagged entity was',
          'flagged entities were'
        )} not found in the Entity Store.`
      : undefined,
    unavailableTitles.length > 0
      ? `Not checked, because the data couldn't be read: ${unavailableTitles.join(', ')}.`
      : undefined,
  ];
  return compact(notes).map((text) => `_${text}_`);
};

/** Flagged entities have records, but the page's search kept none of them. */
const matchesNoEntity = ({
  hasPageQuery,
  matchedCount,
  capturedCount,
  notFoundCount,
}: CandidateEntities): boolean =>
  hasPageQuery && matchedCount === 0 && capturedCount > notFoundCount;

const renderSummary = (
  { tiles }: EntityAnalyticsScope,
  verified: VerifiedBrief | undefined,
  withNames: (text: string) => string
): string[] => {
  if (verified) {
    return verified.summary ? [HEADINGS.summary, withNames(verified.summary)] : [];
  }
  // Without a model call: a view is quiet only when nothing it could read is flagged.
  const isFlagged = Object.values(tiles).some(
    ({ unavailable, value, entityIds }) => !unavailable && (value > 0 || entityIds.length > 0)
  );
  return [HEADINGS.summary, isFlagged ? NO_PRIORITIES_LINE : QUIET_LINE];
};

/**
 * The page's counts in its order, never summed. A zero that didn't change says nothing, and neither does
 * a column of "not enough history".
 */
const renderCounts = ({ tiles, period }: EntityAnalyticsScope): string[] => {
  const rows = SIGNAL_CARD_IDS.flatMap((tileId) => {
    const tile = tiles[tileId];
    return tile && !tile.unavailable && (tile.value > 0 || (tile.delta ?? 0) !== 0) ? [tile] : [];
  });
  if (rows.length === 0) {
    return [];
  }
  const hasComparison = rows.some(({ delta }) => delta !== undefined);
  const header = hasComparison
    ? [`|  | Entities | vs previous ${BRIEF_PERIOD_LABELS[period]} |`, '| --- | --- | --- |']
    : ['|  | Entities |', '| --- | --- |'];
  return [
    HEADINGS.counts,
    '',
    ...header,
    ...rows.map((tile) => {
      const row = `| ${escapeMarkdown(tile.title)} | ${formatCount(tile.value)} |`;
      return hasComparison ? `${row} ${describeDelta(tile)} |` : row;
    }),
  ];
};

const renderPriorities = ({
  verified,
  entityTableTag,
  riskChart,
  boldName,
  withNames,
}: {
  verified: VerifiedBrief | undefined;
  entityTableTag: string | undefined;
  riskChart: RiskChart | undefined;
  boldName: (entityId: string) => string;
  withNames: (text: string) => string;
}): string[] => {
  if (!verified) {
    return [];
  }
  if (verified.priorities.length === 0) {
    return [HEADINGS.priorities, NO_PRIORITIES_LINE];
  }
  const sentence = (text: string) => {
    const named = withNames(text);
    return /[.!?…]$/.test(named) ? named : `${named}.`;
  };
  // A render tag needs blank lines around it to stay its own block.
  const table = entityTableTag ? [ENTITY_TABLE_INTRO, '', entityTableTag, ''] : [];
  const lines = verified.priorities.flatMap(
    ({ entityId, observed, whyItMatters, nextStep }, index) => {
      const line = `${index + 1}. ${boldName(entityId)}: ${sentence(observed)} ${sentence(
        whyItMatters
      )} _Next:_ ${sentence(nextStep)}`;
      if (riskChart?.entityId !== entityId) {
        return [line];
      }
      const group = riskChart.of === 'resolution group' ? ' (resolution group)' : '';
      const caption = `_Risk history over the period for_ ${boldName(entityId)}${group}`;
      return [line, '', caption, '', riskChart.tag, ''];
    }
  );
  return [HEADINGS.priorities, '', ...table, ...dropRightWhile(lines, (line) => line === '')];
};

/**
 * Escapes markdown, emphasis included (`extreme_impact` would pair with `_Next:_`), and stops autolinks
 * with character references for `:` and `@`, so the text reads as written.
 */
const escapeMarkdown = (text: string): string =>
  text
    .replace(/[\\`*_[\]<>|#!]/g, '\\$&')
    .replace(/:(?=\/\/)/g, '&#58;')
    .replace(/@(?=[\w-]+\.\w)/g, '&#64;')
    .replace(/\b(www)\./gi, '$1\\.');
