/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_FIELDS } from '../../../common';
import { getEntityAlias } from '../../esql';
import {
  DATE,
  DAY_MS,
  FLOAT,
  HOUR_MS,
  KEYWORD,
  NAMESPACE,
  keywordsOf,
  toIsoAgo,
} from './fixture_index';
import type { FixtureIndex } from './fixture_index';

export const ENTITY_INDEX = 'entities-latest-test-concrete';

interface EntitySeed {
  id: string;
  type: 'host' | 'user' | 'service';
  name: string;
  risk?: [score: number, level: string];
  /** The risk engine's score of the group, which only the main entity of a group holds. */
  groupRisk?: [score: number, level: string];
  criticality?: string;
  watchlists?: string[];
  sources?: string[];
  /** Days before now that the entity was first seen; 20 by default. */
  firstSeenDaysAgo?: number;
  /** Hours before now that the entity was last seen; 1 by default. */
  lastSeenHoursAgo?: number;
  resolvedTo?: string;
}

const ENTITIES: readonly EntitySeed[] = [
  {
    id: 'host:h1',
    type: 'host',
    name: 'web-1',
    risk: [90, 'Critical'],
    groupRisk: [95, 'Critical'],
    criticality: 'high_impact',
    sources: ['okta'],
  },
  {
    id: 'host:h2',
    type: 'host',
    name: 'web-2',
    risk: [50, 'Moderate'],
    criticality: 'medium_impact',
    watchlists: ['wl-1'],
  },
  { id: 'host:h3', type: 'host', name: 'web-3' },
  // The aliases of host:h1 differ from it in every column that its group shows.
  {
    id: 'host:h4',
    type: 'host',
    name: 'web-4',
    resolvedTo: 'host:h1',
    criticality: 'extreme_impact',
    sources: ['aws'],
    watchlists: ['wl-2'],
    firstSeenDaysAgo: 40,
    lastSeenHoursAgo: 0.5,
  },
  {
    id: 'host:h5',
    type: 'host',
    name: 'web-5',
    resolvedTo: 'host:h1',
    criticality: 'low_impact',
    sources: ['okta', 'gcp'],
    watchlists: ['wl-3'],
  },
  { id: 'service:payments', type: 'service', name: 'payments', risk: [20, 'Low'] },
  {
    id: 'user:alice@okta',
    type: 'user',
    name: 'alice',
    risk: [70, 'High'],
    criticality: 'low_impact',
  },
  { id: 'user:bob@okta', type: 'user', name: 'bob', groupRisk: [85, 'High'] },
  { id: 'user:carol@okta', type: 'user', name: 'carol', resolvedTo: 'user:bob@okta' },
];

/** The identity fields a real entity doc carries, which the alert fill rebuilds EUIDs from. */
const toIdentityFields = ({ id, type, name }: EntitySeed): Record<string, string> => {
  if (type === 'host') return { 'host.id': id.slice('host:'.length), 'host.name': name };
  if (type === 'user') return { 'user.name': name, 'entity.namespace': 'okta' };
  return { 'service.name': name };
};

const toEntityDoc = (seed: EntitySeed, now: number) => ({
  ...toIdentityFields(seed),
  '@timestamp': toIsoAgo(now, (seed.lastSeenHoursAgo ?? 1) * HOUR_MS),
  'entity.id': seed.id,
  'entity.name': seed.name,
  'entity.EngineMetadata.Type': seed.type,
  'entity.lifecycle.first_seen': toIsoAgo(now, (seed.firstSeenDaysAgo ?? 20) * DAY_MS),
  ...(seed.sources ? { 'entity.source': seed.sources } : {}),
  ...(seed.risk
    ? {
        'entity.risk.calculated_score_norm': seed.risk[0],
        'entity.risk.calculated_level': seed.risk[1],
      }
    : {}),
  ...(seed.groupRisk
    ? {
        'entity.relationships.resolution.risk.calculated_score_norm': seed.groupRisk[0],
        'entity.relationships.resolution.risk.calculated_level': seed.groupRisk[1],
      }
    : {}),
  ...(seed.criticality ? { 'asset.criticality': seed.criticality } : {}),
  ...(seed.watchlists ? { 'entity.attributes.watchlists': seed.watchlists } : {}),
  ...(seed.resolvedTo ? { 'entity.relationships.resolution.resolved_to': seed.resolvedTo } : {}),
});

/** The entity store's latest index: in lookup mode for LOOKUP JOIN, behind its alias. */
export const entitiesIndex: FixtureIndex = {
  index: ENTITY_INDEX,
  settings: { index: { mode: 'lookup' } },
  aliases: [getEntityAlias(NAMESPACE)],
  fields: {
    ...keywordsOf(ENTITY_FIELDS),
    '@timestamp': DATE,
    'entity.lifecycle.first_seen': DATE,
    'entity.risk.calculated_score_norm': FLOAT,
    'entity.risk.calculated_level': KEYWORD,
    'entity.relationships.resolution.risk.calculated_score_norm': FLOAT,
    'entity.relationships.resolution.risk.calculated_level': KEYWORD,
  },
  buildDocs: (now) => ENTITIES.map((seed) => toEntityDoc(seed, now)),
};
