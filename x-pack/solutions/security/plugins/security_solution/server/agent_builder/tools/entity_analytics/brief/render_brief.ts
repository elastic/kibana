/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, orderBy } from 'lodash';
import type {
  BriefTileId,
  EntityAnalyticsScope,
  EntityAnalyticsScopeTile,
} from '../../../../../common/entity_analytics/ai_brief/scope';
import { BRIEF_TILE_IDS } from '../../../../../common/entity_analytics/ai_brief/scope';
import { MAX_CHANGE_ROWS } from './brief_types';
import {
  BRIEF_PERIOD_LABELS,
  BRIEF_TILE_TITLES,
  describeCoverage,
  describeTileChange,
  filterLabel,
  formatBriefTime,
  formatCount,
  getPeriodStart,
  getScopeFilters,
  hasNoPreviousValue,
} from './describe_scope';
import type { CandidateEntities } from './fetch_candidate_entities';
import type { VerifiedBrief } from './verify_brief';
import { MENTION_PATTERN } from './verify_brief';

export const QUIET_LINE =
  'Nothing in this view is flagged by the needs-attention tiles. That does not mean the environment is safe.';
export const UNAVAILABLE_TILES_LINE =
  'Nothing is flagged by the tiles that could be read, and the unavailable tiles were not checked. That does not mean the environment is safe.';
export const NO_MATCH_LINE =
  'The search query excludes every tile entity, so there is nothing to prioritise. Clear or change the search to brief on the tiles.';
export const NO_PRIORITIES_LINE =
  'No entity in this view has enough evidence to prioritise. That does not mean the environment is safe.';

/** Real comparisons rank by change relative to the previous value, floored at this many entities. */
const MIN_CHANGE_BASE = 5;

export interface RenderBriefParams {
  scope: EntityAnalyticsScope;
  spaceId: string;
  entities: CandidateEntities;
  /** Absent when no model call was made. */
  verified?: VerifiedBrief;
  /** The render tag of the priorities' entity table. */
  entityTableTag?: string;
}

/** Renders the brief as markdown, for the agent to present verbatim. */
export const renderBrief = ({
  scope,
  spaceId,
  entities,
  verified,
  entityTableTag,
}: RenderBriefParams): string => {
  const namesById = new Map(entities.candidates.map(({ id, name }) => [id, name]));
  const boldName = (entityId: string) =>
    `**${escapeMarkdown(namesById.get(entityId) ?? entityId)}**`;
  // Model text is plain prose: link, image and tag syntax is escaped, and mentions become bold names.
  const withNames = (text: string) =>
    text
      .split(MENTION_PATTERN)
      .map((part, index) => (index % 2 === 1 ? boldName(part) : escapeProse(part)))
      .join('');
  const sections = [
    [renderScope(scope, spaceId, entities.dataTimestamp), ...renderDisclosures(scope, entities)],
    renderAttention(scope, entities, verified, withNames),
    renderChanges(scope),
    renderPriorities(verified, boldName, withNames),
    entityTableTag ? [entityTableTag] : [],
    [`_Checked: ${describeCoverage(scope, entities.candidates.length, entities.capturedCount)}._`],
  ];
  return sections
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join('\n'))
    .join('\n\n');
};

const escapeMarkdown = (text: string): string => text.replace(/[\\`*_[\]<>|#]/g, '\\$&');
const escapeProse = (text: string): string => text.replace(/[\\[\]!<>]/g, '\\$&');

const renderScope = (
  scope: EntityAnalyticsScope,
  spaceId: string,
  dataTimestamp: string | undefined
): string => {
  const { period, capturedAt, query, entityFilters = {} } = scope;
  const parts = [
    `last ${BRIEF_PERIOD_LABELS[period]} (${formatBriefTime(
      getPeriodStart(scope)
    )} to ${formatBriefTime(capturedAt)})`,
    ...Object.entries(entityFilters).map(([key, values]) => `${key}: ${values.join(', ')}`),
    query?.query ? `search "${query.query}"` : undefined,
    ...getScopeFilters(scope).map(filterLabel),
    `space ${spaceId}`,
    `captured ${formatBriefTime(capturedAt)}`,
    dataTimestamp
      ? `Entity Store last updated ${formatBriefTime(dataTimestamp)}`
      : 'Entity Store update time unknown',
  ];
  return `**Scope:** ${escapeMarkdown(compact(parts).join(' · '))}`;
};

/** Tile entities have records, but the page's search query kept none of them. */
const matchesNoTileEntity = ({
  hasPageQuery,
  pageQueryFailed,
  matchedCount,
  capturedCount,
  notFoundCount,
}: CandidateEntities): boolean =>
  hasPageQuery && !pageQueryFailed && matchedCount === 0 && capturedCount > notFoundCount;

const renderDisclosures = (scope: EntityAnalyticsScope, entities: CandidateEntities): string[] => {
  const { hasPageQuery, pageQueryFailed, capturedCount, notFoundCount } = entities;
  const unavailable = BRIEF_TILE_IDS.filter((tileId) => scope.tiles[tileId]?.unavailable);
  const disclosures = [
    hasPageQuery && !pageQueryFailed
      ? 'Headline counts follow the period and entity filters, as on the page. The search query narrows the priorities.'
      : undefined,
    matchesNoTileEntity(entities)
      ? `None of the ${formatCount(
          capturedCount - notFoundCount
        )} tile entities match the search query.`
      : undefined,
    pageQueryFailed
      ? "The search query or filters couldn't be applied, so they don't narrow the priorities."
      : undefined,
    notFoundCount > 0
      ? `${formatCount(notFoundCount)} tile entities were not found in the Entity Store.`
      : undefined,
    unavailable.length > 0
      ? `Unavailable tiles: ${unavailable.map((tileId) => BRIEF_TILE_TITLES[tileId]).join(', ')}.`
      : undefined,
  ];
  return compact(disclosures).map((text) => `_${text}_`);
};

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
  const scopeTiles = Object.values(tiles);
  const flagged = scopeTiles.some(
    ({ unavailable, value, entityIds }) => !unavailable && (value > 0 || entityIds.length > 0)
  );
  if (matchesNoTileEntity(entities)) {
    return NO_MATCH_LINE;
  }
  if (flagged) {
    return NO_PRIORITIES_LINE;
  }
  return scopeTiles.some(({ unavailable }) => unavailable) ? UNAVAILABLE_TILES_LINE : QUIET_LINE;
};

/** The selected tile, then the tiles that moved most. Hidden when no tile has a comparison. Never summed. */
const pickChangeRows = ({ tiles, focusTileId }: EntityAnalyticsScope): BriefTileId[] => {
  const hasComparison = Object.values(tiles).some(
    ({ unavailable, delta }) => !unavailable && delta !== undefined
  );
  if (!hasComparison) {
    return [];
  }
  return orderBy(
    BRIEF_TILE_IDS.filter((tileId) => tiles[tileId]),
    [(tileId) => tileId === focusTileId, (tileId) => movement(tiles[tileId])],
    ['desc', 'desc']
  ).slice(0, MAX_CHANGE_ROWS);
};

/**
 * Change relative to the previous value, floored at `MIN_CHANGE_BASE`. A rise from 0 may be missing
 * history, so it ranks below real comparisons, then no comparison, then unavailable.
 */
const movement = (tile: EntityAnalyticsScopeTile | undefined): number => {
  if (!tile || tile.unavailable) {
    return -3;
  }
  const { value, delta } = tile;
  if (delta === undefined) {
    return -2;
  }
  if (hasNoPreviousValue(tile)) {
    return -1;
  }
  return Math.abs(delta) / Math.max(value - delta, MIN_CHANGE_BASE);
};

const renderChanges = (scope: EntityAnalyticsScope): string[] => {
  const rows = pickChangeRows(scope).flatMap((tileId) => {
    const tile = scope.tiles[tileId];
    if (!tile) {
      return [];
    }
    const now = tile.unavailable ? 'unavailable' : formatCount(tile.value);
    return [
      `| ${BRIEF_TILE_TITLES[tileId]} | ${now} | ${describeTileChange(tile, scope.period)} |`,
    ];
  });
  if (rows.length === 0) {
    return [];
  }
  return ['**What changed**', '', '| Tile | Now | Change |', '| --- | --- | --- |', ...rows];
};

const asSentence = (text: string): string => (/[.!?…]$/.test(text) ? text : `${text}.`);

const renderPriorities = (
  verified: VerifiedBrief | undefined,
  boldName: (entityId: string) => string,
  withNames: (text: string) => string
): string[] => {
  if (!verified) {
    return [];
  }
  if (verified.priorities.length === 0) {
    return ['**Priorities**', NO_PRIORITIES_LINE];
  }
  const lines = verified.priorities.map(
    ({ entityId, observed, whyItMatters, nextStep }, index) =>
      `${index + 1}. ${boldName(entityId)}: ${asSentence(withNames(observed))} ${asSentence(
        withNames(whyItMatters)
      )} _Next:_ ${asSentence(withNames(nextStep))}`
  );
  return ['**Priorities**', ...lines];
};
