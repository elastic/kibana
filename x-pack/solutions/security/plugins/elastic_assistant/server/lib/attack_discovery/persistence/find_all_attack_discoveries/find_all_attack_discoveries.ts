/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { AttackDiscoveryResponse } from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { EsAttackDiscoverySchema } from '../types';
import { transformESSearchToAttackDiscovery } from '../transforms/transforms';
const MAX_ITEMS = 10000;
export interface FindAllAttackDiscoveriesParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  attackDiscoveryIndex: string;
  user: AuthenticatedUser;
}

export const findAllAttackDiscoveries = async ({
  esClient,
  logger,
  attackDiscoveryIndex,
  user,
}: FindAllAttackDiscoveriesParams): Promise<AttackDiscoveryResponse[]> => {
  const filterByUser = [
    {
      nested: {
        path: 'users',
        query: {
          bool: {
            must: [
              {
                match: user.profile_uid
                  ? { 'users.id': user.profile_uid }
                  : { 'users.name': user.username },
              },
            ],
          },
        },
      },
    },
  ];
  try {
    const response = await esClient.search<EsAttackDiscoverySchema>({
      query: {
        bool: {
          must: [...filterByUser],
        },
      },
      size: MAX_ITEMS,
      _source: true,
      ignore_unavailable: true,
      index: attackDiscoveryIndex,
      seq_no_primary_term: true,
    });
    const attackDiscoveries = transformESSearchToAttackDiscovery(response);
    return attackDiscoveries ?? [];
  } catch (err) {
    logger.error(`Error fetching attack discoveries: ${err}`);
    throw err;
  }
};
