/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { Logger } from '@kbn/core/server';
import { getAssetCriticality } from '../../../../lib/entity_analytics/lead_generation/observation_modules/utils';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { SIGNAL_CARD_IDS } from '../../../../../common/entity_analytics/home/constants';
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
import type { BriefViewModel } from '../../../../../common/entity_analytics/ai_brief/result';
export { BriefViewModel } from '../../../../../common/entity_analytics/ai_brief/result';

export const QUIET_LINE = 'Nothing in this view is flagged as needing attention.';
/** The titles when the model wrote none: nothing flagged, or nothing with enough evidence to prioritize. */
export const QUIET_TITLE = 'All clear: nothing needs immediate attention';
export const NO_PRIORITIES_TITLE = 'Nothing to prioritize right now';
export const NO_PRIORITIES_LINE = 'No entity in this view has enough evidence to prioritize.';

export type BriefRiskHistory = NonNullable<BriefViewModel['priorities'][number]['riskHistory']>;

/** The captured data stored in the result attachment and presented by its React renderer. */
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
    notChecked: buildNotChecked(scope, entities, alertsFailed, anomaliesFailed),
    title: verified?.title,
    summary: verified ? verified.summary && withNames(verified.summary) : describeQuietView(scope),
    counts: SIGNAL_CARD_IDS.flatMap((tileId) => {
      const tile = tiles[tileId];
      return tile && !tile.unavailable
        ? [
            {
              tileId,
              title: tile.title,
              description: tile.description,
              value: tile.value,
              delta: tile.delta,
            },
          ]
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

const buildNotChecked = (
  scope: EntityAnalyticsScope,
  entities: CandidateEntities,
  alertsFailed: boolean,
  anomaliesFailed: boolean
): BriefViewModel['notChecked'] => {
  const unavailableTitles = SIGNAL_CARD_IDS.flatMap((tileId) => {
    const tile = scope.tiles[tileId];
    return tile?.unavailable ? [tile.title] : [];
  });
  return {
    unreadable: [
      ...unavailableTitles,
      ...(alertsFailed ? ['alert details'] : []),
      ...(anomaliesFailed ? ['anomaly details'] : []),
    ],
    notFound:
      entities.notFoundCount > 0
        ? `${formatCountOf(
            entities.notFoundCount,
            'flagged entity',
            'flagged entities'
          )} not found in the Entity Store`
        : undefined,
  };
};

/** Without a model call: a view is quiet only when nothing it could read is flagged. */
const describeQuietView = ({ tiles }: EntityAnalyticsScope): string => {
  const isFlagged = Object.values(tiles).some(
    ({ unavailable, value, entityIds }) => !unavailable && (value > 0 || entityIds.length > 0)
  );
  return isFlagged ? NO_PRIORITIES_LINE : QUIET_LINE;
};

/** The model's title, or a fixed one for a brief without priorities. "All clear" needs everything to have been read. */
export const getTitle = ({ title, summary, notChecked }: BriefViewModel): string =>
  title ??
  (summary === QUIET_LINE && notChecked.unreadable.length === 0
    ? QUIET_TITLE
    : NO_PRIORITIES_TITLE);

/** A key and its value, as the details under a title and under a priority print them. */
export interface Fact {
  key: string;
  value: string;
}

/** The details under the title, one fact each. Coverage and Not included appear only when they apply. */
export const getHeaderFacts = ({ scope, notChecked }: BriefViewModel): Fact[] => {
  const { unreadable, notFound } = notChecked;
  const coverage = [scope.sample, notFound].filter(Boolean).join('; ');
  return [
    { key: 'Captured', value: moment.utc(scope.capturedAt).format('D MMM YYYY, HH:mm [UTC]') },
    { key: 'Time range', value: `Last ${scope.periodLabel}` },
    ...scope.entityFilters.map(({ label, value }) => ({ key: label, value })),
    ...(scope.focusTileTitle ? [{ key: 'Attention tile', value: scope.focusTileTitle }] : []),
    ...(scope.spaceId === DEFAULT_SPACE_ID ? [] : [{ key: 'Space', value: scope.spaceId }]),
    ...(coverage ? [{ key: 'Coverage', value: coverage }] : []),
    ...(unreadable.length > 0
      ? [{ key: 'Not included', value: `${unreadable.join(', ')} (data couldn't be loaded)` }]
      : []),
  ];
};

/** The line under a priority's badges: when it was first seen and its watchlists, each only when known. */
export const getPriorityFacts = ({
  firstSeen,
  watchlists,
}: BriefViewModel['priorities'][number]): Fact[] => [
  ...(firstSeen ? [{ key: 'First seen', value: firstSeen }] : []),
  ...(watchlists.length > 0 ? [{ key: 'Watchlist', value: watchlists.join(', ') }] : []),
];

/** A fact as plain text. */
export const factText = ({ key, value }: Fact): string => `${key}: ${value}`;

/** A zero that didn't change says nothing, so it gets no count. */
export const getShownCounts = ({ counts }: BriefViewModel): BriefViewModel['counts'] =>
  counts.filter(({ value, delta }) => value > 0 || (delta ?? 0) !== 0);

/** Without priorities a summary already says why, as in a brief with no model call, so only a brief without a summary needs the section. */
export const hasPrioritiesSection = ({ priorities, summary }: BriefViewModel): boolean =>
  priorities.length > 0 || !summary;
