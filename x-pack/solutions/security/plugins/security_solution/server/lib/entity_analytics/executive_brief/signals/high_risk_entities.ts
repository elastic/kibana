/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import { getEntityRisk } from '../../../../../common/entity_analytics/executive_brief/entity_risk';
import { entityDisplayName, watchlistsOf } from '../entity_record';
import { compareStrings, defineSignal, errorMessage } from './engine/define_signal';
import { ENTITY_SOURCE_FIELDS, resolveEntities } from './engine/resolve_entities';
import type { FactDraft } from './engine/types';

const MAX_HIGH_RISK_ENTITIES = 10;
const HIGH_RISK_FETCH_SIZE = 100;
const HIGH_RISK_LEVELS = ['Critical', 'High'];
const SCORE_SORT = { order: 'desc', unmapped_type: 'float', missing: '_last' } as const;

const scoreOf = (record: Entity): number => getEntityRisk(record)?.score ?? 0;

const toFact = (euid: string, record: Entity): FactDraft => {
  const risk = getEntityRisk(record);
  const level = risk?.level ?? 'High';
  const criticality = record.asset?.criticality;
  const { privileged, others } = watchlistsOf(record);
  return {
    title: `${entityDisplayName(record, euid)} is at ${level} risk`,
    severity: level === 'Critical' ? 'critical' : 'high',
    entities: [record],
    ...(risk ? { numbers: { riskScore: Math.round(risk.score) } } : {}),
    details: {
      riskLevel: level,
      ...(criticality ? { criticality } : {}),
      ...(others.length > 0 ? { watchlists: others.join(', ') } : {}),
      ...(privileged ? { privileged: 'yes' } : {}),
    },
    source: { type: 'entity', id: euid },
  };
};

/**
 * Golden entities at High or Critical risk (the resolution-group score when there is one), with
 * asset criticality and watchlists from the whole resolution group.
 */
export const highRiskEntitiesSignal = defineSignal({
  id: 'high_risk_entities',
  title: 'High-risk entities',
  run: async ({ esClient, spaceId, logger }, abortSignal) => {
    const response = await esClient.search<Entity>(
      {
        index: getEntitiesAlias(ENTITY_LATEST, spaceId),
        size: HIGH_RISK_FETCH_SIZE,
        _source: ENTITY_SOURCE_FIELDS,
        query: {
          bool: {
            must_not: [{ exists: { field: 'entity.relationships.resolution.resolved_to' } }],
            should: [
              { terms: { 'entity.risk.calculated_level': HIGH_RISK_LEVELS } },
              {
                terms: {
                  'entity.relationships.resolution.risk.calculated_level': HIGH_RISK_LEVELS,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        sort: [
          { 'entity.relationships.resolution.risk.calculated_score_norm': SCORE_SORT },
          { 'entity.risk.calculated_score_norm': SCORE_SORT },
          { 'entity.id': 'asc' },
        ],
      },
      { signal: abortSignal }
    );

    // The query sorts group-scored entities first; rank them all by the score that applies.
    const records = response.hits.hits
      .flatMap(({ _source: record }) =>
        record?.entity?.id && HIGH_RISK_LEVELS.includes(getEntityRisk(record)?.level ?? '')
          ? [record]
          : []
      )
      .sort(
        (a, b) => scoreOf(b) - scoreOf(a) || compareStrings(a.entity?.id ?? '', b.entity?.id ?? '')
      )
      .slice(0, MAX_HIGH_RISK_ENTITIES);

    // Criticality and watchlists often sit on the aliases; fall back to the golden doc alone.
    const resolved = await resolveEntities({
      esClient,
      spaceId,
      euids: records.map(({ entity }) => entity?.id ?? ''),
      abortSignal,
    }).catch((error: unknown) => {
      logger.debug(`[executive brief] high-risk alias lookup failed: ${errorMessage(error)}`);
      return new Map<string, Entity>();
    });

    return records.map((record) => {
      const euid = record.entity?.id ?? '';
      return toFact(euid, resolved.get(euid) ?? record);
    });
  },
});
