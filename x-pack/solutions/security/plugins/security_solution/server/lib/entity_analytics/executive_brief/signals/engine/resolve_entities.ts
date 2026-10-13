/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, keyBy, partition } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Entity } from '@kbn/entity-store/common';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import { minimalEntityRecord } from '../../entity_record';
import { compareStrings } from './define_signal';

/**
 * Entity Store v2 resolution: an alias points at its golden entity through `resolved_to`, and the
 * golden entity with its aliases forms a resolution group. The golden record carries the group's
 * risk; criticality and watchlists can sit on any member.
 */

const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
/** Group documents read in one search: the golden documents and their aliases. */
const MAX_GROUP_DOCS = 10_000;

const CRITICALITY_RANK: Readonly<Record<string, number>> = {
  low_impact: 1,
  medium_impact: 2,
  high_impact: 3,
  extreme_impact: 4,
};

/** The parts of an Entity Store record the brief reads. */
export const ENTITY_SOURCE_FIELDS = [
  '@timestamp',
  'entity.id',
  'entity.name',
  'entity.type',
  'entity.EngineMetadata.Type',
  'entity.attributes.watchlists',
  'entity.risk',
  RESOLVED_TO_FIELD,
  'entity.relationships.resolution.risk',
  'asset.criticality',
  'user.name',
  'host.name',
  'service.name',
];

/** The golden euid of a record that is an alias. */
const resolvedToOf = ({ entity }: Entity): string | undefined => {
  const resolvedTo = entity?.relationships?.resolution?.resolved_to;
  return resolvedTo && resolvedTo !== entity?.id ? resolvedTo : undefined;
};

/** The golden record with the group's highest criticality and the union of its watchlists. */
const groupRecord = (golden: Entity, aliases: readonly Entity[]): Entity => {
  const group = [golden, ...aliases];
  const watchlists = [
    ...new Set(group.flatMap(({ entity }) => entity?.attributes?.watchlists ?? [])),
  ].sort(compareStrings);
  const [criticality] = group
    .flatMap(({ asset }) => (asset?.criticality ? [asset.criticality] : []))
    .sort((a, b) => (CRITICALITY_RANK[b] ?? 0) - (CRITICALITY_RANK[a] ?? 0));
  return {
    ...golden,
    entity: {
      ...golden.entity,
      ...(watchlists.length > 0
        ? { attributes: { ...golden.entity?.attributes, watchlists } }
        : {}),
    },
    ...(criticality ? { asset: { ...golden.asset, criticality } } : {}),
  };
};

const searchEntities = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  query: estypes.QueryDslQueryContainer,
  size: number,
  abortSignal?: AbortSignal
): Promise<Entity[]> => {
  const response = await esClient.search<Entity>(
    {
      index: getEntitiesAlias(ENTITY_LATEST, spaceId),
      size,
      _source: ENTITY_SOURCE_FIELDS,
      query,
    },
    { signal: abortSignal }
  );
  return response.hits.hits.flatMap(({ _source }) => (_source?.entity?.id ? [_source] : []));
};

/**
 * Resolves euids (golden or alias) to their golden entity's group record, in two reads: the euids'
 * own documents for their golden euid, then each golden's group. Euids the store has no document
 * for are left out. Errors, including a missing index, propagate.
 */
export const resolveEntities = async ({
  esClient,
  spaceId,
  euids,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  euids: readonly string[];
  abortSignal?: AbortSignal;
}): Promise<Map<string, Entity>> => {
  const unique = [...new Set(euids)];
  if (unique.length === 0) {
    return new Map();
  }
  const own = await searchEntities(
    esClient,
    spaceId,
    { terms: { 'entity.id': unique } },
    unique.length,
    abortSignal
  );
  const goldenOf = new Map(
    own.map((record) => {
      const euid = record.entity?.id ?? '';
      return [euid, resolvedToOf(record) ?? euid];
    })
  );
  const goldens = [...new Set(goldenOf.values())];
  const group = await searchEntities(
    esClient,
    spaceId,
    {
      bool: {
        should: [{ terms: { 'entity.id': goldens } }, { terms: { [RESOLVED_TO_FIELD]: goldens } }],
        minimum_should_match: 1,
      },
    },
    MAX_GROUP_DOCS,
    abortSignal
  );

  const [aliases, goldenDocs] = partition(group, resolvedToOf);
  const aliasesOf = groupBy(aliases, resolvedToOf);
  const goldenById = keyBy(goldenDocs, ({ entity }) => entity?.id ?? '');
  const records = Object.fromEntries(
    goldens.map((golden) => [
      golden,
      groupRecord(
        goldenById[golden] ?? minimalEntityRecord({ id: golden }),
        aliasesOf[golden] ?? []
      ),
    ])
  );
  return new Map([...goldenOf].map(([euid, golden]) => [euid, records[golden]]));
};
