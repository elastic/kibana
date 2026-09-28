/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';

export interface SeedEntityOptions {
  readonly euid: string;
  readonly name?: string;
  readonly type: 'user' | 'host' | 'service';
  readonly firstSeen?: string;
  readonly lastSeen?: string;
  readonly managed?: boolean;
  readonly mfaEnabled?: boolean;
  readonly riskLevel?: string;
  readonly riskScoreNorm?: number;
  readonly assetCriticality?: string;
  readonly relationships?: Record<string, { ids: string[] }>;
  readonly watchlists?: string[];
}

const displayNameFromEuid = (euid: string): string => euid.split(':').slice(1).join(':') || euid;

export const buildEntityDoc = ({
  euid,
  name,
  type,
  firstSeen,
  lastSeen,
  managed,
  mfaEnabled,
  riskLevel,
  riskScoreNorm,
  assetCriticality,
  relationships,
  watchlists,
}: SeedEntityOptions): Record<string, unknown> => {
  const displayName = name ?? displayNameFromEuid(euid);
  const now = new Date().toISOString();
  const last = lastSeen ?? now;
  const first = firstSeen ?? last;

  const hasAttributes =
    managed !== undefined || mfaEnabled !== undefined || watchlists !== undefined;
  const hasRisk = riskLevel !== undefined || riskScoreNorm !== undefined;

  return {
    '@timestamp': last,
    entity: {
      id: euid,
      name: displayName,
      EngineMetadata: { Type: type },
      lifecycle: { first_seen: first, last_seen: last },
      ...(hasAttributes && {
        attributes: {
          ...(managed !== undefined && { managed }),
          ...(mfaEnabled !== undefined && { mfa_enabled: mfaEnabled }),
          ...(watchlists !== undefined && { watchlists }),
        },
      }),
      ...(hasRisk && {
        risk: {
          ...(riskLevel !== undefined && { calculated_level: riskLevel }),
          ...(riskScoreNorm !== undefined && { calculated_score_norm: riskScoreNorm }),
        },
      }),
      ...(relationships !== undefined && { relationships }),
    },
    [type]: { name: displayName },
    ...(assetCriticality !== undefined && { asset: { criticality: assetCriticality } }),
  };
};

export const bulkSeedEntities = async ({
  esClient,
  entities,
  namespace = 'default',
}: {
  esClient: Client;
  entities: readonly SeedEntityOptions[];
  namespace?: string;
}): Promise<void> => {
  if (entities.length === 0) return;

  const latestAlias = getEntitiesAlias(ENTITY_LATEST, namespace);
  const operations = entities.flatMap((options) => [
    { index: { _index: latestAlias, _id: hashEuid(options.euid), pipeline: '_none' } },
    buildEntityDoc(options),
  ]);

  await esClient.bulk({ refresh: 'wait_for', operations });
};

export const seedEntity = async ({
  esClient,
  namespace = 'default',
  ...entity
}: SeedEntityOptions & { esClient: Client; namespace?: string }): Promise<void> =>
  bulkSeedEntities({ esClient, entities: [entity], namespace });
