/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { ALWAYS_AVAILABLE, compareStrings, defineSignal, errorMessage } from './define_signal';
import {
  ENTITY_SOURCE_FIELDS,
  expandResolutionGroups,
  groupAttributes,
  parseEntityDoc,
} from './resolve_entities';
import type { EntityDoc } from './resolve_entities';
import { getEntitiesLatestIndex } from './shared/indices';
import type { EntityAttributes, EntityRef, FactDraft } from './types';

export const MAX_HIGH_RISK_ENTITIES = 10;
const HIGH_RISK_FETCH_SIZE = 100;
const HIGH_RISK_LEVELS = ['Critical', 'High'] as const;

const severityOf = (level: string | undefined): Severity =>
  level === 'Critical' ? 'critical' : 'high';

const isHighRisk = (doc: EntityDoc): boolean =>
  HIGH_RISK_LEVELS.some((level) => level === doc.riskLevel);

const toFact = (ref: EntityRef, attributes: EntityAttributes): FactDraft => {
  const level = attributes.riskLevel ?? 'High';
  return {
    kind: 'high_risk_entity',
    title: `${ref.name} is at ${level} risk`,
    severity: severityOf(level),
    entities: [ref],
    ...(attributes.riskScore !== undefined ? { numbers: { riskScore: attributes.riskScore } } : {}),
    details: {
      riskLevel: level,
      ...(attributes.criticality ? { criticality: attributes.criticality } : {}),
      ...(attributes.watchlists?.length ? { watchlists: attributes.watchlists.join(', ') } : {}),
      ...(attributes.privileged ? { privileged: 'yes' } : {}),
    },
  };
};

/**
 * Golden entities at High or Critical risk (the resolution-group score when there is one), with
 * asset criticality and watchlists from the whole resolution group.
 */
export const highRiskEntitiesSignal = defineSignal({
  id: 'high_risk_entities',
  title: 'High-risk entities',
  capability: 'risk_scoring',
  scope: 'tenant',
  isAvailable: async () => ALWAYS_AVAILABLE,
  run: async (ctx, _input, abortSignal) => {
    const response = await ctx.esClient.search<unknown>(
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
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0) || compareStrings(a.euid, b.euid))
      .slice(0, MAX_HIGH_RISK_ENTITIES);

    const refs: EntityRef[] = docs.map(({ euid, type, name }) => ({ euid, type, name }));
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

    const entityAttributes = docs.map(
      (doc) => resolution?.get(doc.euid)?.attributes ?? groupAttributes(doc.euid, doc, [])
    );
    return {
      facts: refs.map((ref, index) => toFact(ref, entityAttributes[index])),
      candidates: refs,
      entityAttributes,
    };
  },
});
