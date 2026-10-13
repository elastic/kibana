/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import { getEntityRisk } from '../../../../../common/entity_analytics/executive_brief/entity_risk';
import type { Severity } from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import { toEntityRef, watchlistsOf } from '../entity_record';
import { ALWAYS_AVAILABLE, compareStrings, defineSignal, errorMessage } from './define_signal';
import { ENTITY_SOURCE_FIELDS, expandResolutionGroups, parseEntityDoc } from './resolve_entities';
import type { EntityDoc } from './resolve_entities';
import { getEntitiesLatestIndex } from './shared/indices';
import type { EntityRef, FactDraft } from './types';

export const MAX_HIGH_RISK_ENTITIES = 10;
const HIGH_RISK_FETCH_SIZE = 100;
const HIGH_RISK_LEVELS = ['Critical', 'High'] as const;

const severityOf = (level: string | undefined): Severity =>
  level === 'Critical' ? 'critical' : 'high';

const scoreOf = ({ record }: EntityDoc): number => getEntityRisk(record)?.score ?? 0;

const isHighRisk = ({ record }: EntityDoc): boolean =>
  HIGH_RISK_LEVELS.some((level) => level === getEntityRisk(record)?.level);

const toFact = (ref: EntityRef, record: Entity): FactDraft => {
  const risk = getEntityRisk(record);
  const level = risk?.level ?? 'High';
  const criticality = record.asset?.criticality;
  const { privileged, others } = watchlistsOf(record);
  return {
    title: `${ref.name} is at ${level} risk`,
    severity: severityOf(level),
    entities: [ref],
    ...(risk ? { numbers: { riskScore: Math.round(risk.score) } } : {}),
    details: {
      riskLevel: level,
      ...(criticality ? { criticality } : {}),
      ...(others.length > 0 ? { watchlists: others.join(', ') } : {}),
      ...(privileged ? { privileged: 'yes' } : {}),
    },
    source: { type: 'entity', id: ref.euid },
  };
};

/**
 * Golden entities at High or Critical risk (the resolution-group score when there is one), with
 * asset criticality and watchlists from the whole resolution group.
 */
export const highRiskEntitiesSignal = defineSignal({
  id: 'high_risk_entities',
  title: 'High-risk entities',
  scope: 'tenant',
  isAvailable: async () => ALWAYS_AVAILABLE,
  run: async (ctx, _input, abortSignal) => {
    const response = await ctx.esClient.search<Entity>(
      {
        index: getEntitiesLatestIndex(ctx.spaceId),
        size: HIGH_RISK_FETCH_SIZE,
        _source: [...ENTITY_SOURCE_FIELDS],
        query: {
          bool: {
            must_not: [{ exists: { field: 'entity.relationships.resolution.resolved_to' } }],
            should: [
              { terms: { 'entity.risk.calculated_level': [...HIGH_RISK_LEVELS] } },
              {
                terms: {
                  'entity.relationships.resolution.risk.calculated_level': [...HIGH_RISK_LEVELS],
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        sort: [
          {
            'entity.relationships.resolution.risk.calculated_score_norm': {
              order: 'desc',
              unmapped_type: 'float',
              missing: '_last',
            },
          },
          {
            'entity.risk.calculated_score_norm': {
              order: 'desc',
              unmapped_type: 'float',
              missing: '_last',
            },
          },
          { 'entity.id': 'asc' },
        ],
      },
      { signal: abortSignal }
    );

    const docs = response.hits.hits
      .flatMap((hit) => {
        const doc = parseEntityDoc(hit._source);
        return doc && !doc.resolvedTo && isHighRisk(doc) ? [doc] : [];
      })
      .sort((a, b) => scoreOf(b) - scoreOf(a) || compareStrings(a.euid, b.euid))
      .slice(0, MAX_HIGH_RISK_ENTITIES);

    const refs = docs.map(({ euid, record }) => toEntityRef(record, euid));
    // Criticality and watchlists often sit on the aliases; fall back to the golden doc alone.
    const resolution = await expandResolutionGroups({
      esClient: ctx.esClient,
      spaceId: ctx.spaceId,
      entities: refs,
      abortSignal,
    }).catch((error: unknown) => {
      ctx.logger.debug(`[executive brief] high-risk alias lookup failed: ${errorMessage(error)}`);
      return undefined;
    });

    const entityRecords = docs.map((doc) => resolution?.get(doc.euid) ?? doc.record);
    return {
      facts: refs.map((ref, index) => toFact(ref, entityRecords[index])),
      candidates: refs,
      entityRecords,
    };
  },
});
