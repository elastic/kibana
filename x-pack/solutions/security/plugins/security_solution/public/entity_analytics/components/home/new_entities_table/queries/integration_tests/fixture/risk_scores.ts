/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { getRiskScoreIndex } from '../../esql';
import { DATE, DAY_MS, FLOAT, HOUR_MS, KEYWORD, NAMESPACE, toIsoAgo } from './fixture_index';
import type { FixtureIndex } from './fixture_index';

/** Scores before the window: one hour before the 30 day window starts. */
const REFERENCE_SCORES: Readonly<Record<string, [score: number, level: string]>> = {
  'host:h1': [60, 'Moderate'],
  'host:h2': [50, 'Moderate'],
  'user:alice@okta': [80, 'High'],
};

const RISK_ENTITY_TYPES = ['host', 'user', 'service'] as const;

const toRiskDoc = (entityId: string, [score, level]: [number, string], now: number) => {
  const type = entityId.split(':')[0];
  return {
    '@timestamp': toIsoAgo(now, 30 * DAY_MS + HOUR_MS),
    [`${type}.risk.id_field`]: 'entity.id',
    [`${type}.risk.id_value`]: entityId,
    [`${type}.risk.calculated_score_norm`]: score,
    [`${type}.risk.calculated_level`]: level,
  };
};

export const riskScoresIndex: FixtureIndex = {
  index: getRiskScoreIndex(NAMESPACE),
  fields: {
    '@timestamp': DATE,
    ...Object.fromEntries(
      RISK_ENTITY_TYPES.flatMap(
        (type): Array<[string, MappingProperty]> => [
          [`${type}.risk.id_field`, KEYWORD],
          [`${type}.risk.id_value`, KEYWORD],
          [`${type}.risk.calculated_score_norm`, FLOAT],
          [`${type}.risk.calculated_level`, KEYWORD],
        ]
      )
    ),
  },
  buildDocs: (now) =>
    Object.entries(REFERENCE_SCORES).map(([entityId, score]) => toRiskDoc(entityId, score, now)),
};
