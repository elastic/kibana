/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AttackDiscoveries, Replacements } from '@kbn/elastic-assistant-common';
import { deduplicateAttackDiscoveries as deduplicateAttackDiscoveriesShared } from '@kbn/attack-discovery-schedules-common';

interface DeduplicateAttackDiscoveriesParams {
  attackDiscoveries: AttackDiscoveries;
  connectorId: string;
  esClient: ElasticsearchClient;
  indexPattern: string;
  logger: Logger;
  ownerInfo: {
    id: string;
    isSchedule: boolean;
  };
  replacements: Replacements | undefined;
  spaceId: string;
}

const computeSha256Hash = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

export const deduplicateAttackDiscoveries = async (
  params: DeduplicateAttackDiscoveriesParams
): Promise<AttackDiscoveries> =>
  deduplicateAttackDiscoveriesShared({ ...params, computeSha256Hash });
