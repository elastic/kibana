/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, dropRightWhile } from 'lodash';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { SIGNAL_CARD_IDS } from '../../../../../common/entity_analytics/home/constants';
import type { BriefPriority, EntityFacts } from './types';
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

export const QUIET_LINE =
  'Nothing in this view is flagged as needing attention. That does not mean the environment is safe.';
export const UNAVAILABLE_TILES_LINE =
  "Nothing is flagged in what could be read, and the rest couldn't be checked. That does not mean the environment is safe.";
export const NO_MATCH_LINE =
  'The search query excludes every flagged entity, so there is nothing to prioritize. Clear or change the search to brief on them.';
export const NO_PRIORITIES_LINE =
  'No entity in this view has enough evidence to prioritize. That does not mean the environment is safe.';

const ENTITY_TABLE_INTRO =
  '_The priority entities at a glance, with their current risk score and asset criticality from the Entity Store:_';

/** As the Risk movers tile: a smaller change explains nothing, so it gets no chart. */
const RISK_CHART_MIN_CHANGE = 10;

export interface RiskChart {
  tag: string;
  /** The priority the chart goes under. */
  entityId: string;
  of: 'entity' | 'resolution group';
}

/** The first priority whose risk moved by at least the Risk movers threshold. Only it gets a chart. */
export const getRiskChartEntityId = (
  priorities: BriefPriority[],
  facts: EntityFacts[]
): string | undefined =>
  priorities.find(({ entityId }) => {
    const change = facts.find((entity) => entity.entityId === entityId)?.risk?.change;
    return change !== undefined && Math.abs(change) >= RISK_CHART_MIN_CHANGE;
  })?.entityId;

/** Renders the brief as markdown, for the agent to present verbatim. */
export const renderBrief = ({
  scope,
  spaceId,
  entities,
  verified,
  entityTableTag,
  riskChart,
  riskChangeFailed = false,
}: {
  scope: EntityAnalyticsScope;
  spaceId: string;
  entities: CandidateEntities;
  /** Absent when no model call was made. */
  verified?: VerifiedBrief;
  entityTableTag?: string;
  riskChart?: RiskChart;
  riskChangeFailed?: boolean;
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
    [renderScope(scope, spaceId), ...renderDisclosures(scope, entities, riskChangeFailed)],
    renderAttention(scope, entities, verified, withNames),
    renderCounts(scope),
    renderPriorities({ verified, entityTableTag, riskChart, boldName, withNames }),
    verified?.recommendation
      ? ['**Recommended next step**', withNames(verified.recommendation)]
      : [],
    sample ? [`_${sample}_`] : [],
  ];
  return sections
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join('\n'))
    .join('\n\n');
};

/** The period and every filter the page applied, as the page labels them. */
const renderScope = (scope: EntityAnalyticsScope, spaceId: string): string => {
  const { period, query, entityFilters = {} } = scope;
  const parts = [
    `Last ${BRIEF_PERIOD_LABELS[period]}`,
    ...Object.entries(entityFilters).map(([key, values]) => describeEntityFilter(key, values)),
    query?.query ? `Search "${query.query}"` : undefined,
    ...getScopeFilters(scope).map(filterLabel),
    spaceId === DEFAULT_SPACE_ID ? undefined : `Space ${spaceId}`,
  ];
  return `**Scope:** ${escapeMarkdown(compact(parts).join(' · '))}`;
};

const renderDisclosures = (
  scope: EntityAnalyticsScope,
  entities: CandidateEntities,
  riskChangeFailed: boolean
): string[] => {
  const unavailableTitles = SIGNAL_CARD_IDS.flatMap((tileId) => {
    const tile = scope.tiles[tileId];
    return tile?.unavailable ? [tile.title] : [];
  });
  const disclosures = [
    // No count: with no records read, aliases can't be folded, so ids would overcount people.
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
    riskChangeFailed ? "Risk change couldn't be read." : undefined,
  ];
  return compact(disclosures).map((text) => `_${text}_`);
};

/** Flagged entities have records, but the page's search kept none of them. */
const matchesNoEntity = ({
  hasPageQuery,
  matchedCount,
  capturedCount,
  notFoundCount,
}: CandidateEntities): boolean =>
  hasPageQuery && matchedCount === 0 && capturedCount > notFoundCount;

const renderAttention = (
  scope: EntityAnalyticsScope,
  entities: CandidateEntities,
  verified: VerifiedBrief | undefined,
  withNames: (text: string) => string
): string[] => {
  if (verified) {
    return verified.attention ? ['**What needs attention**', withNames(verified.attention)] : [];
  }
  return ['**What needs attention**', getNoBriefLine(scope, entities)];
};

/** Why there was nothing to brief on. Only a view whose tiles were all read can be called quiet. */
const getNoBriefLine = ({ tiles }: EntityAnalyticsScope, entities: CandidateEntities): string => {
  if (matchesNoEntity(entities)) {
    return NO_MATCH_LINE;
  }
  const allTiles = Object.values(tiles);
  const isFlagged = allTiles.some(
    ({ unavailable, value, entityIds }) => !unavailable && (value > 0 || entityIds.length > 0)
  );
  if (isFlagged) {
    return NO_PRIORITIES_LINE;
  }
  return allTiles.some(({ unavailable }) => unavailable) ? UNAVAILABLE_TILES_LINE : QUIET_LINE;
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
    '**This period at a glance**',
    '',
    ...header,
    ...rows.map((tile) => {
      const row = `| ${escapeMarkdown(tile.title)} | ${formatCount(tile.value)} |`;
      return hasComparison ? `${row} ${describeDelta(tile)} |` : row;
    }),
  ];
};

/** The entity table, then the numbered priorities, with the risk chart under its priority. */
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
    return ['**Priorities**', NO_PRIORITIES_LINE];
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
  return ['**Priorities**', '', ...table, ...dropRightWhile(lines, (line) => line === '')];
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
