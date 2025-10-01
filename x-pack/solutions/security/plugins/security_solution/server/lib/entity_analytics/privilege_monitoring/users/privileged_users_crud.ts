/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type {
  UpdatePrivMonUserRequestBody,
  MonitoredUserDoc,
  CreatePrivMonUserRequestBody,
  CreatePrivMonUserResponse,
} from '../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../engine/data_client';
import type { PrivMonUserSource } from '../types';

export const createPrivilegedUsersCrudService = ({
  deps,
  index,
}: PrivilegeMonitoringDataClient) => {
  const esClient = deps.clusterClient.asCurrentUser;

  const create = async (
    user: CreatePrivMonUserRequestBody,
    source: PrivMonUserSource,
    maxUsersAllowed: number
  ): Promise<CreatePrivMonUserResponse> => {
    deps.logger.info(`Maximum supported number of privileged users allowed: ${maxUsersAllowed}`);
    // Check if user already exists by username
    const username = user.user?.name;
    if (username) {
      const existingUserResponse = await esClient.search({
        index,
        query: { term: { 'user.name': username } },
        size: 1,
      });

      if (existingUserResponse.hits.hits.length > 0) {
        const existingUser = existingUserResponse.hits.hits[0];
        const existingUserId = existingUser._id;

        if (existingUserId) {
          const existingUserDoc = existingUser._source as MonitoredUserDoc;
          const existingSources = existingUserDoc?.labels?.sources || [];
          const updatedSources = existingSources.includes(source)
            ? existingSources
            : [...existingSources, source];

          await esClient.update({
            index,
            id: existingUserId,
            refresh: 'wait_for',
            doc: {
              ...user,
              user: {
                ...user.user,
                is_privileged: true,
                entity: { attributes: { Privileged: true } },
              },
              labels: { sources: updatedSources },
            },
          });

          const updatedUser = await get(existingUserId);
          if (!updatedUser) {
            throw new Error(`Failed to retrieve updated user: ${existingUserId}`);
          }
          return updatedUser;
        }
      }
    }

    // Check user count limit before creating new user
    const currentUserCount = await esClient.count({
      index,
      query: {
        term: {
          'user.is_privileged': true,
        },
      },
    });

    if (currentUserCount.count >= maxUsersAllowed) {
      throw new Error(`Cannot create user: Maximum user limit of ${maxUsersAllowed} reached`);
    }

    // Create new user
    const doc = merge(user, {
      '@timestamp': new Date().toISOString(),
      user: {
        is_privileged: true,
        entity: { attributes: { Privileged: true } },
      },
      labels: {
        sources: [source],
      },
    });

    const res = await esClient.index({
      index,
      refresh: 'wait_for',
      document: doc,
    });

    const newUser = await get(res._id);
    if (!newUser) {
      throw new Error(`Failed to create user: ${res._id}`);
    }
    return newUser;
  };

  const get = async (id: string): Promise<MonitoredUserDoc | undefined> => {
    const response = await esClient.get<MonitoredUserDoc>({ index, id });
    return response.found
      ? ({ ...response._source, id: response._id } as MonitoredUserDoc)
      : undefined;
  };

  const update = async (
    id: string,
    user: UpdatePrivMonUserRequestBody
  ): Promise<MonitoredUserDoc | undefined> => {
    await esClient.update<MonitoredUserDoc>({
      index,
      refresh: 'wait_for',
      id,
      doc: user,
    });
    return get(id);
  };

  const list = async (kuery?: string): Promise<MonitoredUserDoc[]> => {
    const query = kuery ? toElasticsearchQuery(fromKueryExpression(kuery)) : { match_all: {} };
    const response = await esClient.search({
      size: 10000,
      index,
      query,
    });
    return response.hits.hits.map((hit) => ({
      id: hit._id,
      ...(hit._source as {}),
    })) satisfies MonitoredUserDoc[];
  };

  const _delete = async (id: string): Promise<void> => {
    await esClient.delete({ index, id });
  };

  return { create, get, update, list, delete: _delete };
};
