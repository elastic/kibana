/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import type { Entity } from '@kbn/entity-store/common';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import type { Fact } from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { EntityRiskLevels } from '../../../../../common/api/entity_analytics/common';
import { EntityRiskLevelsEnum } from '../../../../../common/api/entity_analytics/common';
import { getEntityRisk } from '../../../../../common/entity_analytics/executive_brief/entity_risk';
import { ENTITY_STORE_RESOLVED_TO_FIELD } from '../../../../agent_builder/tools/entity_analytics/entity_resolution';
import { getErrorMessage } from '../../../../utils/error_helpers';
import { entityDisplayName, watchlistsOf } from './engine/entity_record';
import { resolveEntities } from './engine/resolve_entities';
import type { Signal } from './engine/types';

const SIGNAL_ID = 'high_risk_entities';
const MAX_HIGH_RISK_ENTITIES = 10;
const HIGH_RISK_FETCH_SIZE = 100;
const HIGH_RISK_LEVELS: EntityRiskLevels[] = [
  EntityRiskLevelsEnum.Critical,
  EntityRiskLevelsEnum.High,
];
const SCORE_SORT = { order: 'desc', unmapped_type: 'float', missing: '_last' } as const;
/** The parts of an Entity Store record the brief reads when resolution is unavailable. */
const SOURCE_FIELDS = [
  '@timestamp',
  'entity.id',
  'entity.name',
  'entity.type',
  'entity.EngineMetadata.Type',
  'entity.attributes.watchlists',
  'entity.risk',
  'entity.relationships.resolution.risk',
  'asset.criticality',
  'user.name',
  'host.name',
  'service.name',
];

const euidOf = ({ entity }: Entity): string => entity?.id ?? '';
const scoreOf = (record: Entity): number => getEntityRisk(record)?.score ?? 0;
const isHighRisk = (record: Entity): boolean => {
  const level = getEntityRisk(record)?.level;
  return euidOf(record) !== '' && level !== undefined && HIGH_RISK_LEVELS.includes(level);
};

const toFact = (record: Entity): Omit<Fact, 'id'> => {
  const euid = euidOf(record);
  const risk = getEntityRisk(record);
  const level = risk?.level ?? EntityRiskLevelsEnum.High;
  const criticality = record.asset?.criticality;
  const { privileged, others } = watchlistsOf(record);
  const details: Record<string, string> = { riskLevel: level };
  if (criticality) {
    details.criticality = criticality;
  }
  if (others.length > 0) {
    details.watchlists = others.join(', ');
  }
  if (privileged) {
    details.privileged = 'yes';
  }
  return {
    signalId: SIGNAL_ID,
    title: `${entityDisplayName(record, euid)} is at ${level} risk`,
    severity: level === EntityRiskLevelsEnum.Critical ? 'critical' : 'high',
    entityIds: [euid],
    numbers: risk ? { riskScore: Math.round(risk.score) } : undefined,
    details,
    source: { type: 'entity', id: euid },
  };
};

/**
 * Golden entities at High or Critical risk (the resolution-group score when there is one), with
 * asset criticality and watchlists from the whole resolution group.
 */
export const highRiskEntitiesSignal: Signal = {
  id: SIGNAL_ID,
  title: 'High-risk entities',
  run: async ({ esClient, resolutionClient, spaceId, abortSignal, logger }) => {
    const response = await esClient.search<Entity>(
      {
        index: getEntitiesAlias(ENTITY_LATEST, spaceId),
        size: HIGH_RISK_FETCH_SIZE,
        _source: SOURCE_FIELDS,
        query: {
          bool: {
            must_not: [{ exists: { field: ENTITY_STORE_RESOLVED_TO_FIELD } }],
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
    const ranked = orderBy(
      response.hits.hits.flatMap(({ _source: record }) =>
        record && isHighRisk(record) ? [record] : []
      ),
      [scoreOf, euidOf],
      ['desc', 'asc']
    ).slice(0, MAX_HIGH_RISK_ENTITIES);

    // Criticality and watchlists often sit on the aliases; fall back to the ranked record alone.
    const resolved = await resolveEntities({
      resolutionClient,
      euids: ranked.map(euidOf),
      abortSignal,
    }).catch((error: unknown) => {
      logger.debug(`[executive brief] high-risk alias lookup failed: ${getErrorMessage(error)}`);
      return new Map<string, Entity>();
    });

    const entities = ranked.map((record) => resolved.get(euidOf(record)) ?? record);
    return { facts: entities.map(toFact), entities };
  },
};
