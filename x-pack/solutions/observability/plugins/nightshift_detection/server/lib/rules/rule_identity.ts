/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { MAX_NAME_LENGTH, type CreateRuleData } from '@kbn/alerting-v2-schemas';
import { stableStringify } from '@kbn/std';

/** Namespace of the engine's rule ids. Changing it gives every managed rule a new id. */
const RULE_ID_NAMESPACE = 'e04d28ab-9856-4cf7-bda8-1341f14f17b5';

/**
 * Every tag the engine writes starts with `nightshift:detection_engine:`. Never `nightshift:source:*`:
 * that prefix is `significant_events`', which deletes the rules it finds under it.
 */
const TAG_PREFIX = 'nightshift:detection_engine:';

/** On every rule the engine manages; the reconciler lists and deletes only these. */
export const MANAGED_RULE_TAG = `${TAG_PREFIX}managed`;

/** Prefix of the tag naming the strategy that owns a rule. */
const STRATEGY_TAG_PREFIX = `${TAG_PREFIX}strategy:`;
/** Prefix of the tag naming the source a rule watches. */
const SOURCE_TAG_PREFIX = `${TAG_PREFIX}source:`;

/** The tag of the rules a strategy owns. */
export const getStrategyTag = (strategyId: string): string => `${STRATEGY_TAG_PREFIX}${strategyId}`;

/** The strategy that owns a rule, read from its tags, or `undefined` when none is tagged. */
export const getOwningStrategy = (tags: string[]): string | undefined =>
  tags.find((tag) => tag.startsWith(STRATEGY_TAG_PREFIX))?.slice(STRATEGY_TAG_PREFIX.length);

/** The source a rule watches, read from its tags, or `undefined` when none is tagged. */
export const getWatchedSource = (tags: string[]): string | undefined =>
  tags.find((tag) => tag.startsWith(SOURCE_TAG_PREFIX))?.slice(SOURCE_TAG_PREFIX.length);

/**
 * The longest start of `text` within `maxLength` UTF-16 units, the unit Alerting counts a name in,
 * cut between characters so an emoji is never split into half a surrogate pair.
 */
const cutToLength = (text: string, maxLength: number): string => {
  let cut = '';
  for (const character of text) {
    if (cut.length + character.length > maxLength) {
      break;
    }
    cut += character;
  }
  return cut;
};

/**
 * The id of a managed rule. It hashes everything the rule runs with (the final query, project
 * routing included, its schedule, lookback and grouping) with its keys sorted, so the same rule
 * always gets the same id and any change to it gives a new rule:
 * the reconciler never edits a rule, it deletes the old one and creates the new one. Name and tags
 * are left out, since they don't change what the rule finds.
 */
export const computeRuleId = ({
  spaceId,
  strategy,
  sourceId,
  data,
}: {
  spaceId: string;
  strategy: string;
  sourceId: string;
  /** The rule as the strategy wants it; its metadata is left out of the hash. */
  data: Omit<CreateRuleData, 'metadata'> & { metadata?: unknown };
}): string => {
  const { metadata, ...rule } = data;
  return uuidv5(stableStringify([spaceId, strategy, sourceId, rule]), RULE_ID_NAMESPACE);
};

/** The tags the engine puts on a managed rule, after the strategy's own. */
export const getManagedRuleTags = ({
  strategy,
  sourceId,
}: {
  strategy: string;
  sourceId: string;
}): string[] => [MANAGED_RULE_TAG, getStrategyTag(strategy), `${SOURCE_TAG_PREFIX}${sourceId}`];

/**
 * The name of a managed rule: the strategy, the strategy's title for it, and a short id. A title can
 * be twice as long as Alerting accepts for a name, so it is cut to fit and the short id, which tells
 * apart rules with the same title, always stays at the end.
 */
export const getManagedRuleName = ({
  strategyName,
  title,
  ruleId,
}: {
  strategyName: string;
  title: string;
  ruleId: string;
}): string => {
  const prefix = `${strategyName}: `;
  const suffix = ` (${ruleId.slice(0, 8)})`;
  const room = Math.max(MAX_NAME_LENGTH - prefix.length - suffix.length, 0);
  return `${prefix}${cutToLength(title, room)}${suffix}`;
};
