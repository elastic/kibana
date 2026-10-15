/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, dropRightWhile, orderBy } from 'lodash';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SignalCardId } from '../../../../../common/entity_analytics/home/constants';
import type {
  EntityAnalyticsScope,
  EntityAnalyticsScopeTile,
} from '../../../../../common/entity_analytics/ai_brief/scope';
import { SIGNAL_CARD_IDS } from '../../../../../common/entity_analytics/home/constants';
import type { RiskChangeEntity } from './brief_types';
import {
  BRIEF_PERIOD_LABELS,
  describeEntityFilter,
  describeDelta,
  describeSample,
  filterLabel,
  formatCount,
  formatCountOf,
  getScopeFilters,
} from './describe_scope';
import type { CandidateEntities } from './read_entities';
import type { VerifiedBrief } from './verify_draft';
import { MENTION_PATTERN } from './verify_draft';

const ENTITY_TABLE_INTRO =
  '_The priority entities at a glance, with their current risk score and asset criticality from the Entity Store:_';

export const QUIET_LINE =
  'Nothing in this view is flagged as needing attention. That does not mean the environment is safe.';
export const UNAVAILABLE_TILES_LINE =
  "Nothing is flagged in what could be read, and the rest couldn't be checked. That does not mean the environment is safe.";
export const NO_MATCH_LINE =
  'The search query excludes every flagged entity, so there is nothing to prioritise. Clear or change the search to brief on them.';
export const NO_PRIORITIES_LINE =
  'No entity in this view has enough evidence to prioritise. That does not mean the environment is safe.';

/** A risk-history chart for a priority's risk change: its render tag and whose score it shows. */
export interface RiskChart {
  tag: string;
  /** The priority's entity. */
  entityId: string;
  riskChangeEntity: RiskChangeEntity;
}

interface RenderBriefParams {
  scope: EntityAnalyticsScope;
  spaceId: string;
  entities: CandidateEntities;
  /** Absent when no model call was made. */
  verified?: VerifiedBrief;
  /** The render tag of the priorities' entity table. */
  entityTableTag?: string;
  /** A risk-history chart, shown under the priority it explains. */
  riskChart?: RiskChart;
  /** True when the risk at the start of the period couldn't be read. */
  riskChangeFailed?: boolean;
}

/** Renders the brief as markdown, for the agent to present verbatim. */
export const renderBrief = ({
  scope,
  spaceId,
  entities,
  verified,
  entityTableTag,
  riskChart,
  riskChangeFailed = false,
}: RenderBriefParams): string => {
  const namesById = new Map(entities.candidates.map(({ id, name }) => [id, name]));
  const boldName = (entityId: string) =>
    `**${escapeMarkdown(namesById.get(entityId) ?? entityId)}**`;
  // Model text is plain prose: markdown is escaped, and mentions become bold names.
  const withNames = (text: string) =>
    text
      .split(MENTION_PATTERN)
      .map((part, index) => (index % 2 === 1 ? boldName(part) : escapeMarkdown(part)))
      .join('');
  const sample = describeSample(scope, entities);
  const sections = [
    [renderScope(scope, spaceId), ...renderDisclosures(scope, entities, riskChangeFailed)],
    renderAttention(scope, entities, verified, withNames),
    renderChanges(scope),
    renderPriorities({ verified, entityTableTag, riskChart, boldName, withNames }),
    renderRecommendation(verified, withNames),
    sample ? [`_${sample}_`] : [],
  ];
  return sections
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join('\n'))
    .join('\n\n');
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

/** Tile entities have records, but the page's search query kept none of them. */
const matchesNoTileEntity = ({
  hasPageQuery,
  pageQueryFailed,
  matchedCount,
  capturedCount,
  notFoundCount,
}: CandidateEntities): boolean =>
  hasPageQuery && !pageQueryFailed && matchedCount === 0 && capturedCount > notFoundCount;

const renderDisclosures = (
  scope: EntityAnalyticsScope,
  entities: CandidateEntities,
  riskChangeFailed: boolean
): string[] => {
  const { hasPageQuery, pageQueryFailed, notFoundCount } = entities;
  const unavailable = SIGNAL_CARD_IDS.filter((tileId) => scope.tiles[tileId]?.unavailable);
  const disclosures = [
    hasPageQuery && !pageQueryFailed
      ? 'Headline counts follow the period and entity filters, as on the page. The search query narrows the priorities.'
      : undefined,
    // No count: with no records read, aliases can't be folded, so ids would overcount people.
    matchesNoTileEntity(entities)
      ? 'None of the flagged entities match the search query.'
      : undefined,
    pageQueryFailed
      ? "The search query or filters couldn't be applied, so they don't narrow the priorities."
      : undefined,
    notFoundCount > 0
      ? `${formatCountOf(
          notFoundCount,
          'flagged entity was',
          'flagged entities were'
        )} not found in the Entity Store.`
      : undefined,
    unavailable.length > 0
      ? `Not checked, because the data couldn't be read: ${unavailable
          .map((tileId) => scope.tiles[tileId]?.title)
          .join(', ')}.`
      : undefined,
    riskChangeFailed ? "Risk change couldn't be read." : undefined,
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

/** The chart with a caption naming its priority, and the group member when the chart is the member's. */
const renderRiskChart = (
  { tag, entityId, riskChangeEntity }: RiskChart,
  boldName: (entityId: string) => string
): string[] => {
  const member =
    riskChangeEntity.id === entityId
      ? ''
      : ` (${riskChangeEntity.type} ${escapeMarkdown(
          riskChangeEntity.name
        )}, in its resolution group)`;
  return [`_Risk history over the period for_ ${boldName(entityId)}${member}`, '', tag];
};

/** Why there was nothing to brief on. Only a view whose tiles were all read can be called quiet. */
const getNoBriefLine = ({ tiles }: EntityAnalyticsScope, entities: CandidateEntities): string => {
  if (matchesNoTileEntity(entities)) {
    return NO_MATCH_LINE;
  }
  const scopeTiles = Object.values(tiles);
  const flagged = scopeTiles.some(
    ({ unavailable, value, entityIds }) => !unavailable && (value > 0 || entityIds.length > 0)
  );
  if (flagged) {
    return NO_PRIORITIES_LINE;
  }
  return scopeTiles.some(({ unavailable }) => unavailable) ? UNAVAILABLE_TILES_LINE : QUIET_LINE;
};

/** A row says something: a count above zero, or a change. A zero with no change is left out. */
const isWorthShowing = ({ unavailable, value, delta = 0 }: EntityAnalyticsScopeTile): boolean =>
  !unavailable && (value > 0 || delta !== 0);

/** Every count with something to say, in the page's order, the selected one first. Never summed. */
const pickChangeRows = ({
  tiles,
  focusTileId,
}: EntityAnalyticsScope): Array<[SignalCardId, EntityAnalyticsScopeTile]> =>
  orderBy(
    SIGNAL_CARD_IDS.flatMap((tileId): Array<[SignalCardId, EntityAnalyticsScopeTile]> => {
      const tile = tiles[tileId];
      return tile && isWorthShowing(tile) ? [[tileId, tile]] : [];
    }),
    ([tileId]) => tileId === focusTileId,
    'desc'
  );

/** The counts, with their change when any can be compared. A column of "not enough history" says nothing. */
const renderChanges = (scope: EntityAnalyticsScope): string[] => {
  const rows = pickChangeRows(scope);
  if (rows.length === 0) {
    return [];
  }
  const hasComparison = rows.some(([, { delta }]) => delta !== undefined);
  const header = hasComparison
    ? [`|  | Entities | vs previous ${BRIEF_PERIOD_LABELS[scope.period]} |`, '| --- | --- | --- |']
    : ['|  | Entities |', '| --- | --- |'];
  return [
    '**This period at a glance**',
    '',
    ...header,
    ...rows.map(([, tile]) => {
      const row = `| ${escapeMarkdown(tile.title)} | ${formatCount(tile.value)} |`;
      return hasComparison ? `${row} ${describeDelta(tile)} |` : row;
    }),
  ];
};

const renderRecommendation = (
  verified: VerifiedBrief | undefined,
  withNames: (text: string) => string
): string[] =>
  verified?.recommendation ? ['**Recommended next step**', withNames(verified.recommendation)] : [];

const asSentence = (text: string): string => (/[.!?…]$/.test(text) ? text : `${text}.`);

/** The priorities' entity table, then the numbered priorities, with the risk chart under its priority. */
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
  const table = entityTableTag ? [ENTITY_TABLE_INTRO, '', entityTableTag, ''] : [];
  // A render tag needs blank lines around it to stay its own block.
  const lines = verified.priorities.flatMap(
    ({ entityId, observed, whyItMatters, nextStep }, index) => {
      const line = `${index + 1}. ${boldName(entityId)}: ${asSentence(
        withNames(observed)
      )} ${asSentence(withNames(whyItMatters))} _Next:_ ${asSentence(withNames(nextStep))}`;
      return riskChart?.entityId === entityId
        ? [line, '', ...renderRiskChart(riskChart, boldName), '']
        : [line];
    }
  );
  return ['**Priorities**', '', ...table, ...dropRightWhile(lines, (line) => line === '')];
};
