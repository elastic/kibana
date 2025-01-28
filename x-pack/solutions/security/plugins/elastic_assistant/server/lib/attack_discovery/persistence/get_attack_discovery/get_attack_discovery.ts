/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import { AttackDiscoveryResponse } from '@kbn/elastic-assistant-common';
import { EsAttackDiscoverySchema } from '../types';
import { transformESSearchToAttackDiscovery } from '../transforms/transforms';

export interface GetAttackDiscoveryParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  attackDiscoveryIndex: string;
  id: string;
  user: AuthenticatedUser;
}

export const getAttackDiscovery = async ({
  esClient,
  logger,
  attackDiscoveryIndex,
  id,
  user,
}: GetAttackDiscoveryParams): Promise<AttackDiscoveryResponse | null> => {
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
          must: [
            {
              bool: {
                should: [
                  {
                    term: {
                      _id: id,
                    },
                  },
                ],
              },
            },
            ...filterByUser,
          ],
        },
      },
      _source: true,
      ignore_unavailable: true,
      index: attackDiscoveryIndex,
      seq_no_primary_term: true,
    });
    const attackDiscovery = transformESSearchToAttackDiscovery(response);
    return attackDiscovery[0] ?? null;
  } catch (err) {
    logger.error(`Error fetching attack discovery: ${err} with id: ${id}`);
    throw err;
  }
};
