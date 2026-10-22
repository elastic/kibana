/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { z, lazySchema } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import { getAssetCriticality } from '../../../../lib/entity_analytics/lead_generation/observation_modules/utils';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import {
  SIGNAL_CARD_IDS,
  TIME_RANGE_OPTIONS,
} from '../../../../../common/entity_analytics/home/constants';
import type { EntityFacts } from './types';
import {
  BRIEF_PERIOD_LABELS,
  describeEntityFilter,
  describeSample,
  formatCountOf,
} from './describe_scope';
import type { CandidateEntities } from './read_entities';
import type { VerifiedBrief } from './verify_draft';
import { JOB_MENTION_PATTERN, MENTION_PATTERN, RULE_MENTION_PATTERN } from './verify_draft';

export const QUIET_LINE = 'Nothing in this view is flagged as needing attention.';
/** The watchlists shown as pills, and the rest counted. */
export const MAX_WATCHLIST_PILLS = 3;
export const NO_PRIORITIES_LINE = 'No entity in this view has enough evidence to prioritize.';

const RiskHistory = lazySchema(() =>
  z.object({
    of: z.enum(['entity', 'resolution group']),
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    /** Oldest first, at most 12. */
    points: z.array(z.object({ t: z.iso.datetime(), score: z.number(), level: z.string() })),
  })
);
export type BriefRiskHistory = z.infer<typeof RiskHistory>;

/**
 * Everything the HTML brief shows, and nothing else: `renderBriefHtml` takes this object only. A new
 * signal adds an optional field here and a function there.
 */
export const BriefViewModel = lazySchema(() =>
  z.object({
    version: z.literal(1),
    scope: z.object({
      period: z.enum(TIME_RANGE_OPTIONS),
      periodLabel: z.string(),
      capturedAt: z.iso.datetime(),
      spaceId: z.string(),
      focusTileTitle: z.string().optional(),
      entityFilters: z.array(z.string()),
      sample: z.string().optional(),
    }),
    /** What wasn't found or checked. */
    notes: z.array(z.string()),
    /** The model's headline, when there was a model call and it found priorities. */
    title: z.string().optional(),
    summary: z.string().optional(),
    /** The page's counts in its order, for the tiles that could be read. */
    counts: z.array(
      z.object({
        tileId: z.enum(SIGNAL_CARD_IDS),
        title: z.string(),
        value: z.number().int(),
        delta: z.number().int().optional(),
      })
    ),
    priorities: z.array(
      z.object({
        rank: z.number().int(),
        entityId: z.string(),
        name: z.string(),
        type: z.enum(['host', 'user', 'service', 'generic']),
        risk: z
          .object({
            score: z.number(),
            level: z.string(),
            of: z.enum(['entity', 'resolution group']),
          })
          .optional(),
        /** As the Entity Store stores it, such as `extreme_impact`. */
        assetCriticality: z.string().optional(),
        /** The names of the watchlists the entity is on. */
        watchlists: z.array(z.string()),
        firstSeen: z.string().optional(),
        assessment: z.string(),
        whyFirst: z.string(),
        nextStep: z.string(),
        riskHistory: RiskHistory.optional(),
      })
    ),
    recommendation: z.string().optional(),
  })
);
export type BriefViewModel = z.infer<typeof BriefViewModel>;

/** The model writing "rule 1" or "job 1" without the double braces: the reader would see it as written. */
const BARE_CITATION_PATTERN = /\b([Rr]ule|[Jj]ob)\s+(\d+)\b/;

const TOKEN_PATTERN = new RegExp(
  [MENTION_PATTERN, RULE_MENTION_PATTERN, JOB_MENTION_PATTERN, BARE_CITATION_PATTERN]
    .map(({ source }) => source)
    .join('|'),
  'g'
);

/** Builds the view model from what the pipeline has. `verified` is absent when no model call was made. */
export const buildViewModel = ({
  scope,
  spaceId,
  entities,
  facts,
  verified,
  riskHistory,
  alertsFailed = false,
  anomaliesFailed = false,
  logger,
}: {
  scope: EntityAnalyticsScope;
  spaceId: string;
  entities: CandidateEntities;
  facts: EntityFacts[];
  verified?: VerifiedBrief;
  /** The history of the priority the chart goes under. */
  riskHistory?: { entityId: string; history: BriefRiskHistory };
  /** The alerts couldn't be read, so no priority has rules. */
  alertsFailed?: boolean;
  /** The anomalies couldn't be read, so no priority has them. */
  anomaliesFailed?: boolean;
  logger?: Logger;
}): BriefViewModel => {
  const { tiles, period, focusTileId, entityFilters = {} } = scope;
  const namesById = new Map(entities.candidates.map(({ id, name }) => [id, name]));
  // Model text is prose: an entity mention becomes the Entity Store's name, and a rule or job mention the
  // name of that rule or job of the entity the text is about. One that names none is removed. A bare
  // "rule 1" or "job 1" that matches one becomes its name too, and is otherwise left as written.
  const withNames = (text: string, entityFacts?: EntityFacts) =>
    text.replace(
      TOKEN_PATTERN,
      (
        token,
        entityId?: string,
        ruleIndex?: string,
        jobIndex?: string,
        bareKind?: string,
        bareIndex?: string
      ) => {
        if (entityId !== undefined) {
          return namesById.get(entityId) ?? entityId;
        }
        const isBare = bareKind !== undefined;
        const index = Number(ruleIndex ?? jobIndex ?? bareIndex);
        const named =
          ruleIndex !== undefined || bareKind?.toLowerCase() === 'rule'
            ? entityFacts?.alerts?.rules.find((rule) => rule.index === index)
            : entityFacts?.anomalies?.jobs.find((job) => job.index === index);
        if (isBare) {
          if (!named) {
            return token;
          }
          logger?.debug(`AI brief: replaced the bare "${token}" with the name it cites`);
          return named.name;
        }
        if (!named) {
          logger?.debug(`AI brief: removed ${token}, which names no rule or job of the entity`);
        }
        return named?.name ?? '';
      }
    );
  const sentence = (text: string, entityFacts: EntityFacts) => {
    const named = withNames(text, entityFacts);
    return /[.!?…]$/.test(named) ? named : `${named}.`;
  };

  return {
    version: 1,
    scope: {
      period,
      periodLabel: BRIEF_PERIOD_LABELS[period],
      capturedAt: scope.capturedAt,
      spaceId,
      focusTileTitle: focusTileId && tiles[focusTileId]?.title,
      entityFilters: Object.entries(entityFilters).map(([key, values]) =>
        describeEntityFilter(key, values)
      ),
      sample: describeSample(scope, entities),
    },
    notes: buildNotes(scope, entities, alertsFailed, anomaliesFailed),
    title: verified?.title,
    summary: verified ? verified.summary && withNames(verified.summary) : describeQuietView(scope),
    counts: SIGNAL_CARD_IDS.flatMap((tileId) => {
      const tile = tiles[tileId];
      return tile && !tile.unavailable
        ? [{ tileId, title: tile.title, value: tile.value, delta: tile.delta }]
        : [];
    }),
    priorities: (verified?.priorities ?? []).flatMap(
      ({ entityId, assessment, whyFirst, nextStep }, index) => {
        const entityFacts = facts.find((entity) => entity.entityId === entityId);
        if (!entityFacts) {
          return [];
        }
        const { name, type, flaggedFor, risk, watchlists = [], firstSeen } = entityFacts;
        const candidate = entities.candidates.find(({ id }) => id === entityId);
        return [
          {
            rank: index + 1,
            entityId,
            name,
            type,
            risk: risk && { score: risk.score, level: risk.level, of: risk.of },
            assetCriticality: candidate && getAssetCriticality(candidate),
            watchlists,
            // As the prompt does: first seen only for an entity flagged as new.
            firstSeen: flaggedFor.includes('newEntity') ? firstSeen : undefined,
            assessment: sentence(assessment, entityFacts),
            whyFirst: sentence(whyFirst, entityFacts),
            nextStep: sentence(nextStep, entityFacts),
            riskHistory: riskHistory?.entityId === entityId ? riskHistory.history : undefined,
          },
        ];
      }
    ),
    recommendation: verified?.recommendation && withNames(verified.recommendation),
  };
};

const buildNotes = (
  scope: EntityAnalyticsScope,
  entities: CandidateEntities,
  alertsFailed: boolean,
  anomaliesFailed: boolean
): string[] => {
  const unavailableTitles = SIGNAL_CARD_IDS.flatMap((tileId) => {
    const tile = scope.tiles[tileId];
    return tile?.unavailable ? [tile.title] : [];
  });
  return compact([
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
    alertsFailed ? "Alert details couldn't be read." : undefined,
    anomaliesFailed ? "Anomaly details couldn't be read." : undefined,
  ]);
};

/** Without a model call: a view is quiet only when nothing it could read is flagged. */
const describeQuietView = ({ tiles }: EntityAnalyticsScope): string => {
  const isFlagged = Object.values(tiles).some(
    ({ unavailable, value, entityIds }) => !unavailable && (value > 0 || entityIds.length > 0)
  );
  return isFlagged ? NO_PRIORITIES_LINE : QUIET_LINE;
};

/** The parts of the card's title: the period, the selected count, the filters and the space. */
export const getTitleParts = ({ scope }: BriefViewModel): string[] => [
  `Last ${scope.periodLabel}`,
  ...(scope.focusTileTitle ? [`Selected: ${scope.focusTileTitle}`] : []),
  ...scope.entityFilters,
  ...(scope.spaceId === DEFAULT_SPACE_ID ? [] : [`Space ${scope.spaceId}`]),
];

/** What wasn't found or checked, and that the brief covers a sample. */
export const getNotes = ({ notes, scope }: BriefViewModel): string[] =>
  scope.sample ? [...notes, scope.sample] : notes;

/** A zero that didn't change says nothing, so it gets no count. */
export const getShownCounts = ({ counts }: BriefViewModel): BriefViewModel['counts'] =>
  counts.filter(({ value, delta }) => value > 0 || (delta ?? 0) !== 0);

/** Without priorities a summary already says why, as in a brief with no model call, so only a brief without a summary needs the section. */
export const hasPrioritiesSection = ({ priorities, summary }: BriefViewModel): boolean =>
  priorities.length > 0 || !summary;
