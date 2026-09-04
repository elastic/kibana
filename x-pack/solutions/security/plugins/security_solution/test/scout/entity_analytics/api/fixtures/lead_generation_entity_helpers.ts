/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import { LATEST_ALIAS } from './maintainers/constants';

/**
 * Seeds a user entity with a Critical risk score — enough on its own to
 * produce a `high_risk_score` observation and qualify as a lead-generation
 * candidate (see `risk_score_module.ts`'s `HIGH_RISK_THRESHOLD`).
 */
export const seedRiskyUserEntity = async (
  esClient: Client,
  { euid, riskScoreNorm = 95 }: { euid: string; riskScoreNorm?: number }
): Promise<void> => {
  const now = new Date().toISOString();

  await esClient.index({
    index: LATEST_ALIAS,
    id: hashEuid(euid),
    refresh: 'wait_for',
    pipeline: '_none',
    body: {
      '@timestamp': now,
      entity: {
        id: euid,
        name: euid,
        EngineMetadata: { Type: 'user' },
        lifecycle: { first_seen: now, last_seen: now },
        risk: { calculated_level: 'Critical', calculated_score_norm: riskScoreNorm },
      },
      user: { name: euid },
    },
  });
};

export const cleanupEntity = async (esClient: Client, euid: string): Promise<void> => {
  await esClient
    .delete({ index: LATEST_ALIAS, id: hashEuid(euid), refresh: 'wait_for' })
    .catch(() => {
      // Entity may not exist — ignore
    });
};
