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
  describeTileChange,
  filterLabel,
  formatBriefTime,
  getPeriodStart,
  getScopeFilters,
} from './describe_scope';
import type { CandidateEntities } from './fetch_candidate_entities';
import type { VerifiedBrief } from './verify_brief';
import { replaceMentions } from './verify_brief';

export const QUIET_LINE =
  'Nothing in this view is flagged by the needs-attention tiles. That does not mean the environment is safe.';
export const NO_PRIORITIES_LINE =
  'No entity in this view has enough evidence to prioritise. That does not mean the environment is safe.';

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
  // Model text is plain prose: only tags are neutralised, so it can't inject a render tag.
  const withNames = (text: string) => replaceMentions(text.replace(/[<>]/g, '\\$&'), boldName);
  const sections = [
    [renderScope(scope, spaceId, entities.dataTimestamp), ...renderDisclosures(scope, entities)],
    renderAttention(scope, verified, withNames),
    renderChanges(scope),
    renderPriorities(verified, boldName, withNames),
    entityTableTag ? [entityTableTag] : [],
    [renderCoverage(entities)],
  ];
  return sections
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join('\n'))
    .join('\n\n');
};

const escapeMarkdown = (text: string): string => text.replace(/[\\`*_[\]<>|#]/g, '\\$&');

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
      ? `entity data as of ${formatBriefTime(dataTimestamp)}`
      : 'entity data freshness unknown',
  ];
  return `**Scope:** ${escapeMarkdown(compact(parts).join(' · '))}`;
};

const renderDisclosures = (scope: EntityAnalyticsScope, entities: CandidateEntities): string[] => {
  const unavailable = BRIEF_TILE_IDS.filter((tileId) => scope.tiles[tileId]?.unavailable);
  const disclosures = [
    entities.hasPageQuery && !entities.pageQueryFailed
      ? 'Headline counts follow the period and entity filters, as on the page. The search query narrows the priorities.'
      : undefined,
    entities.pageQueryFailed
      ? "The search query or filters couldn't be applied, so they don't narrow the priorities."
      : undefined,
    entities.notFoundCount > 0
      ? `${entities.notFoundCount} tile entities were not found in the Entity Store.`
      : undefined,
    unavailable.length > 0
      ? `Unavailable tiles: ${unavailable.map((tileId) => BRIEF_TILE_TITLES[tileId]).join(', ')}.`
      : undefined,
  ];
  return compact(disclosures).map((text) => `_${text}_`);
};

const renderAttention = (
  { tiles }: EntityAnalyticsScope,
  verified: VerifiedBrief | undefined,
  withNames: (text: string) => string
): string[] => {
  if (verified) {
    return verified.attention ? ['**What needs attention**', withNames(verified.attention)] : [];
  }
  const flagged = Object.values(tiles).some(
    (tile) => !tile.unavailable && (tile.value > 0 || tile.entityIds.length > 0)
  );
  return ['**What needs attention**', flagged ? NO_PRIORITIES_LINE : QUIET_LINE];
};

/** The selected tile, then the tiles that moved most. Tiles are never summed. */
const pickChangeRows = ({ tiles, focusTileId }: EntityAnalyticsScope): BriefTileId[] =>
  orderBy(
    BRIEF_TILE_IDS.filter((tileId) => tiles[tileId]),
    [(tileId) => tileId === focusTileId, (tileId) => movement(tiles[tileId])],
    ['desc', 'desc']
  ).slice(0, MAX_CHANGE_ROWS);

/** Larger for more movement; no comparison ranks below no change, and unavailable last. */
const movement = (tile: EntityAnalyticsScopeTile | undefined): number => {
  if (!tile || tile.unavailable) {
    return -2;
  }
  return tile.delta === undefined ? -1 : Math.abs(tile.delta);
};

const renderChanges = (scope: EntityAnalyticsScope): string[] => {
  const rows = pickChangeRows(scope).flatMap((tileId) => {
    const tile = scope.tiles[tileId];
    if (!tile) {
      return [];
    }
    const now = tile.unavailable ? 'unavailable' : String(tile.value);
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

const renderCoverage = ({ candidates, capturedCount, matchedCount }: CandidateEntities): string => {
  const checked = candidates.length;
  const ofCaptured = checked < capturedCount ? ` of ${capturedCount}` : '';
  const order = checked < matchedCount ? ', highest risk first' : '';
  return `_Checked: ${checked}${ofCaptured} entities from the page's tiles${order}._`;
};
